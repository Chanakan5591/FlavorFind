import type { Route } from "./+types/plan";
import { useParams, type LoaderFunctionArgs } from "react-router";
import pako from "pako";
import prisma from "~/db.server";
import { findMatchingStores } from "~/util/datentime.server";
import type { stores, StoresMenu } from "@prisma/client";
import { Box, Flex, Grid, HStack, Text, VStack } from "@chakra-ui/react";

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
 * Generates a deterministic random number generator function based on a seed.
 */
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a hash code from a string.
 */
function stringToHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Shuffles an array deterministically using the Fisher-Yates algorithm.
 */
function shuffle<T>(array: T[], seed: number): T[] {
  const rng = mulberry32(seed);
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
 * Picks a random element from an array deterministically based on a seed.
 */
function seededRandomPick<T>(array: T[], seed: number): T {
  const rng = mulberry32(seed);
  let randomIndex = Math.floor(rng() * array.length);
  return array[randomIndex];
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

/**
 * Selects a random store for each meal deterministically, ensuring at least one store sells a drink.
 */
function selectRandomStores(
  mealsStores: Awaited<ReturnType<typeof findMatchingStores>>,
  planId: string,
) {
  const seedHash = stringToHash(planId);

  // 1. Find stores that have drinks
  const storesWithDrinks = new Set<stores>(); // Assuming 'Store' is the type of your store objects
  for (const mealData of mealsStores) {
    for (const store of mealData.stores) {
      if (store.menu && store.menu.some((item) => item.category === "DRINK")) {
        storesWithDrinks.add(store);
      }
    }
  }

  // 2. If no stores have drinks, fall back to the original logic (or handle it differently)
  if (storesWithDrinks.size === 0) {
    console.warn(
      "No stores with drinks found. Using original selection logic.",
    );
    return mealsStores.map((mealData, index) => {
      const mealSeed = seedHash + index;
      const selectedStore = seededRandomPick(mealData.stores, mealSeed);
      return { meal: mealData.meal, store: selectedStore };
    });
  }

  // 3. Deterministically select a store with drinks
  const drinkStoreIndex = seedHash % storesWithDrinks.size;
  const selectedDrinkStore = Array.from(storesWithDrinks)[drinkStoreIndex];

  // 4. Assign the drink store to a random meal (deterministically)
  const mealWithDrinkIndex = seedHash % mealsStores.length;

  // 5. Select stores for other meals, avoiding the drink store if it's already assigned
  return mealsStores.map((mealData, index) => {
    if (index === mealWithDrinkIndex) {
      return { meal: mealData.meal, store: selectedDrinkStore };
    } else {
      const availableStores = mealData.stores.filter(
        (store) => store !== selectedDrinkStore,
      );

      // If no other stores are available after removing the drink store, it means the drink store was the only one possible for this meal.
      // In this edge case, we will still use the drink store, as no better option exists
      const storesToPickFrom =
        availableStores.length > 0 ? availableStores : mealData.stores;

      const mealSeed = seedHash + index;
      const selectedStore = seededRandomPick(storesToPickFrom, mealSeed);
      return { meal: mealData.meal, store: selectedStore };
    }
  });
}

/**
 * Picks a meal and drink deterministically from a store's menu, avoiding duplicates.
 * Now returns both drink item and its store
 */
function pickMealAndDrink(
  withBeverage: boolean,
  store: (typeof selectedStores)[number]["store"],
  filteredMenu: StoresMenu[],
  drinkOptions: Array<{ store: stores; drink: StoresMenu }>, // Changed type
  usedMeals: Set<string>,
  usedDrinks: Set<string>,
  planId: string,
) {
  const getMenuItemId = (menu: StoresMenu) =>
    `${menu.name}-${menu.category}-${menu.price}`;

  let drinkEntry: { store: stores; drink: StoresMenu } | undefined;
  if (withBeverage) {
    let drinkSeedOffset = 0;
    do {
      const drinkSpecificSeed = stringToHash(
        store.id + planId + "drink" + drinkSeedOffset,
      );
      drinkEntry = seededRandomPick(drinkOptions, drinkSpecificSeed);
      drinkSeedOffset++;
    } while (
      drinkEntry &&
      usedDrinks.has(getMenuItemId(drinkEntry.drink)) &&
      drinkSeedOffset < drinkOptions.length + 1
    );

    if (drinkEntry) {
      usedDrinks.add(getMenuItemId(drinkEntry.drink));
    }
  }

  let pickedMeal: StoresMenu | undefined;
  let mealSeedOffset = 0;
  do {
    const mealSpecificSeed = stringToHash(
      store.id + planId + "meal" + mealSeedOffset,
    );
    pickedMeal = seededRandomPick(filteredMenu, mealSpecificSeed);
    mealSeedOffset++;
  } while (
    pickedMeal &&
    usedMeals.has(getMenuItemId(pickedMeal)) &&
    mealSeedOffset < filteredMenu.length + 1
  );

  if (pickedMeal) {
    usedMeals.add(getMenuItemId(pickedMeal));
  }

  return {
    pickedMeal,
    drinkMenu: drinkEntry?.drink,
    drinkStore: drinkEntry?.store, // Add drink store
  };
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
    beverage: data.beverage === "1",
    others: data.others === "1",
  };

  const filteredCanteens = await filterAndShuffleCanteens(
    selectedCanteens,
    filters,
    seed,
  );
  const selectedCanteenIds = filteredCanteens.map((canteen) => canteen.id);

  const criteria = {
    priceRange,
    withBeverage,
    totalPlannedBudgets,
    mealsPlanningAmount,
    filters,
    meals,
  };

  const mealsStores = await findMatchingStores(criteria, selectedCanteenIds);
  const selectedStores = selectRandomStores(mealsStores, planId);

  const usedMeals: Set<string> = new Set();
  const usedDrinks: Set<string> = new Set();

  const selectedMenu = selectedStores.map((mealStore) => {
    const { meal, store } = mealStore;

    const filteredMenu = store.menu.filter(
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

    const drinkOptions = selectedStores.flatMap((s) =>
      s.store.menu
        .filter(
          (menu) =>
            menu.category === "DRINK" && menu.price <= totalPlannedBudgets,
        )
        .map((drink) => ({ store: s.store, drink })),
    );

    const { pickedMeal, drinkMenu, drinkStore } = pickMealAndDrink(
      withBeverage,
      store,
      filteredMenu,
      drinkOptions, // Pass modified drink options
      usedMeals,
      usedDrinks,
      planId,
    );
    const storeWithoutMenu = (({ menu, ...rest }) => rest)(store);

    return {
      meal,
      store: storeWithoutMenu,
      pickedMeal,
      drinkMenu,
      drinkStore: drinkStore ? (({ menu, ...rest }) => rest)(drinkStore) : null,
    };
  });

  return {
    selectedMenu,
    selectedCanteens: filteredCanteens,
    totalPlannedBudgets,
  };
};

export default function NewPlan({ loaderData }: Route.ComponentProps) {
  const selectedMenu = loaderData.selectedMenu;
  console.log(selectedMenu);

  return (
    <VStack>
      <Text fontSize="2xl" fontWeight="semibold">
        Meal Plan
      </Text>
      <Grid
        gap={4}
        templateColumns={{
          base: "1fr",
          md: "repeat(2, 1fr)",
        }}
        m={4}
        css={{
          "& > *:last-child:nth-child(odd)": {
            gridColumn: "1 / -1",
          },
        }}
      >
        {selectedMenu!.map((meal) => (
          <Box>
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
                <Box>
                  <Text
                    fontSize={18}
                    fontWeight="semibold"
                    width="14ch"
                    textAlign="center"
                  >
                    {meal.pickedMeal.name}
                  </Text>
                  <Text textAlign="center">@ {meal.store.name}</Text>
                </Box>
                <Text mt={4}>
                  {meal.meal.date} {meal.meal.date && meal.meal.time ? "|" : ""}{" "}
                  {meal.meal.time}
                </Text>
              </VStack>
            </Box>
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
                <Text color="white">{meal.drinkMenu?.name}</Text>
                <Text color="white">@ {meal.drinkStore?.name}</Text>
                <Text color="white">฿{meal.drinkMenu?.price}</Text>
              </HStack>
            </Flex>
          </Box>
        ))}
      </Grid>
    </VStack>
  );
}
