import prisma from "~/db.server";

function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function isMealWithinOpeningHours(
  mealTimeMinutes,
  openingTimeMinutes,
  closingTimeMinutes,
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
  // Fetch all food stores
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
        },
      },
    },
  });

  // Fetch all drink stores
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
