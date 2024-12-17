import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'
import { env } from './env'

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: env.DATABASE_URL,
        },
    },
}).$extends(withAccelerate())
export default prisma