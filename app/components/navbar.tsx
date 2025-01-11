import { Box, Flex, Button } from '@chakra-ui/react';
import { Link } from 'react-router';

export default function Navbar() {
  return (
    <Box px={4} colorPalette='brand'>
      <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
        {/* Left Placeholder (Invisible) */}
        <Box w="auto" visibility="hidden">
          <Button size={'sm'} disabled={true}>
            Find Flavors!
          </Button>
        </Box>

        {/* Centered Logo */}
        <Flex w="full" justifyContent="center" alignItems="center">
          <Link to="/">
            <Box
              fontWeight="bold"
              fontSize="xl"
              display="flex"
              alignItems="baseline"
            >
              <Box as="span" color={{ base: 'colorPalette.fg', _dark: 'orange.400' }}>
                Flavor
              </Box>
              <Box as="span" color={{ base: 'colorPalette.emphasized', _dark: 'green.400' }}>
                Fin
              </Box>
              <Box as="span" color={{ base: 'colorPalette.emphasized', _dark: 'green.400' }}>
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
                    backgroundColor: { base: 'accent.fg', _dark: 'green.400' },
                  }}
                >
                  d
                </Box>
              </Box>
            </Box>
          </Link>
        </Flex>

        {/* Right-aligned Button */}
        <Button size={'sm'} colorPalette='accent'>
          Find Flavors!
        </Button>
      </Flex>
    </Box>
  );
}