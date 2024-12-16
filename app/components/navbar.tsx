import { Box, Flex, Button } from '@chakra-ui/react';
import { Link } from 'react-router';

export default function Navbar() {
  return (
    <Box px={4}>
      <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
        {/* Left Placeholder (Invisible) */}
        <Box w="auto" visibility="hidden">
          <Button size={'sm'} disabled={true}>
            Find New Flavors
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
              <Box as="span" color={{ base: 'orange.600', _dark: 'orange.400' }}>
                Flavor
              </Box>
              <Box as="span" color={{ base: 'brown.800', _dark: 'green.400' }}>
                Fin
              </Box>
              <Box as="span" color={{ base: 'brown.800', _dark: 'green.400' }} ml="1px" mt="2px">
                <Box
                  as="span"
                  borderBottom="2px solid"
                  borderColor={{
                    base: 'green.600',
                    _dark: 'green.400',
                  }}
                >
                  d
                </Box>
              </Box>
            </Box>
          </Link>
        </Flex>

        {/* Right-aligned Button */}
        <Button size={'sm'}>
          Find New Flavors
        </Button>
      </Flex>
    </Box>
  );
}