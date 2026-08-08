import { describe, expect, it } from "vitest";
import { handleGetHealth } from "@/modules/health/health.controller";
import { HealthService } from "@/modules/health/health.service";
import type { ConnectionChecker } from "@/modules/health/health.types";

const HTTP_STATUS_OK = 200;
const HTTP_STATUS_SERVICE_UNAVAILABLE = 503;
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;

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
 * outcome - only a genuine bug would make it reject. A real subclass, not a cast, so it
 * stays a true `HealthService` while forcing that unexpected path.
 */
class CrashingHealthService extends HealthService {
  constructor() {
    super(buildChecker(false), buildChecker(false));
  }

  override getHealthStatus(): ReturnType<HealthService["getHealthStatus"]> {
    return Promise.reject(new Error("unexpected crash"));
  }
}

describe("handleGetHealth", () => {
  it("returns 200 with a healthy envelope when both dependencies are up", async () => {
    const healthService = new HealthService(buildChecker(false), buildChecker(false));

    const response = await handleGetHealth(healthService);
    const body: unknown = await response.json();

    expect(response.status).toBe(HTTP_STATUS_OK);
    expect(body).toMatchObject({
      status: "success",
      statusCode: HTTP_STATUS_OK,
      data: { database: "up", queue: "up" },
      errors: null,
    });
  });

  it("returns 503 with one error entry when only the database is down", async () => {
    const healthService = new HealthService(buildChecker(true), buildChecker(false));

    const response = await handleGetHealth(healthService);
    const body: unknown = await response.json();

    expect(response.status).toBe(HTTP_STATUS_SERVICE_UNAVAILABLE);
    expect(body).toMatchObject({
      status: "error",
      statusCode: HTTP_STATUS_SERVICE_UNAVAILABLE,
      data: null,
      errors: [{ field: null, code: "SERVICE_UNAVAILABLE", message: "Database is unreachable" }],
    });
  });

  it("returns 503 with one error entry when only the queue is down", async () => {
    const healthService = new HealthService(buildChecker(false), buildChecker(true));

    const response = await handleGetHealth(healthService);
    const body: unknown = await response.json();

    expect(response.status).toBe(HTTP_STATUS_SERVICE_UNAVAILABLE);
    expect(body).toMatchObject({
      errors: [{ field: null, code: "SERVICE_UNAVAILABLE", message: "Queue is unreachable" }],
    });
  });

  it("returns 503 with two error entries when both dependencies are down", async () => {
    const healthService = new HealthService(buildChecker(true), buildChecker(true));

    const response = await handleGetHealth(healthService);
    const body: unknown = await response.json();

    expect(response.status).toBe(HTTP_STATUS_SERVICE_UNAVAILABLE);
    expect(body).toMatchObject({
      errors: [
        { code: "SERVICE_UNAVAILABLE", message: "Database is unreachable" },
        { code: "SERVICE_UNAVAILABLE", message: "Queue is unreachable" },
      ],
    });
  });

  it("returns 500 without leaking internal detail when the service itself unexpectedly rejects", async () => {
    const response = await handleGetHealth(new CrashingHealthService());
    const body: unknown = await response.json();

    expect(response.status).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR);
    expect(body).toMatchObject({
      status: "error",
      statusCode: HTTP_STATUS_INTERNAL_SERVER_ERROR,
      message: "An unexpected error occurred",
    });
    expect(JSON.stringify(body)).not.toContain("unexpected crash");
  });

  it("sets the X-Request-Id header on every response", async () => {
    const healthService = new HealthService(buildChecker(false), buildChecker(false));

    const response = await handleGetHealth(healthService);
    const body = (await response.json()) as { requestId: string };

    expect(response.headers.get("X-Request-Id")).toBe(body.requestId);
  });
});
