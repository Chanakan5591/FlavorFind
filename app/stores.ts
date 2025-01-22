import { atom } from "jotai";

const selectedCanteensAtom = atom<string[]>([]);
const priceRangeAtom = atom<number[]>([5, 150]);
const mealsPlanningAmountAtom = atom<1 | 2 | 3 | 4 | 5>(5);
const withBeverageAtom = atom(true);
const filtersAtom = atom({
  withAircon: false,
  noAircon: false,
});
const totalPlannedBudgetsAtom = atom<number>(100);

export {
  totalPlannedBudgetsAtom,
  selectedCanteensAtom,
  priceRangeAtom,
  mealsPlanningAmountAtom,
  withBeverageAtom,
  filtersAtom,
};
