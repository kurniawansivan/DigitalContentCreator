// Single source of truth for error codes. The backend raises these; the frontend
// branches on them. Never branch on a message string - messages change, codes do not.

export const ErrorCode = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  INVALID_PARAMETER: "INVALID_PARAMETER",
  AUTHENTICATION_REQUIRED: "AUTHENTICATION_REQUIRED",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

const HTTP_STATUS_UNPROCESSABLE_ENTITY = 422;
const HTTP_STATUS_UNAUTHORIZED = 401;
const HTTP_STATUS_NOT_FOUND = 404;
const HTTP_STATUS_SERVICE_UNAVAILABLE = 503;
export const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;

/**
 * Default HTTP status for each code. A `Map`, not a plain object, so looking one up by a
 * caller-shaped key is never a dynamic-property-access injection sink.
 */
export const ERROR_CODE_STATUS: ReadonlyMap<ErrorCode, number> = new Map([
  [ErrorCode.VALIDATION_FAILED, HTTP_STATUS_UNPROCESSABLE_ENTITY],
  [ErrorCode.INVALID_PARAMETER, HTTP_STATUS_UNPROCESSABLE_ENTITY],
  [ErrorCode.AUTHENTICATION_REQUIRED, HTTP_STATUS_UNAUTHORIZED],
  [ErrorCode.RESOURCE_NOT_FOUND, HTTP_STATUS_NOT_FOUND],
  [ErrorCode.SERVICE_UNAVAILABLE, HTTP_STATUS_SERVICE_UNAVAILABLE],
  [ErrorCode.INTERNAL_ERROR, HTTP_STATUS_INTERNAL_SERVER_ERROR],
]);
