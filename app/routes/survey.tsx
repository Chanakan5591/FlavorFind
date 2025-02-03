import { Box, VStack } from "@chakra-ui/react";

export default function Survey() {
  return (
    <VStack height='100%' display='flex'>
      <iframe style={{
        display: 'flex',
        height: '100%',
        width: '100%'
      }} src="https://docs.google.com/forms/d/e/1FAIpQLSejkgrQWis7ejAMFd2PZwDiquqy2c8VBfIHr1f29fwUKZK4Ew/viewform?embedded=true" frameborder="0" marginheight="0" marginwidth="0">Loading…</iframe>
    </VStack>
  )
}
