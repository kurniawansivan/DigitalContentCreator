"""API envelope for Python backends.

snake_case inside Python, camelCase on the wire. The conversion happens here and nowhere
else - never convert casing by hand anywhere in the codebase.

Copy to src/shared/http/envelope.py.
"""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

TData = TypeVar("TData")

MAXIMUM_PER_PAGE = 100
DEFAULT_PER_PAGE = 20


class ApiModel(BaseModel):
    """Base for every request and response model.

    ``extra="forbid"`` is what blocks mass assignment: an unknown key is rejected at the
    boundary rather than silently ignored.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
        from_attributes=True,
        str_strip_whitespace=True,
    )


class ResponseStatus(StrEnum):
    SUCCESS = "success"
    ERROR = "error"


class FieldError(ApiModel):
    field: str | None
    code: str
    message: str


class PaginationMeta(ApiModel):
    page: int
    per_page: int
    total: int
    total_pages: int
    has_next_page: bool
    has_previous_page: bool


class ApiResponse(ApiModel, Generic[TData]):
    status: ResponseStatus
    status_code: int
    message: str
    data: TData | None = None
    meta: PaginationMeta | dict[str, object] | None = None
    errors: list[FieldError] | None = None
    request_id: str
    timestamp: datetime


def build_success_response(
    *,
    data: TData,
    message: str,
    request_id: str,
    status_code: int = 200,
    meta: PaginationMeta | dict[str, object] | None = None,
) -> ApiResponse[TData]:
    return ApiResponse[TData](
        status=ResponseStatus.SUCCESS,
        status_code=status_code,
        message=message,
        data=data,
        meta=meta,
        errors=None,
        request_id=request_id,
        timestamp=datetime.now(UTC),
    )


def build_error_response(
    *,
    status_code: int,
    message: str,
    errors: list[FieldError],
    request_id: str,
) -> ApiResponse[None]:
    return ApiResponse[None](
        status=ResponseStatus.ERROR,
        status_code=status_code,
        message=message,
        data=None,
        meta=None,
        errors=errors,
        request_id=request_id,
        timestamp=datetime.now(UTC),
    )


def build_pagination_meta(*, page: int, per_page: int, total: int) -> PaginationMeta:
    total_pages = max(1, -(-total // per_page))  # ceiling division without importing math
    return PaginationMeta(
        page=page,
        per_page=per_page,
        total=total,
        total_pages=total_pages,
        has_next_page=page < total_pages,
        has_previous_page=page > 1,
    )


def clamp_per_page(requested_per_page: int | None) -> int:
    """A page size above the ceiling is clamped, not rejected."""
    if requested_per_page is None:
        return DEFAULT_PER_PAGE
    return min(max(1, requested_per_page), MAXIMUM_PER_PAGE)


# FastAPI wiring:
#
#   @router.get("/users/{user_id}", response_model=ApiResponse[UserResponse])
#   async def get_user(...) -> ApiResponse[UserResponse]: ...
#
#   app = FastAPI(
#       default_response_class=ORJSONResponse,
#       # by_alias so responses serialize camelCase
#       responses={422: {"model": ApiResponse[None]}},
#   )
#
# Serialize with model_dump(by_alias=True) anywhere you build a response manually.
