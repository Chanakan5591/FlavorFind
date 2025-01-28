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

  const filteredStoresByMeal = [];

  for (const meal of mealCriteria.meals) {
    const mappedDayOfWeek = meal.dayOfWeek;
    const mealTimeMinutes = timeToMinutes(meal.time);

    const matchingStoresForMeal = allStores.filter((store) => {
      // If no day of the week is specified, we don't filter by day.
      // Otherwise, we need to find opening hours for the specific day.
      const openingHoursForDay = mappedDayOfWeek
        ? store.openingHours.find((oh) => oh.dayOfWeek === mappedDayOfWeek)
        : null;

      // If a day is specified and the store is not open on that day, exclude it.
      if (mappedDayOfWeek && !openingHoursForDay) {
        return false;
      }

      // If no meal time is specified, we don't need to check the time.
      if (!meal.time) {
        return true;
      }

      // If no day is specified, consider all opening hours.
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

      // If we have a day and time, check against the specific day's opening hours.
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
      stores: matchingStoresForMeal,
    });
  }

  return filteredStoresByMeal;
}
export { findMatchingStores };
