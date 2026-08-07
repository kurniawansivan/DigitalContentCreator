// The API envelope. One definition, imported by the backend to build responses and by the
// frontend to read them. Never hand-write a second version of these types anywhere.

export const ResponseStatus = {
  SUCCESS: "success",
  ERROR: "error",
} as const;

export type ResponseStatus = (typeof ResponseStatus)[keyof typeof ResponseStatus];

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CursorMeta {
  limit: number;
  nextCursor: string | null;
  hasNextPage: boolean;
}

export type ResponseMeta = PaginationMeta | CursorMeta | Record<string, unknown>;

export interface FieldError {
  /** camelCase path to the offending input, or null when the error is not field-specific. */
  field: string | null;
  /** Stable code from the shared enum. The frontend branches on this, never on message. */
  code: string;
  /** Safe to display to a user. Never a stack trace or an internal message. */
  message: string;
}

export interface ApiResponse<TData> {
  status: ResponseStatus;
  statusCode: number;
  message: string;
  data: TData | null;
  meta: ResponseMeta | null;
  errors: FieldError[] | null;
  requestId: string;
  timestamp: string;
}

export type SuccessResponse<TData> = ApiResponse<TData> & {
  status: typeof ResponseStatus.SUCCESS;
  data: TData;
  errors: null;
};

export type ErrorResponse = ApiResponse<never> & {
  status: typeof ResponseStatus.ERROR;
  data: null;
  errors: FieldError[];
};

export function buildSuccessResponse<TData>(input: {
  data: TData;
  message: string;
  requestId: string;
  statusCode?: number;
  meta?: ResponseMeta | null;
}): SuccessResponse<TData> {
  return {
    status: ResponseStatus.SUCCESS,
    statusCode: input.statusCode ?? 200,
    message: input.message,
    data: input.data,
    meta: input.meta ?? null,
    errors: null,
    requestId: input.requestId,
    timestamp: new Date().toISOString(),
  };
}

export function buildErrorResponse(input: {
  statusCode: number;
  message: string;
  errors: FieldError[];
  requestId: string;
}): ErrorResponse {
  return {
    status: ResponseStatus.ERROR,
    statusCode: input.statusCode,
    message: input.message,
    data: null,
    meta: null,
    errors: input.errors,
    requestId: input.requestId,
    timestamp: new Date().toISOString(),
  };
}

export function buildPaginationMeta(input: {
  page: number;
  perPage: number;
  total: number;
}): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(input.total / input.perPage));
  return {
    page: input.page,
    perPage: input.perPage,
    total: input.total,
    totalPages,
    hasNextPage: input.page < totalPages,
    hasPreviousPage: input.page > 1,
  };
}

export function isErrorResponse<TData>(
  response: ApiResponse<TData>,
): response is ErrorResponse {
  return response.status === ResponseStatus.ERROR;
}

/** Hard ceiling on page size. A larger request is clamped, not rejected. */
export const MAXIMUM_PER_PAGE = 100;
export const DEFAULT_PER_PAGE = 20;

export function clampPerPage(requestedPerPage: number | undefined): number {
  if (requestedPerPage === undefined || Number.isNaN(requestedPerPage)) return DEFAULT_PER_PAGE;
  return Math.min(Math.max(1, Math.trunc(requestedPerPage)), MAXIMUM_PER_PAGE);
}
