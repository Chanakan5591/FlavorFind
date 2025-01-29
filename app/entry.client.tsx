import { startTransition, StrictMode, useEffect } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import posthog from 'posthog-js'

function PosthogInit() {
  useEffect(() => {
    posthog.init('phc_AwQZEW3Yh9UUfq69ca8UCRIwwRezP2A02YLW1r6K7eH', {
      api_host: 'https://us.i.posthog.com',
      person_profiles: 'always', // or 'always' to create profiles for anonymous users as well
    });
  }, [])

  return null
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
      <PosthogInit />
    </StrictMode>
  );
});
