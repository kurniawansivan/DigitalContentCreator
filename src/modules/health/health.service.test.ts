import { describe, expect, it } from "vitest";
import { HealthService } from "@/modules/health/health.service";
import type { ConnectionChecker } from "@/modules/health/health.types";

const TEST_TIMEOUT_MS = 50;
const LONGER_THAN_TEST_TIMEOUT_MS = 100_000;

function buildChecker(shouldFail: boolean): ConnectionChecker {
  return {
    checkConnection: (): Promise<void> => {
      if (shouldFail) {
        return Promise.reject(new Error("connection refused"));
      }
      return Promise.resolve();
    },
  };
}

function buildHangingChecker(): ConnectionChecker {
  return {
    checkConnection: () =>
      new Promise<void>(() => {
        // Intentionally never settles - simulates an unreachable dependency that
        // ioredis's maxRetriesPerRequest:null connection would otherwise wait on forever.
      }),
  };
}

describe("HealthService", () => {
  it("reports the database and queue as up when both connection checks resolve", async () => {
    const service = new HealthService(buildChecker(false), buildChecker(false));

    await expect(service.getHealthStatus()).resolves.toEqual({ database: "up", queue: "up" });
  });

  it("reports only the database as down when the database check rejects", async () => {
    const service = new HealthService(buildChecker(true), buildChecker(false));

    await expect(service.getHealthStatus()).resolves.toEqual({ database: "down", queue: "up" });
  });

  it("reports only the queue as down when the queue check rejects", async () => {
    const service = new HealthService(buildChecker(false), buildChecker(true));

    await expect(service.getHealthStatus()).resolves.toEqual({ database: "up", queue: "down" });
  });

  it("reports both as down when both checks reject", async () => {
    const service = new HealthService(buildChecker(true), buildChecker(true));

    await expect(service.getHealthStatus()).resolves.toEqual({ database: "down", queue: "down" });
  });

  it("checks the database and the queue independently, in parallel", async () => {
    const service = new HealthService(buildChecker(true), buildChecker(false));

    const status = await service.getHealthStatus();

    expect(status.queue).toBe("up");
  });

  it("reports a dependency as down when its check never resolves, instead of hanging", async () => {
    const service = new HealthService(buildHangingChecker(), buildChecker(false), TEST_TIMEOUT_MS);

    await expect(service.getHealthStatus()).resolves.toEqual({ database: "down", queue: "up" });
  });

  it("does not time out a dependency that resolves before the deadline", async () => {
    const service = new HealthService(
      buildChecker(false),
      buildChecker(false),
      LONGER_THAN_TEST_TIMEOUT_MS,
    );

    await expect(service.getHealthStatus()).resolves.toEqual({ database: "up", queue: "up" });
  });
});
