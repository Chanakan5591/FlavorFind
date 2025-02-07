import {
  Box,
  createListCollection,
  Stack,
  Skeleton,
  useSlider,
  Slider,
  Flex,
  type SliderValueChangeDetails,
  Input,
  HStack,
  type NumberInputValueChangeDetails,
  NumberInputRoot,
  type NumberInputFocusChangeDetails,
} from "@chakra-ui/react";
import type { Route } from "./+types/home";
import prisma from "~/db.server";
import type { CanteenWithStores } from "~/types";
import {
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "~/components/ui/select";
import React, {
  useCallback,
  useEffect,
  useState,
  useTransition,
  useDeferredValue,
} from "react";
import { Await, useFetcher } from "react-router";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { useCookies } from "react-cookie";
import { verifyClientString } from "~/util/hmac.server";
import { toaster } from "~/components/ui/toaster";
import { useFetcherQueueWithPromise } from "~/hooks/MagicFetcher";
import { getClientIPAddress } from "~/util/ip.server";
import { rateLimiterService } from "~/util/ratelimit.server";
import { useAtom } from "jotai";
import { Checkbox } from "~/components/ui/checkbox";
import { selectedCanteensAtom, priceRangeAtom, filtersAtom } from "~/stores";
import { NumberInputField } from "~/components/ui/number-input";

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
  // Note: we still return a promise that resolves to canteens
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
    canteens: canteensPromise.then(), // this returns a promise
  };
}

const LazyCafeteriaList = React.lazy(() => import("~/components/CafeteriaList"));
const LazyPlanDialog = React.lazy(() => import("~/components/PlanDialog"))

