import * as Sentry from "@sentry/remix";
import { startTransition, StrictMode, useEffect } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import posthog from "posthog-js";
import { useLocation, useMatches } from "react-router";

Sentry.init({
  dsn: "https://5b08660faae9b1be3cd21a9c36c3f618@o4504890693910528.ingest.us.sentry.io/4508726746480640",
  tracesSampleRate: 1,

  integrations: [
    Sentry.browserTracingIntegration({
      useEffect,
      useLocation,
      useMatches,
    }),
  ],
});

function PosthogInit() {
  useEffect(() => {
    posthog.init("phc_AwQZEW3Yh9UUfq69ca8UCRIwwRezP2A02YLW1r6K7eH", {
      api_host: "https://us.i.posthog.com",
      person_profiles: "always", // or 'always' to create profiles for anonymous users as well
    });
  }, []);

  return null;
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
      <PosthogInit />
    </StrictMode>,
  );
});
