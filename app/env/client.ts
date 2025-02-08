import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_POSTHOG_HOST: z.string(),
    VITE_POSTHOG_KEY: z.string(),
  },
  shared: {
    VITE_SENTRY_DSN: z.string(),
    VITE_SENTRY_ORG_SLUG: z.string(),
    VITE_SENTRY_PROJECT_ID: z.string()
  },
  runtimeEnv: import.meta.env,
});
