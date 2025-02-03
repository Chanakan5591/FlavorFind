/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Copyright 2025 Chanakan Moongthin.
 */
import type { Route } from "./+types/plan";
import {
  Link,
  useNavigate,
  useParams,
  type LoaderFunctionArgs,
} from "react-router";
import pako from "pako";
import prisma from "~/db.server";
import { findMatchingStores } from "~/util/datentime.server";
import type { stores, StoresMenu } from "@prisma/ffdb";
import {
  Box,
  Flex,
  Grid,
  HStack,
  Progress,
  Text,
  VStack,
} from "@chakra-ui/react";
import Confetti from "react-confetti-boom";
import { Button } from "~/components/ui/button";
import { createId } from "@paralleldrive/cuid2";

const mappings = {
  mD: "mealsDate",
  mT: "mealsTime",
  wB: "withBeverage",
  mPA: "mealsPlanningAmount",
  sC: "selectedCanteens",
  pR: "priceRange",
  tPB: "totalPlannedBudgets",
  wA: "withAircon",
  nA: "noAircon",
  n: "noodles",
  s_: "somtum_northeastern",
  c_: "chicken_rice",
  r_: "rice_curry",
  s: "steak",
  j: "japanese",
  b: "beverage",
  o: "others",
};

const weekdays = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

/**
 * Xoshiro128** PRNG - A better quality PRNG than mulberry32
 */
function xoshiro128ss(a: number) {
  let state = new Uint32Array([
    a,
    a ^ 0x9e3779b9,
    a ^ 0x85ebca6b,
    a ^ 0xc2b2ae35,
  ]);

  return function() {
    let [s0, s1, s2, s3] = state;
    let result = (s1 * 5) << 7;
    result = (result ^ (result >>> 11)) >>> 0;

    const t = s1 << 9;
    s2 ^= s0;
    s3 ^= s1;
    s1 ^= s2;
    s0 ^= s3;
    s2 ^= t;
    s3 = (s3 << 11) | (s3 >>> 21); // Rotate left

    state = [s0, s1, s2, s3];
    return result / 4294967296;
  };
}

/**
 * Hashes a string into a deterministic seed.
 */
function stringToHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(hash ^ str.charCodeAt(i), 0x5bd1e995);
    hash ^= hash >>> 15;
  }
  return hash >>> 0; // Convert to unsigned 32-bit
}

/**
 * Shuffles an array deterministically using Fisher-Yates.
 */
function shuffle<T>(array: T[], seed: number): T[] {
  const rng = xoshiro128ss(seed);
  let m = array.length,
    t,
    i;
  while (m) {
    i = Math.floor(rng() * m--);
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }
  return array;
}

/**
 * Picks a random element deterministically with more variation.
 */
function seededRandomPick<T>(array: T[], seed: number): T {
  const rng = xoshiro128ss(seed);

  // Skip a few initial RNG values to improve distribution
  for (let i = 0; i < 5; i++) rng();

  return array[Math.floor(rng() * array.length)];
}

/**
 * Decodes and decompresses the encoded parameters from the URL.
 */
function decodeAndDecompressParams(
  encodedParams: string,
): Record<string, string> {
  let base64 = encodedParams.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }

  const binaryString = atob(base64);
  const uint8Array = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    uint8Array[i] = binaryString.charCodeAt(i);
  }

  const decompressed = pako.inflate(uint8Array);
  const plainParams = new TextDecoder().decode(decompressed);
  const decodedParams = plainParams.split(";");

  return decodedParams.reduce(
    (acc, param) => {
      const [key, value] = param.split("=");
      const realKey = mappings[key as keyof typeof mappings];
      acc[realKey] = value;
      return acc;
    },
    {} as Record<string, string>,
  );
}

/**
 * Extracts and formats meal date and time information from decoded parameters.
 */
