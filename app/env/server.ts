import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    HMAC_SECRET_KEY: z.string(),
    REDIS_URL: z.string().url().startsWith("rediss://"),
    SENTRY_AUTH_TOKEN: z.string()
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
