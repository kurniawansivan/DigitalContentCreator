import { Redis } from "ioredis";
import { environmentConfig } from "@/shared/config/env";

export const redisConnection = new Redis(environmentConfig.REDIS_URL, {
  maxRetriesPerRequest: null,
});
