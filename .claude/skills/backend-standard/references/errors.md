# Errors and Logging

## One error taxonomy

Every failure the application raises is a typed error carrying a stable code, an HTTP
status, and a message that is safe to show a user. One error handler at the edge turns any
of them into the envelope. Handlers contain no `try`/`catch` for presentation.

```typescript
export enum ErrorCode {
  // 400 / 422 - the request is wrong
  VALIDATION_FAILED = "VALIDATION_FAILED",
  INVALID_PARAMETER = "INVALID_PARAMETER",
  // 401 - who are you
  AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  ACCESS_TOKEN_EXPIRED = "ACCESS_TOKEN_EXPIRED",
  REFRESH_TOKEN_INVALID = "REFRESH_TOKEN_INVALID",
  REFRESH_TOKEN_REUSED = "REFRESH_TOKEN_REUSED",
  MULTI_FACTOR_REQUIRED = "MULTI_FACTOR_REQUIRED",
  // 403 - you may not
  PERMISSION_DENIED = "PERMISSION_DENIED",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  ACCOUNT_NOT_VERIFIED = "ACCOUNT_NOT_VERIFIED",
  // 404 / 409
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  RESOURCE_ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS",
  RESOURCE_CONFLICT = "RESOURCE_CONFLICT",
  INVALID_STATE_TRANSITION = "INVALID_STATE_TRANSITION",
  // 429 / 5xx
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  UPSTREAM_UNAVAILABLE = "UPSTREAM_UNAVAILABLE",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

export class ApplicationError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly statusCode: number,
    readonly publicMessage: string,
    readonly fieldErrors: FieldError[] = [],
    readonly cause?: unknown,
  ) {
    super(publicMessage);
    this.name = new.target.name;
  }
}

export class ResourceNotFoundError extends ApplicationError {
  constructor(resourceName: string) {
    super(ErrorCode.RESOURCE_NOT_FOUND, 404, `${resourceName} was not found`);
  }
}
```

Python equivalent:

```python
class ApplicationError(Exception):
    def __init__(
        self,
        code: ErrorCode,
        status_code: int,
        public_message: str,
        field_errors: list[FieldError] | None = None,
    ) -> None:
        super().__init__(public_message)
        self.code = code
        self.status_code = status_code
        self.public_message = public_message
        self.field_errors = field_errors or []
```

## The one error handler

Registered once, at the edge. It:

1. Recognises `ApplicationError` and maps it straight into the envelope.
2. Recognises the validation library's error and maps every issue into a `FieldError` with a
   camelCase `field` path.
3. Treats anything else as unexpected: logs it at error level with the stack trace and the
   `requestId`, then returns 500 with `INTERNAL_ERROR` and a generic message.

A client never receives a stack trace, an exception class name, a SQL fragment, a file path,
a library message, or an internal identifier. Those go to the log, keyed by `requestId`. The
user gets the `requestId` so support can find the log line.

## Raising errors

- Raise where the rule lives, which is the service. Do not return `null` to mean "failed"
  and let the caller guess why.
- Never swallow: no empty `catch`, no `except Exception: pass`. Catch only to add context,
  translate the error type, or handle it genuinely - then rethrow or return a typed failure.
- Preserve the cause when translating, so the stack chain survives.
- Do not use exceptions for expected control flow in hot paths; a lookup that finds nothing
  returns `null` and the caller decides whether that is an error.

## Logging

Structured JSON, one event per line, with `timestamp`, `level`, `message`, `requestId`,
`userId` when authenticated, and a `context` object.

| Level | Use |
| --- | --- |
| `error` | Something failed and a human needs to know. Includes the stack. |
| `warn` | Degraded but handled: a retry, a fallback, an approaching limit. |
| `info` | Business events worth an audit trail: created, paid, revoked, locked. |
| `debug` | Development detail. Off in production. |

Rules:

- Redact by allowlist. Choose the fields you log; never log a whole request object.
- Never log a password, token, cookie, authorization header, full card number, or government
  identifier - not even hashed, not even in development.
- One log line per event, with fields. Not five lines that must be correlated by eye.
- The `requestId` is generated at the edge if the client did not send one, returned in
  `X-Request-Id`, propagated to every downstream call, and present on every log line.
- Log the security events listed in `security.md` at `info` or higher, always.
