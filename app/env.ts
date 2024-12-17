import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
    server: {
        DATABASE_URL: z.string().url().startsWith("prisma://"), // enforce use of Prisma Accelerate
        DIRECT_DATABASE_URL: z.string().url()
    },
    clientPrefix: "VITE_",
    client: {

    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
})