function extractMealDateTime(
  data: Record<string, string>,
  mealsPlanningAmount: number,
) {
  const mealsDateStr = data.mealsDate?.replaceAll("'", "");
  const mealsTimeStr = data.mealsTime?.replaceAll("'", "");

  const mealsDate = mealsDateStr ? mealsDateStr.split("|") : [];
  const mealsTime = mealsTimeStr ? mealsTimeStr.split("|") : [];

  const mealDataMap = new Map();

  mealsDate.forEach((dateStr) => {
    const [index, date] = dateStr.split("#");
    if (index === "") return;
    if (!mealDataMap.has(index)) {
      mealDataMap.set(index, { mealNumber: index });
    }
    mealDataMap.get(index).date = date;
    const dayOfWeek = new Date(date).getDay();
    mealDataMap.get(index).dayOfWeek = weekdays[dayOfWeek];
  });

  mealsTime.forEach((timeStr) => {
    const [index, time] = timeStr.split("#");
    if (!mealDataMap.has(index)) {
      mealDataMap.set(index, { mealNumber: index });
    }
    mealDataMap.get(index).time = time;
  });

  const meals = [];
  for (let i = 0; i < mealsPlanningAmount; i++) {
    const mealData = mealDataMap.get(String(i));
    meals.push({
      mealNumber: String(i),
      date: mealData?.date,
      dayOfWeek: mealData?.dayOfWeek,
      time: mealData?.time,
    });
  }

  return meals;
}

/**
 * Filters canteens based on user preferences and shuffles them deterministically.
 */
async function filterAndShuffleCanteens(
  selectedCanteens: string[],
  filters: Record<string, boolean>,
  seed: number,
  priceRange: number[],
) {
  const airConditioningFilter =
    filters.withAircon && filters.noAircon
      ? undefined
      : filters.withAircon || filters.noAircon
        ? filters.withAircon
        : undefined;

  let filteredCanteens = await prisma.canteens.findMany({
    where: {
      id: {
        in:
          selectedCanteens.length > 0 && selectedCanteens[0] != ""
            ? selectedCanteens
            : undefined,
      },
      withAirConditioning: airConditioningFilter,
    },
  });

  if (filteredCanteens.length > 1) {
    filteredCanteens = shuffle(filteredCanteens, seed);
  }
  return filteredCanteens;
}

interface Meal {
  mealNumber: string;
  date?: string;
  dayOfWeek?: string;
  time?: string;
}

interface AvailableStoresForMeal {
  meal: Meal;
  foodStores: stores[];
  drinkStores: stores[];
}

interface SpecificStoreWithMeal {
  meal: Meal;
  canteenName?: string;
  foodStore?: stores;
  drinkStore?: stores;
}

/**
 * Selects a random store for each meal deterministically, ensuring at least one store sells a drink.
 */
