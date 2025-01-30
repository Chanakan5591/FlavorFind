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
import * as Sentry from "@sentry/react";
import { startTransition, StrictMode, useEffect } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import posthog from "posthog-js";
import { useLocation, useMatches } from "react-router";

Sentry.init({
  dsn: "https://5b08660faae9b1be3cd21a9c36c3f618@o4504890693910528.ingest.us.sentry.io/4508726746480640",
  tracesSampleRate: 1,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration()
  ],

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
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
