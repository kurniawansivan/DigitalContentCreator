# API Contract

One envelope, one casing, one error shape. The frontend must never need to ask what a
response looks like.

## Casing: camelCase on the wire, always

Every JSON key in every request and response body is `camelCase`. This holds no matter what
language the backend is written in.

- TypeScript and JavaScript backends: camelCase internally and on the wire. Nothing to do.
- Python backends: keep `snake_case` internally, convert at the schema boundary only.

```python
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    """Base for every request and response model. snake_case in Python, camelCase on the wire."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",  # unknown keys are rejected, which blocks mass assignment
        from_attributes=True,
    )


class UserResponse(ApiModel):
    id: str
    email_address: str      # serializes as "emailAddress"
    created_at: datetime    # serializes as "createdAt"
```

Serialize with `model_dump(by_alias=True)`. Go backends use struct tags
(`json:"emailAddress"`). There is no place in the codebase that converts casing by hand.

Query parameters, path parameters, and headers follow their own conventions: query and path
parameters are `camelCase`, headers stay `Kebab-Case`.

## The envelope

Every response body, success or failure, has exactly these keys:

```jsonc
{
  "status": "success",              // "success" | "error"
  "statusCode": 200,                // mirrors the HTTP status
  "message": "User created",        // short, human readable, safe to show a user
  "data": {},                       // payload on success, null on error
  "meta": null,                     // pagination or context, null when not applicable
  "errors": null,                   // array on error, null on success
  "requestId": "0f1c8a2e-...",      // correlation id, also returned as X-Request-Id
  "timestamp": "2026-08-07T10:00:00.000Z"
}
```

A collection response fills `meta`:

```jsonc
{
  "status": "success",
  "statusCode": 200,
  "message": "Orders retrieved",
  "data": [{ "id": "ord_1" }, { "id": "ord_2" }],
  "meta": {
    "page": 1,
    "perPage": 20,
    "total": 137,
    "totalPages": 7,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "errors": null,
  "requestId": "0f1c8a2e-...",
  "timestamp": "2026-08-07T10:00:00.000Z"
}
```

An error response fills `errors` and nulls `data`:

```jsonc
{
  "status": "error",
  "statusCode": 422,
  "message": "The submitted data is invalid",
  "data": null,
  "meta": null,
  "errors": [
    { "field": "emailAddress", "code": "EMAIL_ALREADY_REGISTERED", "message": "That email address is already registered" },
    { "field": "password", "code": "PASSWORD_TOO_SHORT", "message": "Password must be at least 12 characters" }
  ],
  "requestId": "0f1c8a2e-...",
  "timestamp": "2026-08-07T10:00:00.000Z"
}
```

Rules for the error array:

- `field` is the camelCase path to the offending input (`address.postalCode`,
  `items[2].quantity`), or `null` when the error is not about a single field.
- `code` is a stable `SCREAMING_SNAKE_CASE` value from the shared error-code enum. The
  frontend branches on `code`, never on `message`.
- `message` is safe to display. Never a stack trace, SQL fragment, file path, or library
  exception text.
- Validation failures return every problem at once, not just the first one.

The payload always sits under `data`. `data` is an object or an array, never a scalar. If
the operation returns nothing, `data` is `null` and the status code is 204 or 200.

## HTTP status codes

| Code | Use |
| --- | --- |
| 200 | Read, or update that returns the resource |
| 201 | Created; include a `Location` header |
| 202 | Accepted for asynchronous processing |
| 204 | Success, no body |
| 400 | Malformed request that a schema cannot describe |
| 401 | No credentials, or credentials are invalid or expired |
| 403 | Authenticated, but not permitted |
| 404 | Not found, or hidden because the caller may not see it |
| 409 | Conflict: duplicate, version mismatch, state not allowed |
| 422 | Well-formed request, failed validation or a business rule |
| 429 | Rate limited; include `Retry-After` |
| 500 | Unexpected failure; log with the requestId, return a generic message |

`statusCode` in the body always equals the HTTP status. Never return 200 with
`"status": "error"`.

## Pagination

Offset pagination: `?page=1&perPage=20`. Default `perPage` 20, hard maximum 100. A larger
value is clamped, not an error.

Cursor pagination for feeds and large tables: `?cursor=<opaque>&limit=20`, and `meta`
carries `nextCursor` and `hasNextPage` instead of `page`/`total`.

Sorting: `?sortBy=createdAt&sortOrder=desc`. `sortBy` is validated against an allowlist of
column names. Never interpolate a client string into an ORDER BY clause.

Filtering: explicit named parameters (`?status=pending&createdAfter=2026-01-01`). No generic
query-language parameter that reaches the database.

## Versioning and compatibility

- Version in the path: `/api/v1/...`. A breaking change means `v2`, never a silent change.
- Additive changes are allowed inside a version: new optional fields, new enum values that
  the client already tolerates.
- Breaking changes are: removing or renaming a field, changing a type, changing a status
  code, making an optional field required, changing the meaning of a value.
- Deprecate before removing: `Deprecation` and `Sunset` headers, and a note in the changelog.

## Contract enforcement

- The OpenAPI document is generated from the code, never hand-maintained.
- Frontend types are generated from the OpenAPI document, never hand-written.
- An integration test asserts the full envelope shape for every endpoint, so a drift in the
  response breaks the build rather than the frontend.
- Both sides import the same `ErrorCode` enum, generated from one source.
