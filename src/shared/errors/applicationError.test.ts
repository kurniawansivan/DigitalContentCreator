import { describe, expect, it } from "vitest";
import { ApplicationError, ServiceUnavailableError } from "@/shared/errors/applicationError";
import { ErrorCode, HTTP_STATUS_INTERNAL_SERVER_ERROR } from "@/shared/errors/errorCode";

const HTTP_STATUS_NOT_FOUND = 404;

describe("ApplicationError", () => {
  it("resolves the status code registered for the given error code", () => {
    const error = new ApplicationError(ErrorCode.RESOURCE_NOT_FOUND, "Not found");

    expect(error.statusCode).toBe(HTTP_STATUS_NOT_FOUND);
    expect(error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    expect(error.publicMessage).toBe("Not found");
  });

  it("falls back to 500 for a code with no registered status", () => {
    const unregisteredCode = "SOMETHING_NEW" as ErrorCode;

    const error = new ApplicationError(unregisteredCode, "Unregistered");

    expect(error.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR);
  });

  it("preserves the cause of the original error", () => {
    const cause = new Error("root cause");

    const error = new ApplicationError(ErrorCode.INTERNAL_ERROR, "Wrapped", { cause });

    expect(error.cause).toBe(cause);
  });
});

describe("ServiceUnavailableError", () => {
  it("builds a public message naming the unreachable dependency", () => {
    const error = new ServiceUnavailableError("Redis");

    expect(error.code).toBe(ErrorCode.SERVICE_UNAVAILABLE);
    expect(error.publicMessage).toBe("Redis is unreachable");
  });
});
