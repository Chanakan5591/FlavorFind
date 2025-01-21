import { atom } from "jotai";

const selectedCanteensAtom = atom<string[]>([]);
const priceRangeAtom = atom<number[]>([0, 100]);
const airConditioningTypeAtom = atom<"with" | "without" | "both">("both");
const mealsPlanningAmountAtom = atom<1 | 2 | 3 | 4 | 5>(5);
const withBeverageAtom = atom(true);
const filtersAtom = atom({
  withAircon: false,
  withoutAircon: false,
});
const totalPlannedBudgetsAtom = atom<number>(100);

export {
  totalPlannedBudgetsAtom,
  selectedCanteensAtom,
  priceRangeAtom,
  airConditioningTypeAtom,
  mealsPlanningAmountAtom,
  withBeverageAtom,
  filtersAtom,
};
