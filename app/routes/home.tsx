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
import { useState } from "react";
import { NumberInputField, NumberInputRoot } from "~/components/ui/number-input";

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
      stores: true
    }
  });

  return canteens;
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const canteens = loaderData as CanteenWithStores[];

  // use createListCollection function to extract name from all element in canteens list
  const canteens_collection = createListCollection({
    items: canteens,
    itemToString: (canteen: CanteenWithStores) => canteen.name,
    itemToValue: (canteen: CanteenWithStores) => canteen.id
  });

  const [selectedCafeteria, setCafeteria] = useState([""])
  const [priceRange, setPriceRange] = useState([1, 100])

  return (
    <Box padding={8}>
      <HStack alignItems={'center'} gap={6}>
        <Box width='full' height={24}>
          <SelectRoot collection={canteens_collection} value={selectedCafeteria} onValueChange={({ value }) => setCafeteria(value)}>
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
      <CafeteriaList canteens={canteens} priceRange={priceRange} selectedCafeteria={selectedCafeteria[0]} />
    </Box>
  )
}
