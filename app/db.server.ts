import { PrismaClient } from "@prisma/ffdb";
import { env } from "./env";

const prisma = new PrismaClient();
export default prisma;
