import { PrismaClient } from '@prisma/client/edge'
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