function selectRandomStores(
  mealsStores: AvailableStoresForMeal[],
  planId: string,
) {
  const selectedStores: SpecificStoreWithMeal[] = [];
  const usedFoodStores: Set<string> = new Set();
  const usedDrinkStores: Set<string> = new Set();

  for (const mealStore of mealsStores) {
    const { meal: mealInfo, foodStores, drinkStores } = mealStore;

    let canteenSelectedForFood: string;

    // Select food store
    let foodStoreSeedOffset = 0;
    let pickedFoodStore: stores | undefined;
    do {
      const foodStoreSpecificSeed = stringToHash(
        planId + mealInfo.mealNumber + foodStoreSeedOffset,
      );
      pickedFoodStore = seededRandomPick(foodStores, foodStoreSpecificSeed)!;
      foodStoreSeedOffset++;
    } while (
      pickedFoodStore &&
      usedFoodStores.has(pickedFoodStore.id) &&
      foodStoreSeedOffset < foodStores.length + 1
    );

    if (pickedFoodStore) {
      canteenSelectedForFood = pickedFoodStore.canteenId;
      usedFoodStores.add(pickedFoodStore.id);
    }

    // Filter drink stores based on the selected food store's canteen
    const filteredDrinkStores = drinkStores.filter(
      (store) => store.canteenId === canteenSelectedForFood,
    );

    // Select drink store
    let drinkStoreSeedOffset = 0;
    let pickedDrinkStore: stores | undefined;
    if (filteredDrinkStores.length > 0) {
      do {
        const drinkStoreSpecificSeed = stringToHash(
          planId + mealInfo.mealNumber + "drink" + drinkStoreSeedOffset,
        );
        pickedDrinkStore = seededRandomPick(
          filteredDrinkStores,
          drinkStoreSpecificSeed,
        )!;
        drinkStoreSeedOffset++;
      } while (
        pickedDrinkStore &&
        usedDrinkStores.has(pickedDrinkStore.id) &&
        drinkStoreSeedOffset < drinkStores.length + 1
      );

      if (pickedDrinkStore) {
        usedDrinkStores.add(pickedDrinkStore.id);
      }
    }

    selectedStores.push({
      meal: mealInfo,
      foodStore: pickedFoodStore,
      drinkStore: pickedDrinkStore, // This will handle scenarios where a drink store is not found
    });
  }

  return selectedStores;
}

const getMenuItemId = (menu: StoresMenu) =>
  `${menu.name}-${menu.category}-${menu.price}`;

/**
 * Picks a meal and drink deterministically from a store's menu, avoiding duplicates.
 * Now returns both drink item and its store.
 */
function pickMealAndDrink(
  withBeverage: boolean,
  foodStore: stores,
  filteredMenu: StoresMenu[],
  drinkOptions: StoresMenu[],
  usedMeals: Set<string>,
  usedDrinks: Set<string>,
  planId: string,
) {
  let drinkEntry: StoresMenu | undefined;
  if (withBeverage && drinkOptions.length > 0) {
    // If all drink options have been used, allow reuse by clearing the used set.
    if (usedDrinks.size >= drinkOptions.length) {
      usedDrinks.clear();
    }
    let drinkSeedOffset = 0;
    do {
      const drinkSpecificSeed = stringToHash(
        foodStore.id + planId + "drink" + drinkSeedOffset,
      );
      drinkEntry = seededRandomPick(drinkOptions, drinkSpecificSeed);
      drinkSeedOffset++;
    } while (
      drinkEntry &&
      usedDrinks.has(getMenuItemId(drinkEntry)) &&
      drinkSeedOffset < drinkOptions.length + 1
    );

    if (drinkEntry) {
      usedDrinks.add(getMenuItemId(drinkEntry));
    }
  }

  // If all food options have been used, allow reuse by clearing the used set.
  if (filteredMenu.length > 0 && usedMeals.size >= filteredMenu.length) {
    usedMeals.clear();
  }

  let pickedFood: StoresMenu | undefined;
  let mealSeedOffset = 0;
  do {
    const mealSpecificSeed = stringToHash(
      foodStore.id + planId + "meal" + mealSeedOffset,
    );
    pickedFood = seededRandomPick(filteredMenu, mealSpecificSeed);
    mealSeedOffset++;
  } while (
    pickedFood &&
    usedMeals.has(getMenuItemId(pickedFood)) &&
    mealSeedOffset < filteredMenu.length + 1
  );

  // Fallback if nothing was picked
  if (!pickedFood) {
    pickedFood = filteredMenu[0];
  }
  usedMeals.add(getMenuItemId(pickedFood));

  return {
    pickedFood,
    pickedDrink: drinkEntry,
  };
}

/**
 * Fallback function: for a given food store (and its menus), simply choose the cheapest food option
 * and (if applicable) the cheapest drink option.
 */
