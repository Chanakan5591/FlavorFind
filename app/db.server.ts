import { PrismaClient } from '@prisma/client'
import { env } from './env'

const prisma = new PrismaClient()
export default prisma