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
} from "@chakra-ui/react";
import type { Route } from "./+types/home";
import prisma from "~/db.server";
import CafeteriaList from "~/components/CafeteriaList";
import type { Prisma } from "@prisma/client";
import type { CanteenWithStores } from "~/types";
import {
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "~/components/ui/select";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFetcher, useSubmit } from "react-router";
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

export function meta({}: Route.MetaArgs) {
  return [
    { title: "FlavorFind" },
    {
      name: "description",
      content: "Your central place in planning meals within Mahidol University",
    },
  ];
}

// react router loader
export async function loader({ context }: Route.LoaderArgs) {
  const canteens = await prisma.canteens.findMany({
    include: {
      stores: {
        include: {
          ratings: true,
        },
      },
    },
  });

  return canteens;
}

export async function action({ request }: Route.ActionArgs) {
  let formData = await request.formData();
  let storeId = await formData.get("storeId");
  let newUserRating = await formData.get("newRating");
  let hmac = (await formData.get("hmac")) as string;

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

const MemoizedSelectRoot = React.memo(SelectRoot);

// Jotai atom for loading state
const isLoadingAtom = atom(false);

export default function Home({ loaderData }: Route.ComponentProps) {
  const canteensData = loaderData as CanteenWithStores[];

  const [canteens, setCanteens] = useState(canteensData);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);

  const canteens_collection = useMemo(() => {
    return createListCollection({
      items: canteens,
      itemToString: (canteen: CanteenWithStores) => canteen.name,
      itemToValue: (canteen: CanteenWithStores) => canteen.id,
    });
  }, [canteens]);

  const [selectedCanteens, setSelectedCanteens] = useAtom(selectedCanteensAtom);
  const [priceRange, setPriceRange] = useAtom(priceRangeAtom);
  const [cookies, setCookie] = useCookies(["nomnom", "science"]);

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

    // Calculate the range difference
    const rangeDifference = maxRange - minRange;

    // Map the percentage to the range
    const mappedValue = Math.round(
      minRange + (percentage / 100) * rangeDifference,
    );

    return mappedValue;
  }

  const [priceSliderValue, setPriceSliderValue] = useState([0, 100]);

  const handlePriceRangeChange = useCallback((value: number[]) => {
    setIsLoading(true);

    const minPrice = mapPercentageToRange(value[0]);
    const maxPrice = mapPercentageToRange(value[1]);
    const priceRange = [minPrice, maxPrice];

    setPriceSliderValue(value);
    setPriceRange(priceRange);
  }, []);

  const handleCafeteriaChange = useCallback((value: string[]) => {
    setSelectedCanteens(value);
  }, []);

  const handleSliderMouseUp = useCallback(() => {
    setIsLoading(false);
  }, []);

  const priceSlider = useSlider({
    thumbAlignment: "center",
    value: priceSliderValue,
    onValueChange: (slider) => handlePriceRangeChange(slider.value),
    onValueChangeEnd: () => handleSliderMouseUp(),
  });

  const [filters, setFilters] = useAtom(filtersAtom);

  useEffect(() => {}, [priceSlider.value]);

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
            <SelectRoot
              readOnly={isLoading}
              collection={canteens_collection}
              value={selectedCanteens}
              onValueChange={({ value }) => handleCafeteriaChange(value)}
              rounded="2xl"
              variant="subtle"
              multiple
            >
              <SelectLabel>Select Cafeteria</SelectLabel>
              <SelectTrigger clearable>
                <SelectValueText placeholder="โรงอาหาร" />
              </SelectTrigger>
              <SelectContent>
                {canteens_collection.items.map((canteen) => (
                  <SelectItem item={canteen} key={canteen.id}>
                    {canteen.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
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
          gap={4} // Consistent spacing between checkboxes
          justifyContent="space-between" // Left-aligned on md, centered on base for grid
          alignItems="center" // Vertically align checkboxes in the row (md)
          direction={{ md: "row", base: "column" }}
          w="full" // Take up full width available
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
              onCheckedChange={(e) =>
                setFilters((filters) => ({
                  ...filters,
                  noAircon: e.checked as boolean,
                }))
              }
            >
              ไม่มีแอร์
            </Checkbox>
            <Checkbox
              checked={filters.withAircon}
              onCheckedChange={(e) =>
                setFilters((filters) => ({
                  ...filters,
                  withAircon: e.checked as boolean,
                }))
              }
            >
              มีแอร์
            </Checkbox>
            <Checkbox
              checked={filters.noodles}
              onCheckedChange={(e) =>
                setFilters((filters) => ({
                  ...filters,
                  noodles: e.checked as boolean,
                }))
              }
            >
              ก๋วยเตี๋ยว/เกาเหลา
            </Checkbox>
            <Checkbox
              checked={filters.soup_curry}
              onCheckedChange={(e) =>
                setFilters((filters) => ({
                  ...filters,
                  soup_curry: e.checked as boolean,
                }))
              }
            >
              ต้ม แกง
            </Checkbox>
            <Checkbox
              checked={filters.chicken_rice}
              onCheckedChange={(e) =>
                setFilters((filters) => ({
                  ...filters,
                  chicken_rice: e.checked as boolean,
                }))
              }
            >
              ข้าวมันไก่
            </Checkbox>
            <Checkbox
              checked={filters.rice_curry}
              onCheckedChange={(e) =>
                setFilters((filters) => ({
                  ...filters,
                  rice_curry: e.checked as boolean,
                }))
              }
            >
              ข้าวราดแกง/ข้าวต่างๆ
            </Checkbox>
            <Checkbox
              checked={filters.somtum_northeastern}
              onCheckedChange={(e) =>
                setFilters((filters) => ({
                  ...filters,
                  somtum_northeastern: e.checked as boolean,
                }))
              }
            >
              ส้มตำ อาหารอีสาน
            </Checkbox>
            <Checkbox
              checked={filters.steak}
              onCheckedChange={(e) =>
                setFilters((filters) => ({
                  ...filters,
                  steak: e.checked as boolean,
                }))
              }
            >
              สเต็ก
            </Checkbox>
            <Checkbox
              checked={filters.japanese}
              onCheckedChange={(e) =>
                setFilters((filters) => ({
                  ...filters,
                  japanese: e.checked as boolean,
                }))
              }
            >
              อาหารญี่ปุ่น
            </Checkbox>
            <Checkbox
              checked={filters.others}
              onCheckedChange={(e) =>
                setFilters((filters) => ({
                  ...filters,
                  others: e.checked as boolean,
                }))
              }
            >
              อื่นๆ
            </Checkbox>
          </Flex>
          <PlanDialog />
        </Flex>
      </Stack>
      {isLoading ? (
        <Skeleton height="500px" />
      ) : (
        <CafeteriaList
          canteens={canteens}
          priceRange={priceRange}
          selectedCafeteria={selectedCanteens}
          onUserRatingChange={onUserRatingChange}
          clientFingerprint={clientFingerprint}
        />
      )}
    </Box>
  );
}
