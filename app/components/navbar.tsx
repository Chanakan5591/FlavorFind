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
              <Box as="span" color="gray.800">
                FlavorFin
              </Box>
              <Box as="span" color="gray.800" ml="1px" mt="2px">
                <Box
                  as="span"
                  borderBottom="2px solid"
                  borderColor="orange.400"
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