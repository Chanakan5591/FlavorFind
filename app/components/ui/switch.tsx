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
import { Switch as ChakraSwitch } from "@chakra-ui/react"
import * as React from "react"

export interface SwitchProps extends ChakraSwitch.RootProps {
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
  rootRef?: React.Ref<HTMLLabelElement>
  trackLabel?: { on: React.ReactNode; off: React.ReactNode }
  thumbLabel?: { on: React.ReactNode; off: React.ReactNode }
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  function Switch(props, ref) {
    const { inputProps, children, rootRef, trackLabel, thumbLabel, ...rest } =
      props

    return (
      <ChakraSwitch.Root ref={rootRef} {...rest}>
        <ChakraSwitch.HiddenInput ref={ref} {...inputProps} />
        <ChakraSwitch.Control>
          <ChakraSwitch.Thumb>
            {thumbLabel && (
              <ChakraSwitch.ThumbIndicator fallback={thumbLabel?.off}>
                {thumbLabel?.on}
              </ChakraSwitch.ThumbIndicator>
            )}
          </ChakraSwitch.Thumb>
          {trackLabel && (
            <ChakraSwitch.Indicator fallback={trackLabel.off}>
              {trackLabel.on}
            </ChakraSwitch.Indicator>
          )}
        </ChakraSwitch.Control>
        {children != null && (
          <ChakraSwitch.Label>{children}</ChakraSwitch.Label>
        )}
      </ChakraSwitch.Root>
    )
  },
)
