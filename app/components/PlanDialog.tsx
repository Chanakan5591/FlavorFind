import { Button } from "./ui/button";
import { useState, useRef, useEffect } from "react";
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
import { Box, Collapsible, Flex, Grid, Input, Text } from "@chakra-ui/react";
import { useFetcher, useNavigate } from "react-router";
import { useForm, type SubmitHandler } from "react-hook-form";
import { useAtomValue } from "jotai";
import { createId } from "@paralleldrive/cuid2";
import pako from "pako";
import posthog from "posthog-js";
import { useCookies } from "react-cookie";

type Inputs = {
  meals: Array<{
    date: string;
    time: string;
  }>;
  withBeverage: boolean;
};

export function PlanDialog() {
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

  const validMealsPlanningAmount =
    typeof mealsPlanningAmount === "number" && !isNaN(mealsPlanningAmount)
      ? Math.max(0, Math.min(mealsPlanningAmount, 5))
      : 0;

  const onPlanSubmit: SubmitHandler<Inputs> = async (data) => {
    console.log(data);
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

    let tmp = {};

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
          acc["mD"] = "";
          acc["mT"] = "";
          if (mealsDate.length > 0) {
            acc["mD"] = `'${mealsDate.join("|")}'`;
          }
          if (mealsTime.length > 0) {
            acc["mT"] = `'${mealsTime.join("|")}'`;
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

    async function compressAndEncode(str: string) {
      // 1. Convert the string to a Uint8Array
      const uint8Array = new TextEncoder().encode(str);

      const compressed = pako.deflate(uint8Array);

      // 3. Encode the compressed Uint8Array to URL-safe Base64
      const base64 = btoa(String.fromCharCode(...compressed))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      return base64;
    }

    const encodedParam = await compressAndEncode(newPlanParams);

    posthog.capture("user_planned_meal", {
      client: cookies["nomnom"],
      param: encodedParam,
    });

    navigate(`/plan/${encodedParam}/${createId()}`);
  };

  // Use refs to store the last valid values
  const lastValidMealsPlanningAmount = useRef(mealsPlanningAmount);
  const lastValidTotalPlannedBudgets = useRef(totalPlannedBudgets);

  // Function to handle input change with debouncing
  const handleInputChange = (
    setter: (value: number) => void,
    lastValidValueRef: React.MutableRefObject<number>,
    min: number,
    max: number,
  ) => {
    let timeoutId: NodeJS.Timeout;
    return (e: { value: string }) => {
      clearTimeout(timeoutId);
      const inputValue = e.value;

      timeoutId = setTimeout(() => {
        const parsedValue = parseInt(inputValue);
        if (!isNaN(parsedValue) && parsedValue >= min && parsedValue <= max) {
          setter(parsedValue);
          lastValidValueRef.current = parsedValue;
        } else {
          setter(lastValidValueRef.current);
        }
      }, 500); // 500ms debounce time
    };
  };

  // Update refs when the atom values change
  useEffect(() => {
    lastValidMealsPlanningAmount.current = mealsPlanningAmount;
  }, [mealsPlanningAmount]);

  useEffect(() => {
    lastValidTotalPlannedBudgets.current = totalPlannedBudgets;
  }, [totalPlannedBudgets]);

  const userClickedPlan = () => {
    posthog.capture("user_clicked_plan", {
      client: cookies["nomnom"],
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
                  min={1}
                  max={5}
                  value={mealsPlanningAmount.toString()}
                  onValueChange={handleInputChange(
                    setMealsPlanningAmount,
                    lastValidMealsPlanningAmount,
                    1,
                    5,
                  )}
                >
                  <NumberInputField
                    value={lastValidMealsPlanningAmount.current}
                  />
                </NumberInputRoot>
              </Field>
              <Field
                label="Total Budgets (฿)"
                errorText="The entry is invalid"
                mb={4}
                required
              >
                <NumberInputRoot
                  min={5}
                  max={1000}
                  value={totalPlannedBudgets.toString()}
                  onValueChange={handleInputChange(
                    setTotalPlannedBudgets,
                    lastValidTotalPlannedBudgets,
                    5,
                    1000,
                  )}
                >
                  <NumberInputField
                    value={lastValidTotalPlannedBudgets.current}
                  />
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
                  {[...Array(Math.min(validMealsPlanningAmount, 5))].map(
                    (_, index) => (
                      <>
                        <Field
                          key={`mealdate_${index}`}
                          label={`Meal ${index + 1} Date`}
                          errorText="The entry is invalid"
                        >
                          <Input
                            {...register(`meals.${index}.date` as const)}
                            type="date"
                          />
                        </Field>
                        <Field
                          key={`mealtime_${index}`}
                          label={`Meal ${index + 1} Time`}
                          errorText="The entry is invalid"
                        >
                          <Input
                            {...register(`meals.${index}.time` as const)}
                            type="time"
                          />
                        </Field>
                      </>
                    ),
                  )}
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
            <Switch colorPalette="brand.solid" {...register("withBeverage")}>
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
