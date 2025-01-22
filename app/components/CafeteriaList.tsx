import React, { useMemo, useCallback } from "react";
import {
  Box,
  Card,
  Collapsible,
  Flex,
  Grid,
  GridItem,
  HStack,
  Text,
} from "@chakra-ui/react";
import type { CanteenWithStores } from "~/types";
import { Button } from "./ui/button";
import ReviewStars from "./ReviewStars";
import { AirVent, Snowflake } from "lucide-react";
import { useAtomValue } from "jotai";
import { filtersAtom } from "~/stores";

// Menu item component
const MenuItem = React.memo(
  ({ menu }: { menu: { name: string; price: number } }) => {
    return (
      <HStack justifyContent="space-between">
        <Text>{menu.name}</Text>
        <Text>฿{menu.price}</Text>
      </HStack>
    );
  },
);

// Menu list component
const MenuList = React.memo(
  ({ menu }: { menu: Array<{ name: string; price: number }> }) => {
    return menu.length > 0 ? (
      <Box>
        {menu.map((item, index) => (
          <MenuItem key={index} menu={item} />
        ))}
      </Box>
    ) : (
      <Text>No menu items available.</Text>
    );
  },
);

function isOpenNow(
  openingHours: { dayOfWeek: string; start: string; end: string }[],
) {
  const now = new Date(); // Get the current date and time
  const currentDayOfWeek = now
    .toLocaleString("en-US", { weekday: "long" })
    .toUpperCase(); // Get the current day of the week (e.g., "MONDAY")
  const currentTime = now.getHours() * 100 + now.getMinutes(); // Get the current time in 24-hour format (e.g., 1430 for 2:30 PM)

  // Find the opening hours for today
  const todayHours = openingHours.find(
    (hours) => hours.dayOfWeek === currentDayOfWeek,
  );

  if (!todayHours) {
    return false; // Closed if there are no hours specified for today
  }

  // Convert opening and closing times to 24-hour format integers
  const startTime = parseInt(todayHours.start.replace(":", ""));
  const endTime = parseInt(todayHours.end.replace(":", ""));

  // Check if the current time is within the opening hours
  return currentTime >= startTime && currentTime <= endTime;
}

// Store item component
const StoreItem = React.memo(
  ({
    store,
    onUserRatingChange,
  }: {
    store: CanteenWithStores["stores"][number] & { userStoreRating: number };
    onUserRatingChange: (storeId: string, newRating: number) => void;
  }) => {
    const currentDate = new Date();
    const dayOfWeekLangMap = {
      SUNDAY: "อาทิตย์",
      MONDAY: "จันทร์",
      TUESDAY: "อังคาร",
      WEDNESDAY: "พุธ",
      THURSDAY: "พฤหัสบดี",
      FRIDAY: "ศุกร์",
      SATURDAY: "เสาร์",
    };
    return (
      <GridItem key={store.id}>
        <Card.Root width="full" bg="#E0F2E9">
          <Card.Body gap="2">
            <Card.Title mt="2" display="flex" justifyContent="space-between">
              <Text>{store.name}</Text>
              <Box>
                <ReviewStars
                  averageRating={
                    Math.round(
                      (store.ratings.reduce(
                        (sum, value) => sum + value.rating,
                        0,
                      ) /
                        store.ratings.length) *
                        100,
                    ) / 100
                  }
                  userRating={store.userStoreRating}
                  storeId={store.id}
                  onRatingChange={(newRating: number) =>
                    onUserRatingChange(store.id, newRating)
                  }
                />
              </Box>
            </Card.Title>
            <Card.Description>{store.description}</Card.Description>

            <Collapsible.Root unmountOnExit>
              <Collapsible.Trigger
                paddingY="3"
                cursor="pointer"
                textDecor="underline"
              >
                ช่วงเวลาเปิด-ปิด{" "}
                <Text
                  as="span"
                  color={isOpenNow(store.openingHours) ? "green" : "red"}
                >
                  ({isOpenNow(store.openingHours) ? "เปิดอยู่" : "ปิดแล้ว"})
                </Text>
              </Collapsible.Trigger>
              <Collapsible.Content>
                <Box
                  paddingX="4"
                  paddingY="2"
                  bg="#f1fff8"
                  borderRadius="md"
                  borderWidth={1}
                  borderColor="#7ef7af"
                >
                  {store.openingHours.map((hour, index) => (
                    <Flex justifyContent={"space-between"} key={index}>
                      <Text key={hour.dayOfWeek}>
                        {dayOfWeekLangMap[hour.dayOfWeek]}
                      </Text>
                      <Text key={index}>
                        {hour.start} - {hour.end}
                      </Text>
                    </Flex>
                  ))}
                </Box>
              </Collapsible.Content>
            </Collapsible.Root>

            <MenuList menu={store.menu} />
          </Card.Body>
        </Card.Root>
      </GridItem>
    );
  },
);

