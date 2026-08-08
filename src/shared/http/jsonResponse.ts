import type { ApiResponse } from "@/shared/http/envelope";

const REQUEST_ID_HEADER = "X-Request-Id";

/**
 * The one place a route handler turns an envelope into a `Response`. Every response -
 * success or error - carries the envelope's own `statusCode` as the real HTTP status and
 * the correlation id in the `X-Request-Id` header, per the API contract.
 */
export function buildJsonResponse<TData>(body: ApiResponse<TData>, requestId: string): Response {
  return Response.json(body, {
    status: body.statusCode,
    headers: { [REQUEST_ID_HEADER]: requestId },
  });
}
