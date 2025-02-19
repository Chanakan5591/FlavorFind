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
import { env } from "./env/client";
import posthog from "posthog-js";

Sentry.init({
  dsn: env.VITE_SENTRY_DSN,
  tracesSampleRate: 1,
  beforeSend(event, hint) {
    if (event.exception && event.event_id) {
      Sentry.showReportDialog({ eventId: event.event_id });
    }
    return event
  },

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
    posthog.sentryIntegration({
      organization: env.VITE_SENTRY_ORG_SLUG,
      projectId: parseInt(env.VITE_SENTRY_PROJECT_ID),
      severityAllowList: ['error', 'info']
    })
  ],

  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});
