import { Box, Button, createListCollection, HStack } from "@chakra-ui/react";
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
} from "~/components/ui/select"
import { Slider } from "~/components/ui/slider";
import { useEffect, useState } from "react";
import { NumberInputField, NumberInputRoot } from "~/components/ui/number-input";
import { useFetcher, useSubmit } from "react-router";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { useCookies } from 'react-cookie'
import { verifyClientString } from "~/util/hmac.server";
import { toaster } from "~/components/ui/toaster";
import { useFetcherQueueWithPromise } from "~/hooks/MagicFetcher";
import { getClientIPAddress } from "~/util/ip.server";
import { rateLimiterService } from "~/util/ratelimit.server";

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
          ratings: true
        }
      }
    }
  });

  return canteens;
}

export async function action({
  request,
}: Route.ActionArgs) {
  let formData = await request.formData();
  let storeId = await formData.get("storeId");
  let newUserRating = await formData.get("newRating");
  let hmac = await formData.get("hmac") as string;

  const clientIP = getClientIPAddress(request)
  const fingerprint = hmac.split(":")[0]

  const requestAllowed = await rateLimiterService.handleTokenBucketRequest(fingerprint, clientIP ?? '')

  if (!requestAllowed) {
    return { ok: false, status: 429, body: "Rate limit exceeded" }
  }

  // decode HMAC by splitting it by colon, fingerprintingId, hmac, and nonce
  // then verify the HMAC by generating HMAC from fingerprintId and nonce
  const hmac_validated = verifyClientString(hmac)

  if (!hmac_validated) {
    return { ok: false, status: 401, body: "Invalid HMAC" }
  }

  const ratings = await prisma.storeRatings.upsert({
    where: {
      storeId_clientFingerprint: {
        storeId: storeId as string,
        clientFingerprint: hmac.split(":")[0]
      }
    },
    update: {
      rating: parseFloat(newUserRating as string),
    },
    create: {
      storeId: storeId as string,
      rating: parseFloat(newUserRating as string),
      clientFingerprint: hmac.split(":")[0]
    },
    include: {
      store: {
        include: {
          ratings: true
        }
      }
    }
  });

  return { ok: true, new_store: ratings.store };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const canteensData = loaderData as CanteenWithStores[];

  const [canteens, setCanteens] = useState(canteensData);

  // use createListCollection function to extract name from all element in canteens list
  const canteens_collection = createListCollection({
    items: canteens,
    itemToString: (canteen: CanteenWithStores) => canteen.name,
    itemToValue: (canteen: CanteenWithStores) => canteen.id
  });

  const [selectedCafeteria, setCafeteria] = useState([""])
  const [priceRange, setPriceRange] = useState([1, 100])
  const [cookies, setCookie] = useCookies(['nomnom', 'science'])

  const [firstTime, setFirstTime] = useState(false)
  const [clientFingerprint, setClientFingerprint] = useState("")

  let hmacFetcher = useFetcher()
  let ratingFetcher = useFetcherQueueWithPromise()

  useEffect(() => {
    if (cookies['nomnom']) {
      setClientFingerprint(cookies['nomnom'].split(":")[0])
    }
  }, [cookies['nomnom']])

  useEffect(() => {
    if (!cookies['nomnom']) {
      setFirstTime(true)
      FingerprintJS.load().then(fp => {
        fp.get().then(result => {
          hmacFetcher.submit(
            { fingerprint: result.visitorId },
            { method: "POST", action: "/api/science/new_experiment" }
          )
        })
      })
    }
  }, [])

  useEffect(() => {
    if (firstTime && hmacFetcher.state === "idle") {
      if (hmacFetcher.data) {
        const hmac = hmacFetcher.data.hmac as string
        setCookie('nomnom', hmac, { path: '/', sameSite: 'strict' })
        setFirstTime(false)
      }
    }
  }, [hmacFetcher.state])

  useEffect(() => {
    if (ratingFetcher.state === "idle") {
      if (ratingFetcher.data) {
        const updatedStore = ratingFetcher.data as any
        const updatedCanteens = canteens.map(canteen => {
          if (canteen.id === updatedStore.id) {
            return updatedStore
          }
          return canteen
        })
        setCanteens(updatedCanteens)
      }
    }
  }, [ratingFetcher.state])

  const onUserRatingChange = async (storeId: string, newRating: number) => {
    const ratingSubmissionPromise = ratingFetcher.enqueueSubmit(
      { storeId: storeId, newRating: newRating, hmac: cookies['nomnom'] },
      { method: "POST" }
    )

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
    })
  }


  return (
    <Box padding={8} colorPalette='brand'>
      <HStack alignItems={'center'} gap={6}>
        <Box width='full' height={24}>
          <SelectRoot collection={canteens_collection} value={selectedCafeteria} onValueChange={({ value }) => setCafeteria(value)} rounded='2xl' variant='subtle'>
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
        <Box width='full'>
          <Slider label='Specify Price Range' defaultValue={[1, 100]} value={priceRange} onValueChange={({ value }) => setPriceRange(value)} width='full' marks={[
            { value: 0, label: '฿5' },
            { value: 100, label: '฿300' }
          ]} />
        </Box>
      </HStack>
      <CafeteriaList canteens={canteens} priceRange={priceRange} selectedCafeteria={selectedCafeteria[0]} onUserRatingChange={onUserRatingChange} clientFingerprint={clientFingerprint} />
    </Box>
  )
}
