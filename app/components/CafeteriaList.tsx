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
import React, { useMemo, useCallback, useEffect, useState, useRef } from "react";
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
import { useAtom, useAtomValue } from "jotai";
import { cafeteriaListCurrentPage, clientHMACFingerprintAtom, filtersAtom } from "~/stores";
import { animateScroll as scroll } from 'react-scroll'
import { useFeatureFlagEnabled } from 'posthog-js/react'


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

  // Get the current day of the week in UTC+7
  const currentDayOfWeekUTCPlus7 = now
    .toLocaleString("en-US", {
      weekday: "long",
      timeZone: "Asia/Bangkok", // Use a timezone identifier for UTC+7 (e.g., Bangkok, Jakarta)
    })
    .toUpperCase();

  // Get the current time in UTC+7 and convert it to 24-hour format integer
  const currentHourUTCPlus7 = now.toLocaleString("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: "Asia/Bangkok",
  });
  const currentMinuteUTCPlus7 = now.toLocaleString("en-US", {
    minute: "numeric",
    timeZone: "Asia/Bangkok",
  });
  const currentTimeUTCPlus7 =
    parseInt(currentHourUTCPlus7) * 100 + parseInt(currentMinuteUTCPlus7);

  // Find the opening hours for today in UTC+7
  const todayHours = openingHours.find(
    (hours) => hours.dayOfWeek === currentDayOfWeekUTCPlus7,
  );

  if (!todayHours) {
    return false; // Closed if there are no hours specified for today
  }

  // Convert opening and closing times (which are already in UTC+7) to 24-hour format integers
  const startTime = parseInt(todayHours.start.replace(":", ""));
  const endTime = parseInt(todayHours.end.replace(":", ""));

  // Check if the current time (in UTC+7) is within the opening hours
  return currentTimeUTCPlus7 >= startTime && currentTimeUTCPlus7 <= endTime;
}

const StoreItem: React.FC<StoreItemProps> = React.memo(
  ({ store, onUserRatingChange }): ReactElement => {
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

    const clientHMACFingerprint = useAtomValue(clientHMACFingerprintAtom);

    // State to manage the local rating count.  Initialize from the store's rating length
    const [ratingCount, setRatingCount] = useState(store.ratings.length);

    const handleRatingChange = (newRating: number) => {
      onUserRatingChange(store.id, newRating, clientHMACFingerprint);

      // Optimistically update the rating count locally
      if (store.ratings.length === 0 && store.userStoreRating === 0) { // Only increment if the user hasn't rated before based on initial props
        setRatingCount(1);
      } else if (store.userStoreRating === 0 && store.ratings.length > 0) {
        setRatingCount(prevCount => prevCount + 1);
      }
      // Note:  In a real application, you might want to refetch/update the store data
      // from the server after a successful rating change to ensure consistency,
      // rather than relying solely on local state for the updated rating count.
    };

    // Calculate the average rating
    const averageRating = store.ratings.length > 0
      ? Math.round((store.ratings.reduce((sum, value) => sum + value.rating, 0) / store.ratings.length) * 100) / 100
      : 0; // Handle the case where there are no ratings

    return (
      <GridItem key={store.id}>
        <Card.Root width="full" bg="#E0F2E9">
          <Card.Body gap="2">
            <Card.Title mt="2" display="flex" justifyContent="space-between">
              <Text>{store.name}</Text>
              <Box>
                <Text as='span' fontSize='sm' fontWeight='normal' mr={1}>({ratingCount})</Text>
                <ReviewStars
                  averageRating={averageRating}
                  userRating={store.userStoreRating}
                  storeId={store.id}
                  onRatingChange={handleRatingChange}
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
  }
);

// Canteen item component
const CanteenItem = React.memo(
  ({
    canteen,
    onUserRatingChange,
  }: {
    canteen: Omit<CanteenWithStores, "stores"> & { stores };
    onUserRatingChange: (storeId: string, newRating: number, clientHMAC: string) => void;
  }) => {
    const useNewCardLayout = useFeatureFlagEnabled('card-take-up-free-space')
    const gridTemplateColumns = useMemo(() => {
      if (useNewCardLayout) {
        return {
          base: "1fr",
          md: "repeat(auto-fit, minmax(300px, 1fr))", // Adjust minmax value as needed
        };
      } else {
        return {
          base: "1fr",
          md: "repeat(2, 1fr)",
          xl: "repeat(3, 1fr)",
        };
      }
    }, [useNewCardLayout]);


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
              templateColumns={gridTemplateColumns}
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
          {/* <Card.Footer justifyContent="flex-end">
            <Button variant="outline">ปุ่ม</Button>
            <Button>ทำไรดี</Button>
          </Card.Footer> */}
        </Card.Root>
      </GridItem>
    );
  },
);

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  const pageNumbers = useMemo(() => {
    const pages: (number | '...')[] = [];
    const visiblePageCount = 5; // Adjust for how many page numbers to show

    if (totalPages <= visiblePageCount) {
      // Show all page numbers if totalPages is less than or equal to visiblePageCount
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Add first page
      pages.push(1);

      // Add ellipsis if needed
      if (currentPage > 3) {
        pages.push('...');
      }

      // Add current page and neighbors
      let startPage = Math.max(currentPage - 1, 2);
      let endPage = Math.min(currentPage + 1, totalPages - 1);

      // Adjust start and end if they are too close to the beginning or end
      if (endPage - startPage < 2) {
        if (currentPage < totalPages - 1) {
          endPage = Math.min(endPage + (2 - (endPage - startPage)), totalPages - 1);
        } else {
          startPage = Math.max(startPage - (2 - (endPage - startPage)), 2);
        }
      }


      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      // Add ellipsis if needed
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Add last page
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages]);

  return (
    <Flex justifyContent="space-between" alignItems="center" mt={4}>
      <Button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </Button>

      <Flex>
        {pageNumbers.map((page, index) => (
          <Button
            key={index}
            onClick={() => typeof page === 'number' ? onPageChange(page) : undefined}
            disabled={typeof page !== 'number'}
            colorScheme={typeof page === 'number' && page === currentPage ? 'blue' : undefined}
            variant={typeof page === 'number' && page === currentPage ? 'solid' : 'ghost'}
          >
            {page}
          </Button>
        ))}
      </Flex>

      <Button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </Button>
    </Flex>
  );
};

