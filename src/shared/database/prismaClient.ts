import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { environmentConfig } from "@/shared/config/env";

const adapter = new PrismaPg({ connectionString: environmentConfig.DATABASE_URL });

export const prismaClient = new PrismaClient({ adapter });