// Canteen item component
const CanteenItem = React.memo(
  ({
    canteen,
    onUserRatingChange,
  }: {
    canteen: Omit<CanteenWithStores, "stores"> & { stores };
    onUserRatingChange: (storeId: string, newRating: number) => void;
  }) => {
    return (
      <GridItem>
        <Card.Root
          width="full"
          bg="#f1fff8"
          borderColor="#7ef7af"
          borderWidth={2}
        >
          <Card.Body gap="2">
            <Card.Title mt="2">
              <Text display="flex" alignItems="center" gapX={1}>
                {canteen.name}{" "}
                {canteen.withAirConditioning ? (
                  <Snowflake color="#0468cc" />
                ) : (
                  ""
                )}
              </Text>
            </Card.Title>
            <Grid
              gap={4}
              templateColumns={{
                base: "1fr",
                md: "repeat(2, 1fr)",
                xl: "repeat(3, 1fr)",
              }}
            >
              {canteen.stores && canteen.stores.length > 0 ? (
                canteen.stores.map((store) => (
                  <StoreItem
                    key={store.id}
                    store={store}
                    onUserRatingChange={onUserRatingChange}
                  />
                ))
              ) : (
                <Text>No stores available.</Text>
              )}
            </Grid>
          </Card.Body>
          <Card.Footer justifyContent="flex-end">
            <Button variant="outline">ปุ่ม</Button>
            <Button>ทำไรดี</Button>
          </Card.Footer>
        </Card.Root>
      </GridItem>
    );
  },
);

// Cafeteria list component
const CafeteriaList = React.memo(
  ({
    selectedCafeteria,
    priceRange,
    canteens,
    onUserRatingChange: onUserRatingChangeProp,
    clientFingerprint,
  }: {
    selectedCafeteria: string[];
    priceRange: number[];
    canteens: CanteenWithStores[];
    onUserRatingChange: (storeId: string, newRating: number) => void;
    clientFingerprint: string;
  }) => {
    const onUserRatingChange = useCallback(onUserRatingChangeProp, []);
    const filters = useAtomValue(filtersAtom);
    const filteredCanteens = useMemo(() => {
      return canteens
        .filter((canteen) => {
          // Filter by selected cafeteria (as before)
          if (
            selectedCafeteria.length > 0 &&
            !selectedCafeteria.includes(canteen.id)
          ) {
            return false;
          }

          // Filter by air conditioning preference
          if (filters.withAircon && !filters.noAircon) {
            if (!canteen.withAirConditioning) {
              return false;
            }
          } else if (!filters.withAircon && filters.noAircon) {
            if (canteen.withAirConditioning) {
              return false;
            }
          }

          return true;
        })
        .map((canteen) => ({
          ...canteen,
          stores: canteen.stores.map((store) => {
            const userRating = store.ratings.find(
              (rating) => rating.clientFingerprint === clientFingerprint,
            )?.rating;

            // Filter menu items based on sub_category and price range
            const filteredMenu = store.menu.filter((menu) => {
              // Price range filter
              if (menu.price < priceRange[0] || menu.price > priceRange[1]) {
                return false;
              }

              // Sub-category filter (hardcoded mapping)
              let includeItem = false; // Flag to track if the item should be included

              if (menu.category === "food") {
                switch (menu.sub_category) {
                  case "noodles":
                    includeItem = filters.noodles;
                    break;
                  case "soup_curry":
                    includeItem = filters.soup_curry;
                    break;
                  case "chicken_rice":
                    includeItem = filters.chicken_rice;
                    break;
                  case "rice_curry":
                    includeItem = filters.rice_curry;
                    break;
                  case "somtum_northeastern":
                    includeItem = filters.somtum_northeastern;
                    break;
                  case "steak":
                    includeItem = filters.steak;
                    break;
                  case "japanese":
                    includeItem = filters.japanese;
                    break;
                  default:
                    includeItem = filters.others; // If not a specific sub-category, check "others"
                }
              } else if (menu.category === "DRINK") {
                // You can add similar logic for drink sub-categories here
                // if you want to filter drinks in the future.
                // For now, we will not filter drinks based on filters except price.
                includeItem = true;
              } else {
                includeItem = filters.others; // default catch all others if category is not food nor drink
              }

              // Check if "others" is selected and the item doesn't match any other filter
              if (!includeItem && filters.others) {
                includeItem = true;
              }

              // If no specific sub-category filters are active, include the item
              if (
                !filters.noodles &&
                !filters.soup_curry &&
                !filters.chicken_rice &&
                !filters.rice_curry &&
                !filters.somtum_northeastern &&
                !filters.steak &&
                !filters.japanese &&
                !filters.others
              ) {
                includeItem = true;
              }

              return includeItem;
            });

            return {
              ...store,
              menu: filteredMenu,
              userStoreRating: userRating ?? 0,
            };
          }),
        }));
    }, [canteens, selectedCafeteria, priceRange, clientFingerprint, filters]);

    return (
      <Grid gap={4}>
        {filteredCanteens.map((canteen) => (
          <CanteenItem
            key={canteen.id}
            canteen={canteen}
            onUserRatingChange={onUserRatingChange}
          />
        ))}
      </Grid>
    );
  },
);

export default CafeteriaList;
