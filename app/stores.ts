/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Copyright 2025 Chanakan Moongthin.
 */
import { atom } from "jotai";

const selectedCanteensAtom = atom<string[]>([]);
const priceRangeAtom = atom<number[]>([5, 150]);
const mealsPlanningAmountAtom = atom<1 | 2 | 3 | 4 | 5>(5);
const withBeverageAtom = atom(true);
const filtersAtom = atom({
  withAircon: false,
  noAircon: false,
  noodles: false,
  soup_curry: false,
  chicken_rice: false,
  rice_curry: false,
  somtum_northeastern: false,
  steak: false,
  japanese: false,
  beverage: false,
  others: false,
});
const totalPlannedBudgetsAtom = atom<number>(300);
const cafeteriaListCurrentPage = atom<number>(1)

export {
  totalPlannedBudgetsAtom,
  selectedCanteensAtom,
  priceRangeAtom,
  mealsPlanningAmountAtom,
  withBeverageAtom,
  filtersAtom,
  cafeteriaListCurrentPage
};
