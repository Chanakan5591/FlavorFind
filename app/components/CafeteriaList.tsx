import React, { useMemo, useCallback } from 'react';
import { Box, Card, Grid, GridItem, HStack, Text } from "@chakra-ui/react";
import type { CanteenWithStores } from "~/types";
import { Button } from "./ui/button";
import ReviewStars from "./ReviewStars";

// Menu item component
const MenuItem = React.memo(({ menu }: { menu: { name: string; price: number } }) => {
    return (
        <HStack justifyContent="space-between">
            <Text>{menu.name}</Text>
            <Text>฿{menu.price}</Text>
        </HStack>
    );
});

// Menu list component
const MenuList = React.memo(({ menu }: { menu: Array<{ name: string; price: number }> }) => {
    return menu.length > 0 ? (
        <Box>
            {menu.map((item, index) => (
                <MenuItem key={index} menu={item} />
            ))}
        </Box>
    ) : (
        <Text>No menu items available.</Text>
    );
});

// Store item component
const StoreItem = React.memo(({ store, onUserRatingChange }: {
    store: CanteenWithStores["stores"][number] & { userStoreRating: number };
    onUserRatingChange: (storeId: string, newRating: number) => void
}) => {
    return (
        <GridItem key={store.id}>
            <Card.Root width="full" bg="#f2efeb">
                <Card.Body gap="2">
                    <Card.Title mt="2" display="flex" justifyContent="space-between">
                        <Text>{store.name}</Text>
                        <Box>
                            <ReviewStars
                                averageRating={Math.round((store.ratings.reduce((sum, value) => sum + value.rating, 0) / store.ratings.length) * 100) / 100}
                                userRating={store.userStoreRating}
                                storeId={store.id}
                                onRatingChange={(newRating: number) => onUserRatingChange(store.id, newRating)}
                            />
                        </Box>
                    </Card.Title>
                    <Card.Description><Text>{store.description}</Text></Card.Description>
                    <MenuList menu={store.menu} />
                </Card.Body>
            </Card.Root>
        </GridItem>
    );
});

// Canteen item component
const CanteenItem = React.memo(({
    canteen,
    onUserRatingChange
}: {
    canteen: Omit<CanteenWithStores, "stores"> & { stores: StoreWithRating[] };
    onUserRatingChange: (storeId: string, newRating: number) => void;
}) => {
    
    return (
        <GridItem>
            <Card.Root width="full" bg="#f8f6f2">
                <Card.Body gap="2">
                    <Card.Title mt="2"><Text>{canteen.name}</Text></Card.Title>
                    <Grid gap={4} templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}>
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
                <Card.Footer justifyContent="flex-end">
                    <Button variant="outline">ปุ่ม</Button>
                    <Button>ทำไรดี</Button>
                </Card.Footer>
            </Card.Root>
        </GridItem>
    );
});
// Cafeteria list component
const CafeteriaList = React.memo(({
    selectedCafeteria,
    priceRange,
    canteens,
    onUserRatingChange: onUserRatingChangeProp,
    clientFingerprint
}: {
    selectedCafeteria?: string;
    priceRange: number[];
    canteens: CanteenWithStores[];
    onUserRatingChange: (storeId: string, newRating: number) => void;
    clientFingerprint: string;
}) => {
    const onUserRatingChange = useCallback(onUserRatingChangeProp, []);

    const filteredCanteens = useMemo(() => {
        return canteens
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
                        userStoreRating: userRating ?? 0,
                    };
                }),
            }));
    }, [canteens, selectedCafeteria, priceRange, clientFingerprint]);

    return (
        <Grid gap={4}>
            {filteredCanteens.map((canteen) => (
                <CanteenItem 
                    key={canteen.id} 
                    canteen={canteen} 
                    onUserRatingChange={onUserRatingChange} 
                />
            ))}
        </Grid>
    );
});

export default CafeteriaList;