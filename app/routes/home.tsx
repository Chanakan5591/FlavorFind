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
import {
  Box,
  Button,
  createListCollection,
  HStack,
  Stack,
  useDisclosure,
  Skeleton,
  useSlider,
  Slider,
  Grid,
  Flex,
  type SliderValueChangeDetails,
} from "@chakra-ui/react";
import type { Route } from "./+types/home";
import prisma from "~/db.server";
import CafeteriaList from "~/components/CafeteriaList";
import type { CanteenWithStores } from "~/types";
import {
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "~/components/ui/select";
import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Await, useAsyncValue, useFetcher, useSubmit } from "react-router";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { useCookies } from "react-cookie";
import { verifyClientString } from "~/util/hmac.server";
import { toaster } from "~/components/ui/toaster";
import { useFetcherQueueWithPromise } from "~/hooks/MagicFetcher";
import { getClientIPAddress } from "~/util/ip.server";
import { rateLimiterService } from "~/util/ratelimit.server";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { Checkbox } from "~/components/ui/checkbox";
import { PlanDialog } from "~/components/PlanDialog";
import { selectedCanteensAtom, priceRangeAtom, filtersAtom } from "~/stores";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "FlavorFind" },
    {
      name: "description",
      content: "Your central place in planning meals within Mahidol University",
    },
  ];
}

// react router loader
export function loader({ context }: Route.LoaderArgs) {
  const canteensPromise = prisma.canteens.findMany({
    include: {
      stores: {
        include: {
          ratings: true,
        },
      },
    },
  });

  return {
    canteens: canteensPromise.then()
  };
}

const LazyCafeteriaList = React.lazy(() => import("~/components/CafeteriaList"))

export async function action({ request }: Route.ActionArgs) {
  let formData = await request.formData();
  let storeId = formData.get("storeId");
  let newUserRating = formData.get("newRating");
  let hmac = (formData.get("hmac")) as string;

  const clientIP = getClientIPAddress(request);
  const fingerprint = hmac.split(":")[0];

  const requestAllowed = await rateLimiterService.handleTokenBucketRequest(
    fingerprint,
    clientIP ?? "",
  );

  if (!requestAllowed) {
    return { ok: false, status: 429, body: "Rate limit exceeded" };
  }

  // decode HMAC by splitting it by colon, fingerprintingId, hmac, and nonce
  // then verify the HMAC by generating HMAC from fingerprintId and nonce
  const hmac_validated = verifyClientString(hmac);

  if (!hmac_validated) {
    return { ok: false, status: 401, body: "Invalid HMAC" };
  }

  const ratings = await prisma.storeRatings.upsert({
    where: {
      storeId_clientFingerprint: {
        storeId: storeId as string,
        clientFingerprint: hmac.split(":")[0],
      },
    },
    update: {
      rating: parseFloat(newUserRating as string),
    },
    create: {
      storeId: storeId as string,
      rating: parseFloat(newUserRating as string),
      clientFingerprint: hmac.split(":")[0],
    },
    include: {
      store: {
        include: {
          ratings: true,
        },
      },
    },
  });

  return { ok: true, new_store: ratings.store };
}

// Jotai atom for loading state
const isLoadingAtom = atom(false);

