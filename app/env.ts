import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
    server: {
        MONGO_URL: z.string().url(),
    },
    clientPrefix: "VITE_",
    client: {

    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
})