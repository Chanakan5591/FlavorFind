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
import prisma from "~/db.server";

function timeToMinutes(timeStr: string) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function isMealWithinOpeningHours(
  mealTimeMinutes: number,
  openingTimeMinutes: number,
  closingTimeMinutes: number,
) {
  if (mealTimeMinutes === null) return true;

  return (
    mealTimeMinutes >= openingTimeMinutes &&
    mealTimeMinutes <= closingTimeMinutes - 30
  );
}

async function findMatchingStores(
  mealCriteria: {
    priceRange?: number[];
    withBeverage?: boolean;
    totalPlannedBudgets?: number;
    mealsPlanningAmount?: number;
    filters?: {
      withAircon: boolean;
      noAircon: boolean;
      noodles: boolean;
      somtum_northeastern: boolean;
      chicken_rice: boolean;
      rice_curry: boolean;
      steak: boolean;
      japanese: boolean;
      beverage: boolean;
      others: boolean;
    };
    meals: any;
  },
  cafeteriaIds: string[],
) {
  // Fetch all food stores that have at least one meal within the price range
  const allStores = await prisma.stores.findMany({
    where: {
      canteenId: {
        in:
          cafeteriaIds.length > 0 && cafeteriaIds[0] != ""
            ? cafeteriaIds
            : undefined,
      },
      menu: {
        some: {
          category: {
            not: "DRINK",
          },
          price: {
            gte: mealCriteria.priceRange ? mealCriteria.priceRange[0] : undefined,
            lte: mealCriteria.priceRange ? mealCriteria.priceRange[1] : undefined,
          },
          // Dynamically build the OR clause
          ...(mealCriteria.filters &&
            Object.values(mealCriteria.filters).some(Boolean)
            ? {
              OR: [
                mealCriteria.filters.noodles
                  ? { sub_category: { equals: "noodles" } }
                  : null,
                mealCriteria.filters.somtum_northeastern
                  ? { sub_category: { equals: "somtum_northeastern" } }
                  : null,
                mealCriteria.filters.chicken_rice
                  ? { sub_category: { equals: "chicken_rice" } }
                  : null,
                mealCriteria.filters.rice_curry
                  ? { sub_category: { equals: "rice_curry" } }
                  : null,
                mealCriteria.filters.steak
                  ? { sub_category: { equals: "steak" } }
                  : null,
                mealCriteria.filters.japanese
                  ? { sub_category: { equals: "japanese" } }
                  : null,
                mealCriteria.filters.others
                  ? { sub_category: { equals: "others" } }
                  : null,
              ].filter(Boolean), // Remove null entries
            }
            : {}), // If no filters are active, omit the OR clause
        },
      },
    },
  });

  // Fetch all drink stores that have at least one drink within the price range
  const drinkStores = await prisma.stores.findMany({
    where: {
      canteenId: {
        in:
          cafeteriaIds.length > 0 && cafeteriaIds[0] != ""
            ? cafeteriaIds
            : undefined,
      },
      menu: {
        some: {
          category: "DRINK",
          price: {
            gte: mealCriteria.priceRange ? mealCriteria.priceRange[0] : undefined,
            lte: mealCriteria.priceRange ? mealCriteria.priceRange[1] : undefined,
          },
        },
      },
    },
  });

  const filteredStoresByMeal = [];

  for (const meal of mealCriteria.meals) {
    const mappedDayOfWeek = meal.dayOfWeek;
    const mealTimeMinutes = timeToMinutes(meal.time);

    const matchingFoodStores = allStores.filter((store) => {
      const openingHoursForDay = mappedDayOfWeek
        ? store.openingHours.find((oh) => oh.dayOfWeek === mappedDayOfWeek)
        : null;

      if (mappedDayOfWeek && !openingHoursForDay) {
        return false;
      }

      if (!meal.time) {
        return true;
      }

      if (!mappedDayOfWeek) {
        return store.openingHours.some((oh) => {
          const openingTimeMinutes = timeToMinutes(oh.start);
          const closingTimeMinutes = timeToMinutes(oh.end);
          return isMealWithinOpeningHours(
            mealTimeMinutes,
            openingTimeMinutes,
            closingTimeMinutes,
          );
        });
      }

      const openingTimeMinutes = timeToMinutes(openingHoursForDay.start);
      const closingTimeMinutes = timeToMinutes(openingHoursForDay.end);
      return isMealWithinOpeningHours(
        mealTimeMinutes,
        openingTimeMinutes,
        closingTimeMinutes,
      );
    });

    const matchingDrinkStores = drinkStores.filter((store) => {
      const openingHoursForDay = mappedDayOfWeek
        ? store.openingHours.find((oh) => oh.dayOfWeek === mappedDayOfWeek)
        : null;

      if (mappedDayOfWeek && !openingHoursForDay) {
        return false;
      }

      if (!meal.time) {
        return true;
      }

      if (!mappedDayOfWeek) {
        return store.openingHours.some((oh) => {
          const openingTimeMinutes = timeToMinutes(oh.start);
          const closingTimeMinutes = timeToMinutes(oh.end);
          return isMealWithinOpeningHours(
            mealTimeMinutes,
            openingTimeMinutes,
            closingTimeMinutes,
          );
        });
      }

      const openingTimeMinutes = timeToMinutes(openingHoursForDay.start);
      const closingTimeMinutes = timeToMinutes(openingHoursForDay.end);
      return isMealWithinOpeningHours(
        mealTimeMinutes,
        openingTimeMinutes,
        closingTimeMinutes,
      );
    });

    filteredStoresByMeal.push({
      meal,
      foodStores: matchingFoodStores,
      drinkStores: matchingDrinkStores,
    });
  }

  return filteredStoresByMeal;
}

export { findMatchingStores };
