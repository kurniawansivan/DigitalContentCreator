import {
  ERROR_CODE_STATUS,
  ErrorCode,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
} from "@/shared/errors/errorCode";

export class ApplicationError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly publicMessage: string;

  constructor(code: ErrorCode, publicMessage: string, options?: { cause?: unknown }) {
    super(publicMessage, options);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = ERROR_CODE_STATUS.get(code) ?? HTTP_STATUS_INTERNAL_SERVER_ERROR;
    this.publicMessage = publicMessage;
  }
}

export class ServiceUnavailableError extends ApplicationError {
  constructor(dependencyName: string, options?: { cause?: unknown }) {
    super(ErrorCode.SERVICE_UNAVAILABLE, `${dependencyName} is unreachable`, options);
  }
}
