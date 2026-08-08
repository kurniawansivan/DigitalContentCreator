// The API envelope. One definition, imported by every route handler that builds a
// response. Never hand-write a second version of this shape anywhere.

export const ResponseStatus = {
  SUCCESS: "success",
  ERROR: "error",
} as const;

export type ResponseStatus = (typeof ResponseStatus)[keyof typeof ResponseStatus];

export interface FieldError {
  field: string | null;
  code: string;
  message: string;
}

export interface ApiResponse<TData> {
  status: ResponseStatus;
  statusCode: number;
  message: string;
  data: TData | null;
  meta: Record<string, unknown> | null;
  errors: FieldError[] | null;
  requestId: string;
  timestamp: string;
}

export type SuccessResponse<TData> = ApiResponse<TData> & {
  status: typeof ResponseStatus.SUCCESS;
  data: TData;
  errors: null;
};

export type ErrorResponseBody = ApiResponse<never> & {
  status: typeof ResponseStatus.ERROR;
  data: null;
  errors: FieldError[];
};

export function buildSuccessResponse<TData>(input: {
  data: TData;
  message: string;
  requestId: string;
  statusCode?: number;
}): SuccessResponse<TData> {
  const defaultSuccessStatusCode = 200;
  return {
    status: ResponseStatus.SUCCESS,
    statusCode: input.statusCode ?? defaultSuccessStatusCode,
    message: input.message,
    data: input.data,
    meta: null,
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
}): ErrorResponseBody {
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
