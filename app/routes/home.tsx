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
import { atom, useAtom } from "jotai";
import { Checkbox } from "~/components/ui/checkbox";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
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

  const [selectedCafeteria, setCafeteria] = useState([] as string[]);
  const [priceRange, setPriceRange] = useState([1, 100]);
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

  const handlePriceRangeChange = useCallback((value: number[]) => {
    setIsLoading(true);

    const minPrice = mapPercentageToRange(value[0]);
    const maxPrice = mapPercentageToRange(value[1]);
    const priceRange = [minPrice, maxPrice];

    setPriceRange(priceRange);
  }, []);

  const handleCafeteriaChange = useCallback((value: string[]) => {
    setCafeteria(value);
  }, []);

  const handleSliderMouseUp = useCallback(() => {
    setIsLoading(false);
  }, []);

  const priceSlider = useSlider({
    defaultValue: [0, 100],
    thumbAlignment: "center",
    onValueChange: (slider) => handlePriceRangeChange(slider.value),
    onValueChangeEnd: () => handleSliderMouseUp(),
  });

  useEffect(() => { }, [priceSlider.value]);

  return (
    <Box padding={8} colorPalette="brand">
      <Stack
        direction="column"
        mb={4}>

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
              value={selectedCafeteria}
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
        <Stack
          alignItems={"center"}
          gapX={{ md: 6 }}
          direction={{ md: "row", base: "column" }}
          mb={{ md: 0, base: 4 }}
        >
          <Flex gapX={4} alignItems="center">
            <Checkbox checked>ไม่มีแอร์</Checkbox>
            <Checkbox checked>มีแอร์</Checkbox>
          </Flex>
        </Stack>
      </Stack>
      {isLoading ? (
        <Skeleton height="500px" />
      ) : (
        <CafeteriaList
          canteens={canteens}
          priceRange={priceRange}
          selectedCafeteria={selectedCafeteria}
          onUserRatingChange={onUserRatingChange}
          clientFingerprint={clientFingerprint}
        />
      )}
    </Box>
  );
}
