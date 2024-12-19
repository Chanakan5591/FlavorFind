import { Box, Card, Grid, GridItem, HStack } from "@chakra-ui/react";
import type { CanteenWithStores } from "~/types";
import { Button } from "./ui/button";
import ReviewStars from "./ReviewStars";

export default function CafeteriaList({
    selectedCafeteria,
    priceRange,
    canteens,
    onUserRatingChange,
    clientFingerprint
}: {
    selectedCafeteria?: string;
    priceRange: number[];
    canteens: CanteenWithStores[];
    onUserRatingChange: (storeId: string, newRating: number) => void;
    clientFingerprint: string;
}) {
    type Canteen = typeof canteens[number];

    type StoreWithRating = Canteen["stores"][number] & {
        userStoreRating: number;
    };

    type CanteenWithRating = Omit<Canteen, "stores"> & {
        stores: StoreWithRating[];
    };

    // add userStoreRating to each store
    const filteredCanteens: CanteenWithRating[] = canteens
        .filter((canteen) => !selectedCafeteria || canteen.id === selectedCafeteria)
        .map((canteen) => ({
            ...canteen,
            stores: canteen.stores.map((store) => {
                const userRating = store.ratings.find(
                    (rating) => rating.clientFingerprint === clientFingerprint
                )?.rating;

                return {
                    ...store,
                    menu: store.menu.filter(
                        (menu) => menu.price >= priceRange[0] && menu.price <= priceRange[1]
                    ),
                    userStoreRating: userRating ?? 0, // Add the calculated field
                };
            }),
        }));

    return (
        <Grid gap={4}>
            {filteredCanteens.map((canteen) => (
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
                                                    <Card.Title mt="2" display='flex' justifyContent='space-between'>
                                                        {store.name}
                                                        <Box>
                                                            <ReviewStars averageRating={Math.round((store.ratings.reduce((sum, value) => sum + value.rating, 0) / store.ratings.length) * 100) / 100} userRating={store.userStoreRating} storeId={store.id} onRatingChange={(newRating: number) => onUserRatingChange(store.id, newRating)} />
                                                        </Box>
                                                    </Card.Title>
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