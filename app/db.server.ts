import { PrismaClient } from '@prisma/client/index.js'
import { env } from './env'

const prisma = new PrismaClient()
export default prisma