function pickCheapestMealAndDrink(
  withBeverage: boolean,
  foodStore: stores,
  filteredMenu: StoresMenu[],
  drinkOptions: StoresMenu[],
) {
  // Choose the cheapest food option
  const pickedFood = filteredMenu.reduce((prev, curr) =>
    curr.price < prev.price ? curr : prev,
  );

  let pickedDrink: StoresMenu | undefined;
  if (withBeverage && drinkOptions.length > 0) {
    pickedDrink = drinkOptions.reduce((prev, curr) =>
      curr.price < prev.price ? curr : prev,
    );
  }
  return { pickedFood, pickedDrink };
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { encodedParams, planId } = params;
  if (!encodedParams || !planId) {
    // Handle missing parameters appropriately, e.g., redirect or show an error
    return { error: "Missing parameters" };
  }

  const seed = stringToHash(planId);

  const data = decodeAndDecompressParams(encodedParams);

  const priceRange = data.priceRange.split(",").map(Number);
  const selectedCanteens = data.selectedCanteens.split(",");
  const mealsPlanningAmount = Number(data.mealsPlanningAmount);
  const withBeverage = data.withBeverage === "1";
  let totalPlannedBudgets = Number(data.totalPlannedBudgets);

  const meals = extractMealDateTime(data, mealsPlanningAmount);

  const filters = {
    withAircon: data.withAircon === "1",
    noAircon: data.noAircon === "1",
    noodles: data.noodles === "1",
    somtum_northeastern: data.somtum_northeastern === "1",
    chicken_rice: data.chicken_rice === "1",
    rice_curry: data.rice_curry === "1",
    steak: data.steak === "1",
    japanese: data.japanese === "1",
    others: data.others === "1",
  };

  const criteria = {
    priceRange,
    withBeverage,
    totalPlannedBudgets,
    mealsPlanningAmount,
    filters,
    meals,
  };

  const filteredCanteens = await filterAndShuffleCanteens(
    selectedCanteens,
    filters,
    seed,
    priceRange,
  );

  const selectedCanteenIds = filteredCanteens.map((canteen) => canteen.id);

  const allStoresInCriteria = await findMatchingStores(
    criteria,
    selectedCanteenIds,
  );

  const selectedStoresForEachMeal = selectRandomStores(
    allStoresInCriteria,
    planId,
  );

  for (const mealstore of selectedStoresForEachMeal) {
    if (!mealstore.foodStore || !mealstore.drinkStore) {
      return {
        selectedMenu: [],
        budgetUsed: 0,
        totalPlannedBudgets
      }
    }
  }

  // assign canteen name to each store
  selectedStoresForEachMeal.forEach((mealStore) => {
    const { foodStore } = mealStore;
    const canteen = filteredCanteens.find(
      (canteen) => canteen.id === foodStore.canteenId,
    );
    mealStore.canteenName = canteen?.name;
  });

  const usedMeals: Set<string> = new Set();
  const usedDrinks: Set<string> = new Set();

  // Build the deterministic menu plan as before
  const selectedMenu = selectedStoresForEachMeal.map((mealStore) => {
    const { meal, foodStore, drinkStore, canteenName } = mealStore;

    const drinkOptions = drinkStore
      ? drinkStore.menu.filter(
        (menu) =>
          menu.category === "DRINK" &&
          menu.price >= priceRange[0] &&
          menu.price <= priceRange[1] &&
          menu.sub_category !== "toppings",
      )
      : [];
    const filteredMenu = foodStore.menu.filter(
      (menu) =>
        menu.price >= priceRange[0] &&
        menu.price <= priceRange[1] &&
        menu.category !== "DRINK" &&
        ((menu.sub_category === "chicken_rice" && filters.chicken_rice) ||
          (menu.sub_category === "japanese" && filters.japanese) ||
          (menu.sub_category === "noodles" && filters.noodles) ||
          (menu.sub_category === "rice_curry" && filters.rice_curry) ||
          (menu.sub_category === "somtum_northeastern" &&
            filters.somtum_northeastern) ||
          (menu.sub_category === "steak" && filters.steak) ||
          (menu.sub_category === "others" && filters.others) ||
          (!filters.chicken_rice &&
            !filters.japanese &&
            !filters.noodles &&
            !filters.rice_curry &&
            !filters.somtum_northeastern &&
            !filters.steak &&
            !filters.others)),
    );

    const { pickedFood, pickedDrink } = pickMealAndDrink(
      withBeverage,
      foodStore,
      filteredMenu,
      drinkOptions, // Pass modified drink options
      usedMeals,
      usedDrinks,
      planId,
    );

    return {
      meal,
      canteenName,
      store: (({ menu, ...rest }) => rest)(foodStore),
      pickedMeal: pickedFood,
      drinkMenu: pickedDrink,
      drinkStore: drinkStore ? (({ menu, ...rest }) => rest)(drinkStore) : null,
    };
  });

  // Calculate total cost for the deterministic plan (food + drink prices)
  const deterministicTotal = selectedMenu.reduce((sum, meal) => {
    return (
      sum + meal.pickedMeal.price + (meal.drinkMenu ? meal.drinkMenu.price : 0)
    );
  }, 0);

  // If the deterministic plan is within budget, return it…
  if (deterministicTotal <= totalPlannedBudgets) {
    return {
      selectedMenu,
      budgetUsed: deterministicTotal,
      totalPlannedBudgets,
    };
  }

  // Otherwise, build a fallback plan that uses the cheapest options available.
  const fallbackMenu = selectedStoresForEachMeal.map((mealStore) => {
    const { meal, foodStore, drinkStore, canteenName } = mealStore;
    const drinkOptions = drinkStore
      ? drinkStore.menu.filter(
        (menu) =>
          menu.category === "DRINK" &&
          menu.price >= priceRange[0] &&
          menu.price <= priceRange[1] &&
          menu.sub_category !== "toppings",
      )
      : [];
    const filteredMenu = foodStore.menu.filter(
      (menu) =>
        menu.price >= priceRange[0] &&
        menu.price <= priceRange[1] &&
        menu.category !== "DRINK" &&
        ((menu.sub_category === "chicken_rice" && filters.chicken_rice) ||
          (menu.sub_category === "japanese" && filters.japanese) ||
          (menu.sub_category === "noodles" && filters.noodles) ||
          (menu.sub_category === "rice_curry" && filters.rice_curry) ||
          (menu.sub_category === "somtum_northeastern" &&
            filters.somtum_northeastern) ||
          (menu.sub_category === "steak" && filters.steak) ||
          (menu.sub_category === "others" && filters.others) ||
          (!filters.chicken_rice &&
            !filters.japanese &&
            !filters.noodles &&
            !filters.rice_curry &&
            !filters.somtum_northeastern &&
            !filters.steak &&
            !filters.others)),
    );
    const { pickedFood, pickedDrink } = pickCheapestMealAndDrink(
      withBeverage,
      foodStore,
      filteredMenu,
      drinkOptions,
    );

    return {
      meal,
      canteenName,
      store: (({ menu, ...rest }) => rest)(foodStore) as stores,
      pickedMeal: pickedFood,
      drinkMenu: pickedDrink,
      drinkStore: drinkStore ? (({ menu, ...rest }) => rest)(drinkStore) : null,
    };
  });

  const fallbackTotal = fallbackMenu.reduce((sum, meal) => {
    return (
      sum + meal.pickedMeal.price + (meal.drinkMenu ? meal.drinkMenu.price : 0)
    );
  }, 0);

  return {
    // If the deterministic plan goes over budget, return the fallback plan.
    selectedMenu: fallbackMenu,
    budgetUsed: fallbackTotal,
    totalPlannedBudgets,
  };
};

