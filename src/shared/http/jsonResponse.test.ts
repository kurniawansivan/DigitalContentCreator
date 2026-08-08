import { describe, expect, it } from "vitest";
import { buildJsonResponse } from "@/shared/http/jsonResponse";
import { buildSuccessResponse } from "@/shared/http/envelope";

const HTTP_STATUS_OK = 200;

describe("buildJsonResponse", () => {
  it("uses the envelope's own statusCode as the real HTTP status", async () => {
    const body = buildSuccessResponse({ data: { ok: true }, message: "OK", requestId: "req-1" });

    const response = buildJsonResponse(body, "req-1");

    expect(response.status).toBe(HTTP_STATUS_OK);
    await expect(response.json()).resolves.toEqual(body);
  });

  it("sets the X-Request-Id header to the given request id", () => {
    const body = buildSuccessResponse({ data: { ok: true }, message: "OK", requestId: "req-2" });

    const response = buildJsonResponse(body, "req-2");

    expect(response.headers.get("X-Request-Id")).toBe("req-2");
  });
});