export async function action({ request }: Route.ActionArgs) {
  let formData = await request.formData();
  let storeId = formData.get("storeId");
  let newUserRating = formData.get("newRating");
  let hmac = formData.get("hmac") as string;

  const clientIP = getClientIPAddress(request);
  const fingerprint = hmac.split(":")[0];

  const requestAllowed = await rateLimiterService.handleTokenBucketRequest(
    fingerprint,
    clientIP ?? ""
  );

  if (!requestAllowed) {
    return { ok: false, status: 429, body: "Rate limit exceeded" };
  }

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

export default function Home({ loaderData }: Route.ComponentProps) {
  const { canteens } = loaderData; // canteens is now a promise
  const [selectedCanteens, setSelectedCanteens] = useAtom(selectedCanteensAtom);
  const [priceRange, setPriceRange] = useAtom(priceRangeAtom);
  const [filters, setFilters] = useAtom(filtersAtom);
  const [cookies, setCookie] = useCookies(["nomnom"]);

  const [clientFingerprint, setClientFingerprint] = useState("");
  const [firstTime, setFirstTime] = useState(false);

  // *** NEW: local state for canteens ***
  const [localCanteens, setLocalCanteens] = useState<CanteenWithStores[]>([]);

  const hmacFetcher = useFetcher();
  const ratingFetcher = useFetcherQueueWithPromise();

  // React concurrent hooks – useTransition for background work,
  // and useDeferredValue so that heavy recalculation is deferred.
  const [isPending, startTransition] = useTransition();

  // We create deferred versions of our filtering state so that the interactive
  // controls update immediately while the heavy work (e.g. filtering & re‐rendering
  // the list) happens in the background.
  //  const deferredFilters = useDeferredValue(filters);
  const deferredSelectedCanteens = useDeferredValue(selectedCanteens);
  const deferredPriceRange = useDeferredValue(priceRange);

  // Initialize client fingerprint from cookie
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
            { method: "POST", action: "/api/science/new_experiment" }
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

  // --- Update local canteens when a rating update occurs ---
  useEffect(() => {
    if (ratingFetcher.state === "idle" && ratingFetcher.data) {
      if (!ratingFetcher.data.ok) {
        toaster.error({
          title: "An error occurred",
          description:
            "We couldn't update your rating, please try again later",
        });
        return;
      }
      const updatedStore = ratingFetcher.data.new_store as any;

      setLocalCanteens((prevCanteens) =>
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
        })
      );
    }
  }, [ratingFetcher.state, ratingFetcher.data]);

  const onUserRatingChange = async (storeId: string, newRating: number) => {
    const ratingSubmissionPromise = ratingFetcher.enqueueSubmit(
      { storeId: storeId, newRating: newRating, hmac: cookies["nomnom"] },
      { method: "POST" }
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
        description:
          "We couldn't update your rating, please try again later",
      },
    });
  };

  function mapRangeToPercentage(rangeValue: number): number {
    const minRange = 5;
    const maxRange = 150;

    if (rangeValue < minRange || rangeValue > maxRange) {
      throw new Error("Range value must be between 5 and 150");
    }

    const rangeDifference = maxRange - minRange;
    const percentage = ((rangeValue - minRange) / rangeDifference) * 100;

    return Math.round(percentage); // Round for consistency with the original function
  }

  function mapPercentageToRange(percentage: number) {
    if (percentage < 0 || percentage > 100) {
      throw new Error("Percentage must be between 0 and 100");
    }

    const minRange = 5;
    const maxRange = 150;
    const rangeDifference = maxRange - minRange;

    const mappedValue = Math.round(minRange + (percentage / 100) * rangeDifference);

    return mappedValue;
  }

  const [priceSliderValue, setPriceSliderValue] = useState([0, 100]);

  // Here, we update the slider value immediately and then update the
  // actual priceRange in a transition so that the heavy filtering work is deferred.
  const handlePriceRangeChange = useCallback(
    (details: SliderValueChangeDetails) => {
      const newPriceSlider = [details.value[0], Math.max(details.value[1], 31)];
      setPriceSliderValue(newPriceSlider);
      const minPrice = mapPercentageToRange(details.value[0]);
      const maxPrice = Math.max(mapPercentageToRange(details.value[1]), 50);
      startTransition(() => {
        setPriceRange([minPrice, maxPrice]);
      });
    },
    []
  );

  // Initialize the select collection once we have canteens data
  const [canteensCollection, setCanteensCollection] = useState<any>(null);
  const initCanteensCollection = (resolvedCanteens: CanteenWithStores[]) => {
    const collection = createListCollection({
      items: resolvedCanteens,
      itemToString: (canteen: CanteenWithStores) => canteen.name,
      itemToValue: (canteen: CanteenWithStores) => canteen.id,
    });
    setCanteensCollection(collection);
  };

  const priceSlider = useSlider({
    thumbAlignment: "center",
    value: priceSliderValue,
    onValueChange: handlePriceRangeChange,
    //    onValueChangeEnd: handleSliderMouseUp
  })

  const handlePriceMinManualInput = (details: NumberInputValueChangeDetails) => {
    let value = details.valueAsNumber

    if (isNaN(value)) value = 0
    setPriceRange([value, priceRange[1]])
    priceSlider.setValue([mapRangeToPercentage(value), priceSlider.value[1]])
  }

  const handlePriceMaxManualInput = (details: NumberInputValueChangeDetails) => {
    let value = details.valueAsNumber

    if (isNaN(value)) value = 0
    setPriceRange([priceRange[0], value])
    priceSlider.setValue([priceSlider.value[0], mapRangeToPercentage(value)])
  }

  console.log(priceRange)

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
                  // Update immediately in a transition
                  startTransition(() => {
                    setSelectedCanteens(value);
                  });
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
              <Skeleton height="100%" width="100%" />
            )}
          </Box>

          <HStack width="full" alignItems='center'>
            <Slider.RootProvider value={priceSlider} width="full">
              <Slider.Label
                style={{ display: "flex", justifyContent: "space-between", alignItems: 'center' }}
              >
                <span>Price range for each items (฿)</span>

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
          </HStack>
          <HStack>
            <NumberInputRoot
              min={5}
              max={150}
              value={priceRange[0].toString()}
              onValueChange={handlePriceMinManualInput}
            >
              <NumberInputField />
            </NumberInputRoot>
            <NumberInputRoot
              min={50}
              max={150}
              value={priceRange[1].toString()}
              onValueChange={handlePriceMaxManualInput}
            >
              <NumberInputField />
            </NumberInputRoot>

          </HStack>

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
            {/* Example Checkbox – update in a transition so the UI tick is instant while the filtering work is deferred */}
            <Checkbox
              checked={filters.noAircon}
              onCheckedChange={(e) => {
                startTransition(() => {
                  setFilters((prev) => ({
                    ...prev,
                    noAircon: e.checked as boolean,
                  }));
                });
              }}
            >
              ไม่มีแอร์
            </Checkbox>
            <Checkbox
              checked={filters.withAircon}
              onCheckedChange={(e) => {
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
                setFilters((prev) => ({
                  ...prev,
                  others: e.checked as boolean,
                }));
              }}
            >
              อื่นๆ
            </Checkbox>
          </Flex>
          <LazyPlanDialog />
        </Flex>
      </Stack>
      {/* --- Use Suspense and Await for the deferred data --- */}
      <React.Suspense fallback={<Skeleton height="500px" />}>
        <Await
          resolve={canteens}
          errorElement={<div>Could not load canteens.</div>}
        >
          {(resolvedCanteens: CanteenWithStores[]) => {
            // On first resolution, initialize both the select collection and local state.
            if (localCanteens.length === 0) {
              setLocalCanteens(resolvedCanteens);
              initCanteensCollection(resolvedCanteens);
            }
            return (
              <LazyCafeteriaList
                // Pass the local data, and use the deferred filtering state so that the heavy
                // filtering calculation happens in the background.
                canteens={
                  localCanteens.length ? localCanteens : resolvedCanteens
                }
                priceRange={deferredPriceRange}
                selectedCafeteria={deferredSelectedCanteens}
                // filters={deferredFilters}
                onUserRatingChange={onUserRatingChange}
                clientFingerprint={clientFingerprint}
              />
            );
          }}
        </Await>
      </React.Suspense>
    </Box>
  );
}

