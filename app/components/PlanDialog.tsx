import { Button } from "./ui/button";
import { useState } from "react";
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
import { mealsPlanningAmountAtom } from "~/stores";
import { Grid, Input, Text } from "@chakra-ui/react";

export function PlanDialog() {
  const [withBeverage, setWithBeverage] = useState(true);

  const [mealsPlanningAmount, setMealsPlanningAmount] = useAtom(
    mealsPlanningAmountAtom,
  );

  const validMealsPlanningAmount =
    typeof mealsPlanningAmount === "number" && !isNaN(mealsPlanningAmount)
      ? Math.max(0, Math.min(mealsPlanningAmount, 5))
      : 0;

  return (
    <DialogRoot>
      <DialogTrigger asChild>
        <Button>Plan a Meal</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plan a Meal</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form
            style={{
              display: "grid",
              gap: "1rem",
            }}
          >
            <Field
              label="Amount of Meals to plan"
              errorText="The entry is invalid"
            >
              <NumberInputRoot
                defaultValue="5"
                min={1}
                max={5}
                onValueChange={(e) =>
                  setMealsPlanningAmount(parseInt(e.value) as 1 | 2 | 3 | 4 | 5)
                }
              >
                <NumberInputField value={mealsPlanningAmount} />
              </NumberInputRoot>
            </Field>

            {/* iterate `mealsPlanningAmount` time to render inputbox */}
            <Grid gap={4} templateColumns="repeat(2, 1fr)">
              {[...Array(Math.min(validMealsPlanningAmount, 5))].map(
                (_, index) => (
                  <Field
                    key={index}
                    label={`Meal ${index + 1}`}
                    errorText="The entry is invalid"
                  >
                    <Input type="time" />
                  </Field>
                ),
              )}
            </Grid>

            <Switch
              colorPalette="brand.solid"
              checked={withBeverage}
              onCheckedChange={(e) => setWithBeverage(e.checked)}
            >
              With Beverage
            </Switch>
          </form>
        </DialogBody>
        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button variant="outline">Cancel</Button>
          </DialogActionTrigger>
          <Button>Plan</Button>
        </DialogFooter>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  );
}
