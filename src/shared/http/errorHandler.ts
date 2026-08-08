import { randomUUID } from "node:crypto";
import { ApplicationError } from "@/shared/errors/applicationError";
import { ErrorCode, HTTP_STATUS_INTERNAL_SERVER_ERROR } from "@/shared/errors/errorCode";
import { buildErrorResponse, type ErrorResponseBody } from "@/shared/http/envelope";
import { logger } from "@/shared/logging/logger";

export function generateRequestId(): string {
  return randomUUID();
}

/**
 * The one place an unknown error becomes an envelope. Route handlers call this from
 * their catch block instead of shaping error responses themselves.
 */
export function toErrorResponse(
  error: unknown,
  requestId: string,
): { statusCode: number; body: ErrorResponseBody } {
  if (error instanceof ApplicationError) {
    return {
      statusCode: error.statusCode,
      body: buildErrorResponse({
        statusCode: error.statusCode,
        message: error.publicMessage,
        errors: [{ field: null, code: error.code, message: error.publicMessage }],
        requestId,
      }),
    };
  }

  logger.error({ requestId, error }, "Unhandled error");
  return {
    statusCode: HTTP_STATUS_INTERNAL_SERVER_ERROR,
    body: buildErrorResponse({
      statusCode: HTTP_STATUS_INTERNAL_SERVER_ERROR,
      message: "An unexpected error occurred",
      errors: [
        { field: null, code: ErrorCode.INTERNAL_ERROR, message: "An unexpected error occurred" },
      ],
      requestId,
    }),
  };
}
