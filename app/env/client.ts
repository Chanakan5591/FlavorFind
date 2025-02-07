import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_POSTHOG_KEY: z.string().min(1),
    VITE_SENTRY_DSN: z.string().min(1)
  },
  runtimeEnv: import.meta.env,
});
