import { describe, expect, it } from "vitest";
import { generateRequestId, toErrorResponse } from "@/shared/http/errorHandler";
import { ServiceUnavailableError } from "@/shared/errors/applicationError";
import { ErrorCode, HTTP_STATUS_INTERNAL_SERVER_ERROR } from "@/shared/errors/errorCode";

const HTTP_STATUS_SERVICE_UNAVAILABLE = 503;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("generateRequestId", () => {
  it("generates a version 4 UUID", () => {
    expect(generateRequestId()).toMatch(UUID_PATTERN);
  });

  it("generates a different id on every call", () => {
    expect(generateRequestId()).not.toBe(generateRequestId());
  });
});

describe("toErrorResponse", () => {
  it("maps an ApplicationError to its own status code and error code", () => {
    const error = new ServiceUnavailableError("Database");

    const result = toErrorResponse(error, "req-1");

    expect(result.statusCode).toBe(HTTP_STATUS_SERVICE_UNAVAILABLE);
    expect(result.body).toMatchObject({
      status: "error",
      statusCode: HTTP_STATUS_SERVICE_UNAVAILABLE,
      message: "Database is unreachable",
      errors: [
        { field: null, code: ErrorCode.SERVICE_UNAVAILABLE, message: "Database is unreachable" },
      ],
      requestId: "req-1",
    });
  });

  it("maps an unknown error to a generic 500 without leaking its message", () => {
    const error = new Error("a database password leaked in this message");

    const result = toErrorResponse(error, "req-2");

    expect(result.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR);
    expect(result.body.message).toBe("An unexpected error occurred");
    expect(JSON.stringify(result.body)).not.toContain("password leaked");
  });
});
