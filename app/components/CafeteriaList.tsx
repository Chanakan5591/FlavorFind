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
import { AirVent, ArrowBigLeft, ArrowBigRight, Snowflake } from "lucide-react";
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
  ({ store, onUserRatingChange }): ReactElement | null => {
    if (!store.menu || store.menu.length === 0) {
      return null;
    }

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

const CanteenItem = React.memo(
  ({
    canteen,
    onUserRatingChange,
  }: {
    canteen: Omit<CanteenWithStores, "stores"> & { stores: any[] };
    onUserRatingChange: (storeId: string, newRating: number, clientHMAC: string) => void;
  }) => {
    const useNewCardLayout = useFeatureFlagEnabled('card-take-up-free-space');
    const gridTemplateColumns = useMemo(() => {
      if (useNewCardLayout) {
        return {
          base: "1fr",
          md: "repeat(auto-fit, minmax(300px, 1fr))", // Adjust as needed
        };
      } else {
        return {
          base: "1fr",
          md: "repeat(2, 1fr)",
          xl: "repeat(3, 1fr)",
        };
      }
    }, [useNewCardLayout]);

    // Filter out stores that have no menu items.
    const filteredStores = useMemo(() => {
      return canteen.stores.filter(
        (store) => store.menu && store.menu.length > 0
      );
    }, [canteen.stores]);

    // If no stores to render, hide the canteen entirely.
    if (filteredStores.length === 0) {
      return null;
    }

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
            <Grid gap={4} templateColumns={gridTemplateColumns}>
              {filteredStores.map((store) => (
                <StoreItem
                  key={store.id}
                  store={store}
                  onUserRatingChange={onUserRatingChange}
                />
              ))}
            </Grid>
          </Card.Body>
        </Card.Root>
      </GridItem>
    );
  },
);

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
  const [visiblePageCount, setVisiblePageCount] = useState(3); // Default to 3 (mobile)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 500) { // Adjust 768 to your desired breakpoint
        if (visiblePageCount != 5)
          setVisiblePageCount(5);
      } else {
        if (visiblePageCount != 3)
          setVisiblePageCount(3);
      }
    };

    // Initial check on mount
    handleResize();

    // Listen for window resize events
    window.addEventListener('resize', handleResize);

    // Clean up the event listener on unmount
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty dependency array: run only on mount and unmount

  const pageNumbers = useMemo(() => {
    const pages: (number | '...')[] = [];

    if (totalPages <= visiblePageCount) {
      // If there are only a few pages, show them all.
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Reserve two slots for the first and last pages.
      const windowSize = visiblePageCount - 2;
      const halfWindow = Math.floor(windowSize / 2);

      // Determine the window boundaries centered on currentPage.
      let startPage = currentPage - halfWindow;
      let endPage = currentPage + halfWindow;

      // If currentPage is near the start, adjust the window to the right.
      if (startPage < 2) {
        startPage = 2;
        endPage = startPage + windowSize - 1;
      }

      // If currentPage is near the end, adjust the window to the left.
      if (endPage > totalPages - 1) {
        endPage = totalPages - 1;
        startPage = endPage - windowSize + 1;
      }

      // Always show the first page.
      pages.push(1);

      // Add an ellipsis if there's a gap between page 1 and the window.
      if (startPage > 2) {
        pages.push('...');
      }

      // Add the pages in the window.
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      // Add an ellipsis if there's a gap between the window and the last page.
      if (endPage < totalPages - 1) {
        pages.push('...');
      }

      // Always show the last page.
      pages.push(totalPages);
    }
    return pages;
  }, [currentPage, totalPages, visiblePageCount]);

  return (
    <Flex justifyContent="space-between" alignItems="center" mt={4}>
      <Button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ArrowBigLeft />
      </Button>

      <Flex>
        {pageNumbers.map((page, index) => (
          <Button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
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
        <ArrowBigRight />
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
    onUserRatingChange: (
      storeId: string,
      newRating: number,
      clientHMAC: string,
    ) => void;
  }) => {
    const [currentPage, setCurrentPage] = useAtom(cafeteriaListCurrentPage);
    const onUserRatingChange = useCallback(onUserRatingChangeProp, []);
    const filters = useAtomValue(filtersAtom);
    const clientHMACFingerprint = useAtomValue(clientHMACFingerprintAtom);
    const clientFingerprint = clientHMACFingerprint.split(":")[0];

    const doPaginationOnMenuCount = useFeatureFlagEnabled('pagination-based-on-menu-count')
    //    const doPaginationOnMenuCount = true

    /**
     * 1. Filter and transform canteens  
     *    - Apply canteen filters  
     *    - For each canteen, filter its stores (and their menu items)  
     *    - Finally, filter out any canteen that ends up with no visible stores
     */
    const filteredCanteens = useMemo(() => {
      return canteens.reduce((acc, canteen) => {
        // Canteen-level filtering
        if (
          selectedCafeteria.length > 0 &&
          !selectedCafeteria.includes(canteen.id)
        ) {
          return acc;
        }
        if (filters.withAircon && !filters.noAircon && !canteen.withAirConditioning) {
          return acc;
        }
        if (!filters.withAircon && filters.noAircon && canteen.withAirConditioning) {
          return acc;
        }

        // Process each store in the canteen:
        const stores = canteen.stores.map((store) => {
          const userRating = store.ratings.find(
            (rating) => rating.clientFingerprint === clientFingerprint,
          )?.rating;

          // Filter the menu items for this store
          const filteredMenu = store.menu.filter((menu) => {
            // Price range filter
            if (menu.price < priceRange[0] || menu.price > priceRange[1]) {
              return false;
            }

            // Sub-category filter (example logic)
            let includeItem = false;
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
                  includeItem = filters.others;
              }
            } else if (menu.category === "DRINK") {
              includeItem = filters.beverage;
            } else {
              includeItem = filters.others;
            }

            // If no filters are active, include the item
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

        // Filter out any store that does not have any menu items.
        const visibleStores = stores.filter(
          (store) => store.menu && store.menu.length > 0,
        );

        // Only add the canteen if it has at least one store to display.
        if (visibleStores.length > 0) {
          return [...acc, { ...canteen, stores: visibleStores }];
        }
        return acc;
      }, [] as CanteenWithStores[]);
    }, [canteens, selectedCafeteria, filters, clientFingerprint, priceRange]);

    /**
     * 2. Pagination logic  
     *    - Using only the filtered canteens (which now only include canteens that have visible stores)
     *    - Adjust current page if it’s out-of-bounds
     */
    const [canteensForPage, totalPages] = useMemo(() => {
      if (doPaginationOnMenuCount) {
        let pages: CanteenWithStores[][] = [];
        let currentPageCanteens: CanteenWithStores[] = [];
        let currentMenuItemCount = 0;
        let i = 0;

        while (i < filteredCanteens.length) {
          const canteen = filteredCanteens[i];
          // Sum up the menu item counts across all stores in the canteen
          const totalMenuItems = canteen.stores.reduce(
            (sum, store) => sum + store.menu.length,
            0,
          );

          if (
            currentMenuItemCount + totalMenuItems <= MAX_MENU_ITEMS_PER_PAGE ||
            currentPageCanteens.length === 0 // Always allow at least one canteen per page
          ) {
            currentPageCanteens.push(canteen);
            currentMenuItemCount += totalMenuItems;
            i++;
          } else {
            pages.push(currentPageCanteens);
            currentPageCanteens = [];
            currentMenuItemCount = 0;
          }
        }

        if (currentPageCanteens.length > 0) {
          pages.push(currentPageCanteens);
        }

        const total = pages.length;
        // Make sure the current page is within bounds
        const validCurrentPage = total === 0 ? 1 : Math.max(1, Math.min(currentPage, total));
        return [pages[validCurrentPage - 1] || [], total];
      } else {
        // Fallback pagination
        const startIndex = (currentPage - 1) * DEFAULT_ITEMS_PER_PAGE;
        const endIndex = startIndex + DEFAULT_ITEMS_PER_PAGE;
        return [
          filteredCanteens.slice(startIndex, endIndex),
          Math.ceil(filteredCanteens.length / DEFAULT_ITEMS_PER_PAGE),
        ];
      }
    }, [filteredCanteens, currentPage, doPaginationOnMenuCount]);

    // If the current page is out of bounds, update it.
    useEffect(() => {
      if (totalPages > 0 && currentPage > totalPages) {
        setCurrentPage(totalPages);
      }
    }, [currentPage, totalPages, setCurrentPage]);

    const handlePageChange = useCallback(
      (page: number) => {
        setCurrentPage(page);
      },
      [setCurrentPage],
    );

    useEffect(() => {
      scroll.scrollToTop();
    }, [currentPage]);

    return (
      <div>
        <Grid gap={4}>
          {canteensForPage.length > 0 ? (
            canteensForPage.map((canteen) => (
              <CanteenItem
                key={canteen.id}
                canteen={canteen}
                onUserRatingChange={onUserRatingChange}
              />
            ))
          ) : (
            <Text>No canteens available.</Text>
          )}
        </Grid>

        {totalPages > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    );
  },
);


export default CafeteriaList;
