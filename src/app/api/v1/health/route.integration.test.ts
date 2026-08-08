import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET } from "@/app/api/v1/health/route";
import { handleGetHealth } from "@/modules/health/health.controller";
import { HealthService } from "@/modules/health/health.service";
import { RedisConnectionChecker } from "@/modules/health/health.redisConnectionChecker";
import { PrismaClient } from "@/generated/prisma/client";
import { prismaClient } from "@/shared/database/prismaClient";
import { redisConnection } from "@/shared/queue/redisConnection";
import type { ConnectionChecker } from "@/modules/health/health.types";

const HTTP_STATUS_OK = 200;
const HTTP_STATUS_SERVICE_UNAVAILABLE = 503;
// Nothing listens here, on localhost, so the connection is refused immediately instead
// of waiting out a real network timeout.
const UNREACHABLE_DATABASE_URL = "postgresql://wrong:wrong@localhost:59999/wrong";

describe("GET /api/v1/health", () => {
  // Prisma and the health-check Redis connection both connect lazily, on first use.
  // Checking them concurrently (see health.service.ts) means their two cold-starts
  // compete for the moment this test file's module graph is first loaded, which can
  // make the very first call report a dependency "down" before either connection has
  // actually finished connecting - a warm-up call establishes both first, the same way
  // `docker-compose.yml`'s own `start_period` grace window absorbs this in production.
  beforeAll(async () => {
    await GET();
  });

  afterAll(async () => {
    await prismaClient.$disconnect();
    redisConnection.disconnect();
  });

  it("returns 200 with a healthy envelope when the database and queue are reachable", async () => {
    const response = await GET();
    const body: unknown = await response.json();

    expect(response.status).toBe(HTTP_STATUS_OK);
    expect(body).toMatchObject({
      status: "success",
      statusCode: HTTP_STATUS_OK,
      message: "Service is healthy",
      data: { database: "up", queue: "up" },
      meta: null,
      errors: null,
      requestId: expect.any(String),
      timestamp: expect.any(String),
    });
    expect(response.headers.get("X-Request-Id")).toBe((body as { requestId: string }).requestId);
  });

  it("inserts a real row in Postgres for every health check", async () => {
    const before = await prismaClient.systemHealthCheck.count();

    await GET();

    const after = await prismaClient.systemHealthCheck.count();
    expect(after).toBe(before + 1);
  });

  it("returns 503 SERVICE_UNAVAILABLE without leaking internal error detail when the database is unreachable", async () => {
    const unreachableAdapter = new PrismaPg({ connectionString: UNREACHABLE_DATABASE_URL });
    const unreachablePrismaClient = new PrismaClient({ adapter: unreachableAdapter });
    const unreachableDatabaseChecker: ConnectionChecker = {
      checkConnection: async () => {
        await unreachablePrismaClient.systemHealthCheck.create({ data: {} });
      },
    };
    const healthService = new HealthService(
      unreachableDatabaseChecker,
      new RedisConnectionChecker(),
    );

    const response = await handleGetHealth(healthService);
    const body: unknown = await response.json();

    expect(response.status).toBe(HTTP_STATUS_SERVICE_UNAVAILABLE);
    expect(body).toMatchObject({
      status: "error",
      statusCode: HTTP_STATUS_SERVICE_UNAVAILABLE,
      data: null,
      errors: [{ field: null, code: "SERVICE_UNAVAILABLE", message: "Database is unreachable" }],
    });
    const serializedBody = JSON.stringify(body);
    expect(serializedBody).not.toMatch(
      /ECONNREFUSED|localhost:59999|PrismaClientInitializationError/i,
    );

    await unreachablePrismaClient.$disconnect();
  });
});
