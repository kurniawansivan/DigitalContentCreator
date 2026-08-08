import { describe, expect, it } from "vitest";
import { buildErrorResponse, buildSuccessResponse, ResponseStatus } from "@/shared/http/envelope";

const NOT_FOUND_STATUS_CODE = 404;
const CREATED_STATUS_CODE = 201;
const DEFAULT_SUCCESS_STATUS_CODE = 200;

describe("buildSuccessResponse", () => {
  it("defaults to status 200 and fills the envelope shape", () => {
    const response = buildSuccessResponse({
      data: { id: "abc" },
      message: "OK",
      requestId: "req-1",
    });

    expect(response).toMatchObject({
      status: ResponseStatus.SUCCESS,
      statusCode: DEFAULT_SUCCESS_STATUS_CODE,
      message: "OK",
      data: { id: "abc" },
      meta: null,
      errors: null,
      requestId: "req-1",
    });
    expect(new Date(response.timestamp).toString()).not.toBe("Invalid Date");
  });

  it("uses the provided status code when one is given", () => {
    const response = buildSuccessResponse({
      data: { id: "abc" },
      message: "Created",
      requestId: "req-2",
      statusCode: CREATED_STATUS_CODE,
    });

    expect(response.statusCode).toBe(CREATED_STATUS_CODE);
  });
});

describe("buildErrorResponse", () => {
  it("fills the envelope shape with a null data field and the given errors", () => {
    const response = buildErrorResponse({
      statusCode: NOT_FOUND_STATUS_CODE,
      message: "Not found",
      errors: [{ field: null, code: "RESOURCE_NOT_FOUND", message: "Not found" }],
      requestId: "req-3",
    });

    expect(response).toMatchObject({
      status: ResponseStatus.ERROR,
      statusCode: NOT_FOUND_STATUS_CODE,
      message: "Not found",
      data: null,
      meta: null,
      errors: [{ field: null, code: "RESOURCE_NOT_FOUND", message: "Not found" }],
      requestId: "req-3",
    });
  });
});