function calculatePercentage(n: number, min: number, k: number) {
  if (n < min) {
    throw new Error("Value of n is out of range");
  }

  // if n is greater than k, return 100
  if (n > k) {
    return 100;
  }

  return ((n - min) / (k - min)) * 100;
}

export default function NewPlan({ loaderData }: Route.ComponentProps) {
  const selectedMenu = loaderData.selectedMenu;

  const budgetPercentage = calculatePercentage(
    loaderData.budgetUsed!,
    0,
    loaderData.totalPlannedBudgets!,
  );

  const { encodedParams } = useParams();
  const navigate = useNavigate();

  return (
    <>
      <VStack>
        <Text fontSize="2xl" fontWeight="semibold">
          Meal Plan
        </Text>
        <Text>
          Total budget used: ฿{loaderData.budgetUsed}/฿
          {loaderData.totalPlannedBudgets}
        </Text>
        <HStack width="24rem">
          <Progress.Root
            value={budgetPercentage}
            width="full"
            size="xl"
            colorPalette={
              budgetPercentage >= 80
                ? "red"
                : budgetPercentage >= 60
                  ? "yellow"
                  : "green"
            }
          >
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        </HStack>
        <Grid
          gap={4}
          templateColumns={{
            base: "1fr",
            md: "repeat(2, 1fr)",
          }}
          m={4}
          css={{
            "& > *:last-child:nth-of-type(odd)": {
              gridColumn: "1 / -1",
            },
          }}
        >
          {selectedMenu!.map((meal) => (
            <Box key={meal.meal.mealNumber}>
              <Box
                bg="accent.300"
                px={4}
                pt={4}
                pb={2}
                rounded="xl"
                position="relative"
                boxShadow="lg"
                border="2px solid"
                zIndex={2}
              >
                <Box
                  rounded="full"
                  bg="bg"
                  w={4}
                  h={4}
                  right={2}
                  top={2}
                  position="absolute"
                  border="2px solid"
                ></Box>

                <Text position="absolute" fontSize={16} bottom={2} left={2}>
                  {parseInt(meal.meal.mealNumber) + 1}
                </Text>
                <Text position="absolute" right={2} bottom={2}>
                  ฿{meal.pickedMeal.price}
                </Text>
                <VStack minW="16rem" h="full" justifyContent="space-between">
                  <VStack gap={1} mb={4}>
                    <Text
                      fontSize={18}
                      fontWeight="semibold"
                      width="14ch"
                      textAlign="center"
                    >
                      {meal.pickedMeal.name}
                    </Text>
                    <Text textAlign="center">@ {meal.store.name}</Text>
                    <Text textAlign="center">{meal.canteenName}</Text>
                  </VStack>
                  <Text>
                    {meal.meal.date}{" "}
                    {meal.meal.date && meal.meal.time ? "|" : ""}{" "}
                    {meal.meal.time}
                  </Text>
                </VStack>
              </Box>
              {meal.drinkMenu && meal.drinkStore && (
                <Flex
                  bg="brand.300"
                  rounded="lg"
                  minH={14}
                  pt={4}
                  px={2}
                  mt={-4}
                  border="2px solid"
                  alignItems="center"
                >
                  <HStack
                    textAlign="center"
                    h="full"
                    w="full"
                    justifyContent="space-between"
                  >
                    <Text color="white">{meal.drinkMenu.name}</Text>
                    <Text color="white">@ {meal.drinkStore.name}</Text>
                    <Text color="white">฿{meal.drinkMenu.price}</Text>
                  </HStack>
                </Flex>
              )}
            </Box>
          ))}
        </Grid>
        <HStack>
          <Button
            width="10rem"
            onClick={() => {
              const id = createId();
              navigate(`/plan/${encodedParams}/${id}`);
            }}
          >
            Get me a new meal!
          </Button>
          <Button colorPalette='accent' width="10rem">Do a survey</Button>
          <Link to="/">
            <Button width="10rem">Go back</Button>
          </Link>
        </HStack>
      </VStack>
      <Confetti mode="boom" particleCount={60} spreadDeg={120} y={0.3} />
    </>
  );
}
