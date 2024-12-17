<Card.Root width='full'>
    <Card.Body gap="2">
        <Card.Title mt="2">Nue Camp</Card.Title>
        <Card.Description>
            This is the card body. Lorem ipsum dolor sit amet, consectetur
            adipiscing elit. Curabitur nec odio vel dui euismod fermentum.
            Curabitur nec odio vel dui euismod fermentum.
        </Card.Description>
    </Card.Body>
    <Card.Footer justifyContent="flex-end">
        <Button variant="outline">View</Button>
        <Button>Join</Button>
    </Card.Footer>
</Card.Root>
import { Box, Card, Grid, GridItem, HStack } from "@chakra-ui/react";
import type { CanteenWithStores } from "~/types";
import { Button } from "./ui/button";

export default function CafeteriaList({
    selectedCafeteria,
    priceRange,
    canteens
}: {
    selectedCafeteria: string;
    priceRange: number[];
    canteens: CanteenWithStores[]
}) {

    // filter canteens by their id, select everything if selectedCafeteria is empty
    canteens = canteens.filter((canteen) => !selectedCafeteria || canteen.id === selectedCafeteria)

    // filter menu by price range
    canteens = canteens.map((canteen) => ({
        ...canteen,
        stores: canteen.stores.map((store) => ({
            ...store,
            menu: store.menu.filter((menu) => menu.price >= priceRange[0] && menu.price <= priceRange[1])
        }))
    }))

    return (
        <Grid gap={4}>
            {canteens.map((canteen) => (
                <GridItem key={canteen.id}>
                    <Card.Root width='full' bg='#f8f6f2'>
                        <Card.Body gap="2">
                            <Card.Title mt="2">{canteen.name}</Card.Title>
                            <Grid gap={4} templateColumns='repeat(2, 1fr)'>
                                {canteen.stores && canteen.stores.length > 0 ? (
                                    canteen.stores.map((store) => (
                                        <GridItem key={store.id}>
                                            <Card.Root width="full" bg='#f2efeb'>
                                                <Card.Body gap="2">
                                                    <Card.Title mt="2">{store.name}</Card.Title>
                                                    <Card.Description>
                                                        {store.description}
                                                    </Card.Description>
                                                    {store.menu && store.menu.length > 0 ? (
                                                        store.menu.map((menu, index) => (
                                                            <HStack justifyContent="space-between" key={index}>
                                                                <span>{menu.name}</span>
                                                                <span>฿{menu.price}</span>
                                                            </HStack>
                                                        ))
                                                    ) : (
                                                        <span>No menu items available.</span>
                                                    )}
                                                </Card.Body>
                                            </Card.Root>
                                        </GridItem>
                                    ))
                                ) : (
                                    <span>No stores available.</span>
                                )}
                            </Grid>
                        </Card.Body>
                        <Card.Footer justifyContent="flex-end">
                            <Button variant="outline">ปุ่ม</Button>
                            <Button>ทำไรดี</Button>
                        </Card.Footer>
                    </Card.Root>
                </GridItem>
            ))}
        </Grid>
    )
}