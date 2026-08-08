import { describe, expect, it } from "vitest";
import { getDatabaseStatus } from "@/app/page";
import { HealthService } from "@/modules/health/health.service";
import type { ConnectionChecker } from "@/modules/health/health.types";

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

/**
 * HealthService.getHealthStatus() never rejects for an expected "dependency is down"
 * outcome (see health.service.ts) - only a genuine bug would make it reject. This is a
 * real subclass, not a cast, so it stays a true `HealthService` for callers that need
 * one, while forcing that unexpected path.
 */
class CrashingHealthService extends HealthService {
  constructor() {
    super(buildChecker(false), buildChecker(false));
  }

  override getHealthStatus(): ReturnType<HealthService["getHealthStatus"]> {
    return Promise.reject(new Error("unexpected crash"));
  }
}

describe("getDatabaseStatus", () => {
  it("resolves to up when the database check succeeds", async () => {
    const healthService = new HealthService(buildChecker(false), buildChecker(false));

    await expect(getDatabaseStatus(healthService)).resolves.toBe("up");
  });

  it("resolves to down when the database check fails", async () => {
    const healthService = new HealthService(buildChecker(true), buildChecker(false));

    await expect(getDatabaseStatus(healthService)).resolves.toBe("down");
  });

  it("reports the database as up even when only the queue is down", async () => {
    const healthService = new HealthService(buildChecker(false), buildChecker(true));

    await expect(getDatabaseStatus(healthService)).resolves.toBe("up");
  });

  it("resolves to down when the health service itself unexpectedly rejects", async () => {
    await expect(getDatabaseStatus(new CrashingHealthService())).resolves.toBe("down");
  });
});
