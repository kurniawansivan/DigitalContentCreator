import { describe, expect, it } from "vitest";
import { HealthService } from "@/modules/health/health.service";
import { ApplicationError } from "@/shared/errors/applicationError";
import { ErrorCode } from "@/shared/errors/errorCode";
import type { ConnectionChecker } from "@/modules/health/health.types";

const HTTP_STATUS_SERVICE_UNAVAILABLE = 503;

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

describe("HealthService", () => {
  it("reports the database and queue as up when both connection checks resolve", async () => {
    const service = new HealthService(buildChecker(false), buildChecker(false));

    await expect(service.getHealthStatus()).resolves.toEqual({ database: "up", queue: "up" });
  });

  it("throws a SERVICE_UNAVAILABLE ApplicationError when the database check rejects", async () => {
    const service = new HealthService(buildChecker(true), buildChecker(false));

    await expect(service.getHealthStatus()).rejects.toMatchObject({
      code: ErrorCode.SERVICE_UNAVAILABLE,
      statusCode: HTTP_STATUS_SERVICE_UNAVAILABLE,
      publicMessage: "Database is unreachable",
    });
  });

  it("throws a SERVICE_UNAVAILABLE ApplicationError when the queue check rejects", async () => {
    const service = new HealthService(buildChecker(false), buildChecker(true));

    await expect(service.getHealthStatus()).rejects.toMatchObject({
      code: ErrorCode.SERVICE_UNAVAILABLE,
      statusCode: HTTP_STATUS_SERVICE_UNAVAILABLE,
      publicMessage: "Queue is unreachable",
    });
  });

  it("checks the database before the queue, and never checks the queue when the database is down", async () => {
    let didCheckQueue = false;
    const queueChecker: ConnectionChecker = {
      checkConnection: (): Promise<void> => {
        didCheckQueue = true;
        return Promise.resolve();
      },
    };
    const service = new HealthService(buildChecker(true), queueChecker);

    await expect(service.getHealthStatus()).rejects.toBeInstanceOf(ApplicationError);
    expect(didCheckQueue).toBe(false);
  });
});
