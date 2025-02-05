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
import { Box, Flex, Button } from "@chakra-ui/react";
import { Link } from "react-router";

export default function Navbar() {
  return (
    <Box px={4} colorPalette="brand">
      {/* Centered Logo */}
      <Flex h={16} w="full" justifyContent="space-between" alignItems="center">
        <Button visibility='hidden' disabled>Take a Survey</Button>
        <Link to="/">
          <Box
            fontWeight="bold"
            fontSize="xl"
            display="flex"
            alignItems="baseline"
          >
            <Box
              as="span"
              color={{ base: "colorPalette.fg", _dark: "orange.400" }}
            >
              Flavor
            </Box>
            <Box
              as="span"
              color={{ base: "colorPalette.emphasized", _dark: "green.400" }}
            >
              Fin
            </Box>
            <Box
              as="span"
              color={{ base: "colorPalette.emphasized", _dark: "green.400" }}
            >
              <Box
                as="span"
                position="relative"
                _after={{
                  content: '""',
                  position: "absolute",
                  bottom: "2px", // Fine-tune the position
                  left: 0,
                  width: "100%",
                  height: "2px",
                  backgroundColor: { base: "accent.fg", _dark: "green.400" },
                }}
              >
                d
              </Box>
            </Box>
          </Box>
        </Link>
        <Link to='/survey' prefetch="viewport">
          <Button colorPalette='accent'>Take a Survey</Button>
        </Link>

      </Flex>
    </Box>
  );
}
