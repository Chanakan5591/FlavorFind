import { Button, HStack } from "@chakra-ui/react";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

// react router loader
export function loader({ context }: Route.LoaderArgs) {
  return context;
}

export default function Home() {
  return (
    <HStack>
      <Button>halo</Button>
    </HStack>
  )
}
