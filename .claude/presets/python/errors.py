"""Error taxonomy and the single edge handler.

Copy to src/shared/errors/. Keep ErrorCode identical to the TypeScript enum in
presets/shared/error-codes.ts - they are one contract in two languages.
"""

from __future__ import annotations

import logging
import uuid
from enum import StrEnum
from typing import TYPE_CHECKING

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .envelope import FieldError, build_error_response

if TYPE_CHECKING:
    from collections.abc import Sequence

logger = logging.getLogger(__name__)


class ErrorCode(StrEnum):
    VALIDATION_FAILED = "VALIDATION_FAILED"
    INVALID_PARAMETER = "INVALID_PARAMETER"
    MALFORMED_REQUEST = "MALFORMED_REQUEST"
    PAYLOAD_TOO_LARGE = "PAYLOAD_TOO_LARGE"

    AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    ACCESS_TOKEN_EXPIRED = "ACCESS_TOKEN_EXPIRED"
    ACCESS_TOKEN_INVALID = "ACCESS_TOKEN_INVALID"
    REFRESH_TOKEN_INVALID = "REFRESH_TOKEN_INVALID"
    REFRESH_TOKEN_EXPIRED = "REFRESH_TOKEN_EXPIRED"
    REFRESH_TOKEN_REUSED = "REFRESH_TOKEN_REUSED"
    MULTI_FACTOR_REQUIRED = "MULTI_FACTOR_REQUIRED"

    PERMISSION_DENIED = "PERMISSION_DENIED"
    ACCOUNT_LOCKED = "ACCOUNT_LOCKED"
    ACCOUNT_NOT_VERIFIED = "ACCOUNT_NOT_VERIFIED"

    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    RESOURCE_ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS"
    RESOURCE_CONFLICT = "RESOURCE_CONFLICT"
    INVALID_STATE_TRANSITION = "INVALID_STATE_TRANSITION"

    EMAIL_ALREADY_REGISTERED = "EMAIL_ALREADY_REGISTERED"
    PASSWORD_TOO_SHORT = "PASSWORD_TOO_SHORT"
    PASSWORD_FOUND_IN_BREACH = "PASSWORD_FOUND_IN_BREACH"

    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    TOO_MANY_FAILED_ATTEMPTS = "TOO_MANY_FAILED_ATTEMPTS"
    UPSTREAM_UNAVAILABLE = "UPSTREAM_UNAVAILABLE"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class ApplicationError(Exception):
    """Every failure the application raises. Never raise a bare Exception."""

    def __init__(
        self,
        code: ErrorCode,
        status_code: int,
        public_message: str,
        field_errors: Sequence[FieldError] | None = None,
    ) -> None:
        super().__init__(public_message)
        self.code = code
        self.status_code = status_code
        self.public_message = public_message
        self.field_errors = list(field_errors or [])


class ResourceNotFoundError(ApplicationError):
    def __init__(self, resource_name: str) -> None:
        super().__init__(
            ErrorCode.RESOURCE_NOT_FOUND, 404, f"{resource_name} was not found"
        )


class PermissionDeniedError(ApplicationError):
    def __init__(self) -> None:
        super().__init__(
            ErrorCode.PERMISSION_DENIED, 403, "You do not have permission to do that"
        )


class InvalidCredentialsError(ApplicationError):
    """Deliberately identical for an unknown account and a wrong password.

    Never add a distinguishing message or code here: that is user enumeration.
    """

    def __init__(self) -> None:
        super().__init__(
            ErrorCode.INVALID_CREDENTIALS, 401, "Invalid email address or password"
        )


def _request_id(request: Request) -> str:
    existing = getattr(request.state, "request_id", None)
    return existing if isinstance(existing, str) else str(uuid.uuid4())


async def handle_application_error(
    request: Request, error: ApplicationError
) -> JSONResponse:
    request_id = _request_id(request)
    logger.info(
        "application_error",
        extra={"requestId": request_id, "code": error.code, "path": request.url.path},
    )
    envelope = build_error_response(
        status_code=error.status_code,
        message=error.public_message,
        errors=error.field_errors
        or [FieldError(field=None, code=error.code, message=error.public_message)],
        request_id=request_id,
    )
    return JSONResponse(
        status_code=error.status_code,
        content=envelope.model_dump(by_alias=True, mode="json"),
    )


async def handle_validation_error(
    request: Request, error: RequestValidationError
) -> JSONResponse:
    """Report every validation problem at once, with camelCase field paths."""
    field_errors = [
        FieldError(
            field=_to_camel_case_path(issue["loc"]),
            code=ErrorCode.VALIDATION_FAILED,
            message=issue["msg"],
        )
        for issue in error.errors()
    ]
    envelope = build_error_response(
        status_code=422,
        message="The submitted data is invalid",
        errors=field_errors,
        request_id=_request_id(request),
    )
    return JSONResponse(
        status_code=422, content=envelope.model_dump(by_alias=True, mode="json")
    )


async def handle_unexpected_error(request: Request, error: Exception) -> JSONResponse:
    """Anything not modelled. Log everything, disclose nothing."""
    request_id = _request_id(request)
    logger.exception(
        "unhandled_error", extra={"requestId": request_id, "path": request.url.path}
    )
    envelope = build_error_response(
        status_code=500,
        message="Something went wrong. Quote this reference if you contact support.",
        errors=[
            FieldError(
                field=None,
                code=ErrorCode.INTERNAL_ERROR,
                message=f"Reference: {request_id}",
            )
        ],
        request_id=request_id,
    )
    return JSONResponse(
        status_code=500, content=envelope.model_dump(by_alias=True, mode="json")
    )


def _to_camel_case_path(location: tuple[int | str, ...]) -> str | None:
    """Turn a Pydantic location tuple into a camelCase path: body.email_address -> emailAddress."""
    parts = [part for part in location if part not in {"body", "query", "path"}]
    if not parts:
        return None
    rendered: list[str] = []
    for part in parts:
        if isinstance(part, int):
            rendered.append(f"[{part}]")
            continue
        head, *tail = part.split("_")
        camel = head + "".join(word.capitalize() for word in tail)
        rendered.append(camel if not rendered else f".{camel}")
    return "".join(rendered).replace(".[", "[")


# Register once, at startup:
#
#   app.add_exception_handler(ApplicationError, handle_application_error)
#   app.add_exception_handler(RequestValidationError, handle_validation_error)
#   app.add_exception_handler(Exception, handle_unexpected_error)
#
# No route contains a try/except for presentation.