export default function Home({ loaderData }: Route.ComponentProps) {
  const { canteens } = loaderData

  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const [selectedCanteens, setSelectedCanteens] = useAtom(selectedCanteensAtom);
  const [priceRange, setPriceRange] = useAtom(priceRangeAtom);
  const [cookies, setCookie] = useCookies(["nomnom"]);

  const [firstTime, setFirstTime] = useState(false);
  const [clientFingerprint, setClientFingerprint] = useState("");

  let hmacFetcher = useFetcher();
  let ratingFetcher = useFetcherQueueWithPromise();

  useEffect(() => {
    if (cookies["nomnom"]) {
      setClientFingerprint(cookies["nomnom"].split(":")[0]);
    }
  }, [cookies["nomnom"]]);

  useEffect(() => {
    if (!cookies["nomnom"]) {
      setFirstTime(true);
      FingerprintJS.load().then((fp) => {
        fp.get().then((result) => {
          hmacFetcher.submit(
            { fingerprint: result.visitorId },
            { method: "POST", action: "/api/science/new_experiment" },
          );
        });
      });
    }
  }, []);

  useEffect(() => {
    if (firstTime && hmacFetcher.state === "idle") {
      if (hmacFetcher.data) {
        const hmac = hmacFetcher.data.hmac as string;
        setCookie("nomnom", hmac, { path: "/", sameSite: "strict" });
        setFirstTime(false);
      }
    }
  }, [hmacFetcher.state]);

  useEffect(() => {
    if (ratingFetcher.state === "idle" && ratingFetcher.data) {
      if (!ratingFetcher.data.ok) {
        toaster.error({
          title: "An error occurred",
          description: "We couldn't update your rating, please try again later",
        });
        return;
      }
      const updatedStore = ratingFetcher.data.new_store as any;

      setCanteens((prevCanteens) =>
        prevCanteens.map((canteen) => {
          if (canteen.id === updatedStore.canteenId) {
            return {
              ...canteen,
              stores: canteen.stores.map((store) => {
                if (store.id === updatedStore.id) {
                  return updatedStore;
                }
                return store;
              }),
            };
          }
          return canteen;
        }),
      );
    }
  }, [ratingFetcher.state, ratingFetcher.data]);

  const onUserRatingChange = async (storeId: string, newRating: number) => {
    const ratingSubmissionPromise = ratingFetcher.enqueueSubmit(
      { storeId: storeId, newRating: newRating, hmac: cookies["nomnom"] },
      { method: "POST" },
    );

    toaster.promise(ratingSubmissionPromise, {
      success: {
        title: "Rating updated",
        description: "Your rating has been updated successfully",
      },
      loading: {
        title: "Updating rating",
        description: "Please wait while we update your rating",
      },
      error: {
        title: "An error occurred",
        description: "We couldn't update your rating, please try again later",
      },
    });
  };

  function mapPercentageToRange(percentage: number) {
    if (percentage < 0 || percentage > 100) {
      throw new Error("Percentage must be between 0 and 100");
    }

    const minRange = 5;
    const maxRange = 150;
    const rangeDifference = maxRange - minRange;

    const mappedValue = Math.round(
      minRange + (percentage / 100) * rangeDifference,
    );

    return mappedValue;
  }

  const [priceSliderValue, setPriceSliderValue] = useState([0, 100]);

  // --- Slider callbacks (note the callback now receives the updated value array directly) ---
  const handlePriceRangeChange = useCallback(
    (details: SliderValueChangeDetails) => {
      const minPrice = mapPercentageToRange(details.value[0]);
      let maxPrice = Math.max(mapPercentageToRange(details.value[1]), 50);
      const newPriceRange = [details.value[0], Math.max(details.value[1], 31)];
      setPriceSliderValue(newPriceRange);
      setPriceRange([minPrice, maxPrice]);
      // Immediately start the “loading” state for new filter changes.
      setIsLoading(true);
    },
    [setIsLoading, setPriceRange],
  );

  const handleSliderMouseUp = useCallback(() => {
    setIsLoading(false);
  }, [setIsLoading]);

  // Note: useSlider’s onValueChange now provides the value directly.
  const priceSlider = useSlider({
    thumbAlignment: "center",
    value: priceSliderValue,
    onValueChange: handlePriceRangeChange,
    onValueChangeEnd: handleSliderMouseUp,
  });

  const [filters, setFilters] = useAtom(filtersAtom);
  // --- For all filter changes (select, slider, checkboxes) we use a debounce effect
  // to “cancel” previous processing and turn off isLoading after a short delay. ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, selectedCanteens, priceRange, setIsLoading]);

  // --- Handlers for Select and Checkboxes ---
  const handleCafeteriaChange = useCallback(
    (value: string[]) => {
      setIsLoading(true);
      setSelectedCanteens(value);
    },
    [setIsLoading, setSelectedCanteens],
  );

  const [canteensCollection, setCanteensCollection] = useState<any>(null);
  // When the deferred data resolves we can initialize local state if needed.
  const initCanteensCollection = (resolvedCanteens: CanteenWithStores[]) => {
    const collection = createListCollection({
      items: resolvedCanteens,
      itemToString: (canteen: CanteenWithStores) => canteen.name,
      itemToValue: (canteen: CanteenWithStores) => canteen.id,
    });
    setCanteensCollection(collection);
  };



  return (
    <Box padding={8} colorPalette="brand">
      <Stack direction="column">
        <Stack
          alignItems={"center"}
          gapX={{ md: 6 }}
          direction={{ md: "row", base: "column" }}
          mb={{ md: 0, base: 4 }}
        >
          <Box width="full" height={20}>
            {canteensCollection ? (
              <SelectRoot
                collection={canteensCollection}
                value={selectedCanteens}
                onValueChange={({ value }) => {
                  setIsLoading(true);
                  setSelectedCanteens(value);
                }}
                rounded="2xl"
                variant="subtle"
                multiple
              >
                <SelectLabel>Select Cafeteria</SelectLabel>
                <SelectTrigger clearable>
                  <SelectValueText placeholder="โรงอาหาร" />
                </SelectTrigger>
                <SelectContent>
                  {canteensCollection.items.map((canteen: any) => (
                    <SelectItem item={canteen} key={canteen.id}>
                      {canteen.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            ) : (
              // Optionally, you can show a lightweight placeholder until the canteens are ready.
              <Skeleton height="100%" width="100%" />
            )}
          </Box>
          <Box width="full">
            <Slider.RootProvider value={priceSlider} width="full">
              <Slider.Label
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <span>What is your budget?</span>
                <span>
                  ฿{priceRange[0]} - ฿{priceRange[1]}
                </span>
              </Slider.Label>
              <Slider.Control>
                <Slider.Track>
                  <Slider.Range />
                </Slider.Track>
                <Slider.Thumb index={0}>
                  <Slider.HiddenInput />
                </Slider.Thumb>
                <Slider.Thumb index={1}>
                  <Slider.HiddenInput />
                </Slider.Thumb>
              </Slider.Control>
            </Slider.RootProvider>
          </Box>
        </Stack>
        <Flex
          gap={4}
          justifyContent="space-between"
          alignItems="center"
          direction={{ md: "row", base: "column" }}
          w="full"
          mb={4}
        >
          <Flex
            wrap="wrap"
            alignItems="center"
            gap={4}
            justifyContent={{ md: "left", base: "center" }}
          >
            <Checkbox
              checked={filters.noAircon}
              onCheckedChange={(e) => {
                setIsLoading(true);
                setFilters((prev) => ({
                  ...prev,
                  noAircon: e.checked as boolean,
                }));
              }}
            >
              ไม่มีแอร์
            </Checkbox>
            <Checkbox
              checked={filters.withAircon}
              onCheckedChange={(e) => {
                setIsLoading(true);
                setFilters((prev) => ({
                  ...prev,
                  withAircon: e.checked as boolean,
                }));
              }}
            >
              มีแอร์
            </Checkbox>
            <Checkbox
              checked={filters.noodles}
              onCheckedChange={(e) => {
                setIsLoading(true);
                setFilters((prev) => ({
                  ...prev,
                  noodles: e.checked as boolean,
                }));
              }}
            >
              ก๋วยเตี๋ยว/เกาเหลา
            </Checkbox>
            <Checkbox
              checked={filters.soup_curry}
              onCheckedChange={(e) => {
                setIsLoading(true);
                setFilters((prev) => ({
                  ...prev,
                  soup_curry: e.checked as boolean,
                }));
              }}
            >
              ต้ม แกง
            </Checkbox>
            <Checkbox
              checked={filters.chicken_rice}
              onCheckedChange={(e) => {
                setIsLoading(true);
                setFilters((prev) => ({
                  ...prev,
                  chicken_rice: e.checked as boolean,
                }));
              }}
            >
              ข้าวมันไก่
            </Checkbox>
            <Checkbox
              checked={filters.rice_curry}
              onCheckedChange={(e) => {
                setIsLoading(true);
                setFilters((prev) => ({
                  ...prev,
                  rice_curry: e.checked as boolean,
                }));
              }}
            >
              ข้าวราดแกง/ข้าวต่างๆ
            </Checkbox>
            <Checkbox
              checked={filters.somtum_northeastern}
              onCheckedChange={(e) => {
                setIsLoading(true);
                setFilters((prev) => ({
                  ...prev,
                  somtum_northeastern: e.checked as boolean,
                }));
              }}
            >
              ส้มตำ อาหารอีสาน
            </Checkbox>
            <Checkbox
              checked={filters.steak}
              onCheckedChange={(e) => {
                setIsLoading(true);
                setFilters((prev) => ({
                  ...prev,
                  steak: e.checked as boolean,
                }));
              }}
            >
              สเต็ก
            </Checkbox>
            <Checkbox
              checked={filters.japanese}
              onCheckedChange={(e) => {
                setIsLoading(true);
                setFilters((prev) => ({
                  ...prev,
                  japanese: e.checked as boolean,
                }));
              }}
            >
              อาหารญี่ปุ่น
            </Checkbox>
            <Checkbox
              checked={filters.others}
              onCheckedChange={(e) => {
                setIsLoading(true);
                setFilters((prev) => ({
                  ...prev,
                  others: e.checked as boolean,
                }));
              }}
            >
              อื่นๆ
            </Checkbox>
          </Flex>
          <PlanDialog />
        </Flex>
      </Stack>
      <React.Suspense fallback={<Skeleton height="500px" />}>
        <Await
          resolve={canteens}
          errorElement={<div>Could not load canteens.</div>}
        >
          {(resolvedCanteens: CanteenWithStores[]) => {
            // Initialize the select collection once data is available
            if (!canteensCollection) {
              initCanteensCollection(resolvedCanteens);
            }
            return (
              <CafeteriaList
                canteens={resolvedCanteens}
                priceRange={priceRange}
                selectedCafeteria={selectedCanteens}
                onUserRatingChange={(storeId, newRating) =>
                  // your onUserRatingChange callback
                  onUserRatingChange(storeId, newRating)
                }
                clientFingerprint={clientFingerprint}
              />
            );
          }}
        </Await>
      </React.Suspense>
    </Box>
  );
}
