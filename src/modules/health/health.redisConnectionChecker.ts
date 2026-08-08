import { Redis } from "ioredis";
import { environmentConfig } from "@/shared/config/env";
import type { ConnectionChecker } from "@/modules/health/health.types";

const CONNECT_TIMEOUT_MS = 2000;

/**
 * Deliberately its own connection, not the shared `redisConnection` BullMQ uses.
 * BullMQ needs `maxRetriesPerRequest: null`, which also means a command issued while
 * disconnected queues in memory and waits indefinitely instead of failing - exactly
 * wrong for a health check. `enableOfflineQueue: false` here makes a `.ping()` issued
 * while disconnected fail immediately, so `withTimeout` in HealthService is a backstop
 * for a slow response, not the only defense against a hung one.
 */
const healthCheckRedisConnection = new Redis(environmentConfig.REDIS_URL, {
  enableOfflineQueue: false,
  connectTimeout: CONNECT_TIMEOUT_MS,
  maxRetriesPerRequest: 1,
});

healthCheckRedisConnection.on("error", () => {
  // ioredis requires an "error" listener or it crashes the process on connection
  // failure; HealthService already logs and reports "down" for this dependency.
});

export class RedisConnectionChecker implements ConnectionChecker {
  async checkConnection(): Promise<void> {
    await healthCheckRedisConnection.ping();
  }
}
