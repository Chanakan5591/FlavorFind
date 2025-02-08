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
import { Button } from "./ui/button";
import React, { useState, useRef, useEffect } from "react";
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  NumberInputField,
  NumberInputLabel,
  NumberInputRoot,
} from "./ui/number-input";
import { Field } from "./ui/field";
import { Switch } from "./ui/switch";
import { useAtom } from "jotai";
import {
  mealsPlanningAmountAtom,
  selectedCanteensAtom,
  priceRangeAtom,
  filtersAtom,
  totalPlannedBudgetsAtom,
} from "~/stores";
import {
  Box,
  Collapsible,
  Flex,
  Grid,
  Input,
  Text,
  type NumberInputValueChangeDetails,
} from "@chakra-ui/react";
import { useFetcher, useNavigate } from "react-router";
import { useForm, type SubmitHandler } from "react-hook-form";
import { useAtomValue } from "jotai";
import { createId } from "@paralleldrive/cuid2";
import posthog from "posthog-js";
import { useCookies } from "react-cookie";
import { useId } from "react";
import { deflate } from "pako";

interface Inputs {
  meals: {
    date: string;
    time: string;
  }[];
  withBeverage: boolean;
}

export default function PlanDialog() {
  const [withBeverage, setWithBeverage] = useState(true);
  const [mealsPlanningAmount, setMealsPlanningAmount] = useAtom(
    mealsPlanningAmountAtom,
  );
  const [totalPlannedBudgets, setTotalPlannedBudgets] = useAtom(
    totalPlannedBudgetsAtom,
  );
  const selectedCanteens = useAtomValue(selectedCanteensAtom);
  const priceRange = useAtomValue(priceRangeAtom);
  const filters = useAtomValue(filtersAtom);

  const fetcher = useFetcher();
  const navigate = useNavigate();

  const [cookies, setCookies] = useCookies(["nomnom"]);

  const id = useId();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Inputs>({
    defaultValues: {
      meals: [],
      withBeverage: true,
    },
  });

  function uint8ArrayToBase64url(uint8Array: Uint8Array) {
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  const onPlanSubmit: SubmitHandler<Inputs> = async (data) => {
    let formDataToSend = {
      ...data,
      mealsPlanningAmount,
      selectedCanteens,
      priceRange,
      withBeverage,
      totalPlannedBudgets,
    };

    // append filters to the form data
    formDataToSend = Object.assign(formDataToSend, filters);

    // Preprocess the object:
    const preprocessedData = Object.entries(formDataToSend).reduce(
      (acc, [key, value]) => {
        // 1. Convert true to 1 and false to 0
        const processedValue = value === true ? 1 : value === false ? 0 : value;

        // 2. Abbreviate keys (same as before)
        const newKey = key
          .split("")
          .filter((char, index) => index === 0 || char === char.toUpperCase())
          .join("");

        if (key === "meals") {
          const mealsDate: string[] = [];
          const mealsTime: string[] = [];
          value.forEach(
            (meal: { date: string; time: string }, index: number) => {
              if (meal.date) {
                mealsDate.push(`${index}#${meal.date}`);
              }
              if (meal.time) {
                mealsTime.push(`${index}#${meal.time}`);
              }
            },
          );
          acc.mD = "";
          acc.mT = "";
          if (mealsDate.length > 0) {
            acc.mD = `'${mealsDate.join("|")}'`;
          }
          if (mealsTime.length > 0) {
            acc.mT = `'${mealsTime.join("|")}'`;
          }
        } else {
          acc[newKey] = processedValue;
        }

        return acc;
      },
      {},
    );

    // Convert to string, compress with Brotli, and then Base64 encode:
    const newPlanParams = Object.entries(preprocessedData)
      .map(([key, value]) => `${key}=${value}`)
      .join(";");

    const deflated = deflate(newPlanParams)
    const encodedParam = uint8ArrayToBase64url(deflated);
    console.log(encodedParam)

    posthog.capture("user_planned_meal", {
      client: cookies.nomnom,
      param: encodedParam,
    });

    const path = `/plan/${encodedParam}/${createId()}`
    navigate(path);
  };

  // // Function to handle input change
  const handleInputChange = (
    setter: (value: number) => void,
    min: number,
    max: number,
  ) => {
    return (detail: NumberInputValueChangeDetails) => {
      const parsed = detail.valueAsNumber;
      if (!isNaN(parsed) && parsed >= min && parsed <= max) {
        setter(parsed);
      } else if (detail.value === "" || detail.value === "-") {
        setter(min);
      }
    };
  };
  const userClickedPlan = () => {
    posthog.capture("user_clicked_plan", {
      client: cookies.nomnom,
    });
  };

  return (
    <DialogRoot>
      <DialogTrigger asChild>
        <Button onClick={userClickedPlan}>Plan a Meal</Button>
      </DialogTrigger>

      <DialogContent>
        <fetcher.Form onSubmit={handleSubmit(onPlanSubmit)}>
          <DialogHeader>
            <DialogTitle>Plan a Meal</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Grid templateColumns="repeat(2, 1fr)" gap="1rem">
              <Field
                label="Amount of Meals to plan"
                errorText="The entry is invalid"
                mb={4}
                required
              >
                <NumberInputRoot
                  value={mealsPlanningAmount.toString()}
                  min={1}
                  max={5}
                  onValueChange={handleInputChange(
                    setMealsPlanningAmount,
                    1,
                    5,
                  )}
                >
                  <NumberInputField />
                </NumberInputRoot>
              </Field>

              <Field
                label="Total Budgets (฿)"
                errorText="The entry is invalid"
                mb={4}
                required
              >
                <NumberInputRoot
                  value={totalPlannedBudgets.toString()}
                  min={5}
                  max={1000}
                  onValueChange={handleInputChange(
                    setTotalPlannedBudgets,
                    0,
                    1000,
                  )}
                >
                  <NumberInputField />
                </NumberInputRoot>
              </Field>
            </Grid>

            <Collapsible.Root>
              <Collapsible.Trigger
                paddingY="3"
                cursor="pointer"
                textDecor="underline"
              >
                เลือกช่วงเวลามื้ออาหาร
              </Collapsible.Trigger>

              <Collapsible.Content>
                <Grid templateColumns="repeat(2, 1fr)" gap="1rem">
                  {[...Array(mealsPlanningAmount)].map((_, index) => (
                    <React.Fragment key={`meal_${index}`}>
                      <Field
                        label={`Meal ${index + 1} Date`}
                        errorText="The entry is invalid"
                      >
                        <Input
                          {...register(`meals.${index}.date` as const)}
                          type="date"
                        />
                      </Field>
                      <Field
                        label={`Meal ${index + 1} Time`}
                        errorText="The entry is invalid"
                      >
                        <Input
                          {...register(`meals.${index}.time` as const)}
                          type="time"
                        />
                      </Field>
                    </React.Fragment>
                  ))}
                </Grid>
              </Collapsible.Content>
              <Text as="span" ml={2} color="gray.500">
                <br />
                หากปล่อยว่างจะทำการเลือกร้านอาหารโดยไม่คำนึงถึงเวลา
              </Text>
            </Collapsible.Root>
          </DialogBody>
          <DialogFooter
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Switch
              colorPalette="brand.solid"
              checked={withBeverage}
              onCheckedChange={(e) => { setWithBeverage(e.checked); }}
              {...register("withBeverage")}
            >
              With Beverage
            </Switch>
            <Flex gapX={2}>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </DialogActionTrigger>
              <Button type="submit">Plan</Button>
            </Flex>
          </DialogFooter>
        </fetcher.Form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  );
}