const DEFAULT_ITEMS_PER_PAGE = 4
const MAX_MENU_ITEMS_PER_PAGE = 20;

const CafeteriaList = React.memo(
  ({
    selectedCafeteria,
    priceRange,
    canteens,
    onUserRatingChange: onUserRatingChangeProp,
  }: {
    selectedCafeteria: string[];
    priceRange: number[];
    canteens: CanteenWithStores[];
    onUserRatingChange: (storeId: string, newRating: number, clientHMAC: string) => void;
  }) => {
    const [currentPage, setCurrentPage] = useAtom(cafeteriaListCurrentPage);
    const onUserRatingChange = useCallback(onUserRatingChangeProp, []);
    const filters = useAtomValue(filtersAtom);
    const clientHMACFingerprint = useAtomValue(clientHMACFingerprintAtom)
    const clientFingerprint = clientHMACFingerprint.split(':')[0]

    const doPaginationOnMenuCount = useFeatureFlagEnabled(
      'pagination-based-on-menu-count',
    );

    // Memoize menu item filtering
    // Instead of multiple filters:
    const filteredCanteens = useMemo(() => {
      return canteens.reduce((acc, canteen) => {
        if (
          selectedCafeteria.length > 0 &&
          !selectedCafeteria.includes(canteen.id)
        ) {
          return acc; // Skip this canteen
        }

        if (
          filters.withAircon &&
          !filters.noAircon &&
          !canteen.withAirConditioning
        ) {
          return acc;
        }

        if (
          !filters.withAircon &&
          filters.noAircon &&
          canteen.withAirConditioning
        ) {
          return acc;
        }

        // If it passes all canteen filters, then map the stores
        const stores = canteen.stores.map((store) => {
          const userRating = store.ratings.find(
            (rating) => rating.clientFingerprint === clientFingerprint,
          )?.rating;

          const filteredMenu = store.menu.filter((menu) => {
            // Price range filter
            if (menu.price < priceRange[0] || menu.price > priceRange[1]) {
              return false;
            }

            // Sub-category filter (hardcoded mapping)
            let includeItem = false; // Flag to track if the item should be included

            if (menu.category === 'food') {
              switch (menu.sub_category) {
                case 'noodles':
                  includeItem = filters.noodles;
                  break;
                case 'soup_curry':
                  includeItem = filters.soup_curry;
                  break;
                case 'chicken_rice':
                  includeItem = filters.chicken_rice;
                  break;
                case 'rice_curry':
                  includeItem = filters.rice_curry;
                  break;
                case 'somtum_northeastern':
                  includeItem = filters.somtum_northeastern;
                  break;
                case 'steak':
                  includeItem = filters.steak;
                  break;
                case 'japanese':
                  includeItem = filters.japanese;
                  break;
                default:
                  includeItem = filters.others; // If not a specific sub-category, check "others"
              }
            } else if (menu.category === 'DRINK') {
              // You can add similar logic for drink sub-categories here
              // if you want to filter drinks in the future.
              // For now, we will not filter drinks based on filters except price.

              // The part that currently allow all drinks to be shown on the webpage
              includeItem = filters.beverage;
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
              !filters.others &&
              !filters.beverage
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
        });

        return [...acc, { ...canteen, stores: stores }];
      }, []);
    }, [canteens, selectedCafeteria, filters, clientFingerprint, priceRange]);

    useEffect(() => {
      setCurrentPage(1);
    }, [filteredCanteens]);

    let items_per_page = DEFAULT_ITEMS_PER_PAGE;

    const [canteensForPage, totalPages] = useMemo(() => {
      if (doPaginationOnMenuCount) {
        // Calculate canteens per page based on menu item count
        let currentPageCanteens: CanteenWithStores[] = [];
        let currentMenuItemCount = 0;
        let startIndex = (currentPage - 1) * DEFAULT_ITEMS_PER_PAGE; // Start with a base number of canteens
        let maxCanteens = filteredCanteens.length;
        items_per_page = DEFAULT_ITEMS_PER_PAGE;

        for (
          let i = startIndex;
          i < maxCanteens && currentMenuItemCount <= MAX_MENU_ITEMS_PER_PAGE;
          i++
        ) {
          const canteen = filteredCanteens[i];
          const totalMenuItems = canteen.stores.reduce(
            (sum, store) => sum + store.menu.length,
            0,
          );

          if (currentMenuItemCount + totalMenuItems <= MAX_MENU_ITEMS_PER_PAGE) {
            currentPageCanteens.push(canteen);
            currentMenuItemCount += totalMenuItems;
            items_per_page++;
          } else {
            // If adding this canteen exceeds the limit, break the loop
            break;
          }
        }

        // Recalculate items_per_page based on actual number of displayed items
        items_per_page = currentPageCanteens.length;

        // Calculate total pages
        const totalCanteens = filteredCanteens.length;
        const totalPages = Math.ceil(totalCanteens / items_per_page);
        return [currentPageCanteens, totalPages];
      } else {
        // Original pagination logic

        const startIndex = (currentPage - 1) * DEFAULT_ITEMS_PER_PAGE;
        const endIndex = startIndex + DEFAULT_ITEMS_PER_PAGE;
        const canteensForPage = filteredCanteens.slice(startIndex, endIndex);
        const totalPages = Math.ceil(
          filteredCanteens.length / DEFAULT_ITEMS_PER_PAGE,
        );
        items_per_page = DEFAULT_ITEMS_PER_PAGE; // Reset item page
        return [canteensForPage, totalPages];
      }
    }, [filteredCanteens, currentPage, doPaginationOnMenuCount]);

    const handlePageChange = useCallback((page: number) => {
      setCurrentPage(page);
    }, [setCurrentPage]);


    useEffect(() => {
      scroll.scrollToTop();
    }, [currentPage]);

    return (
      <div>
        <Grid gap={4}>
          {canteensForPage.map((canteen) => (
            <CanteenItem
              key={canteen.id}
              canteen={canteen}
              onUserRatingChange={onUserRatingChange}
            />
          ))}
        </Grid>

        {/* Pagination controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
    );
  },
);

export default CafeteriaList;
