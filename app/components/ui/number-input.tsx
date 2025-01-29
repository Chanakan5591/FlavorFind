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
import { NumberInput as ChakraNumberInput } from "@chakra-ui/react"
import * as React from "react"

export interface NumberInputProps extends ChakraNumberInput.RootProps {}

export const NumberInputRoot = React.forwardRef<
  HTMLDivElement,
  NumberInputProps
>(function NumberInput(props, ref) {
  const { children, ...rest } = props
  return (
    <ChakraNumberInput.Root ref={ref} variant="outline" {...rest}>
      {children}
      <ChakraNumberInput.Control>
        <ChakraNumberInput.IncrementTrigger />
        <ChakraNumberInput.DecrementTrigger />
      </ChakraNumberInput.Control>
    </ChakraNumberInput.Root>
  )
})

export const NumberInputField = ChakraNumberInput.Input
export const NumberInputScruber = ChakraNumberInput.Scrubber
export const NumberInputLabel = ChakraNumberInput.Label
