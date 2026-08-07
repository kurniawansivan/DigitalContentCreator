---
name: backend-standard
description: The backend engineering standard for this repository - layering, SOLID boundaries, API response contract, authentication and token handling, brute-force protection, password hashing, validation, error taxonomy, logging, and database access rules. Load before writing or changing any route, controller, service, repository, model, migration, middleware, background job, or auth code, in any language or framework (FastAPI, Django, Flask, Express, Fastify, NestJS, Hono, Go, or plain Python/Node).
---

# Backend Standard

Read this before writing backend code. Load the reference file for the area you are
touching; do not work from memory.

| Area | Reference |
| --- | --- |
| Response shape, casing, pagination, versioning | `references/api-contract.md` |
| Auth, tokens, hashing, brute force, headers, input safety | `references/security.md` |
| Layering, SOLID, dependency direction, file layout | `references/architecture.md` |
| Error taxonomy, error codes, logging | `references/errors.md` |

## The five rules that decide most reviews

### 1. Dependencies point one direction

```
route -> controller -> service -> repository -> database
```

A controller translates HTTP to and from a service call. It never queries the database and
holds no business rules. A service holds business rules and never sees `request` or
`response`. A repository reads and writes data and holds no business rules. Nothing lower
in the chain ever imports something higher.

A service depends on a repository *interface* (protocol / abstract class / injected type),
not on a concrete database client. That single choice is what makes the service testable
without a database and what makes swapping the data store a local change.

### 2. Every response uses the envelope

Success and failure both use the same top-level shape, always camelCase keys. Full
definition in `references/api-contract.md`. Never return a bare object, a bare array, or a
bare string from a handler.

### 3. Validate at the boundary, trust after

Every inbound payload is parsed by a schema at the edge (Pydantic, zod, class-validator).
Unknown keys are rejected, not ignored - that is what stops mass assignment. After the
boundary, the rest of the code works with a typed object and does not re-check shapes.

Never build a database query by string concatenation. Parameterized queries or a query
builder, without exception.

### 4. Authorize in the service, not only the route

A route guard answers "is this caller authenticated". The service answers "may *this*
caller act on *this* record". Checking only at the route is how insecure direct object
reference bugs get shipped. Every service function that loads a record by an id supplied by
the client verifies ownership or role before returning it.

### 5. One function, one job

Maximum 40 lines, nesting depth 2, 3 parameters. If a function needs more than three
inputs, pass one typed object. Replace branching chains with guard clauses and lookup maps:

```python
# Wrong - grows an arm every time a status is added, and every caller re-implements it.
def get_label(status):
    if status == "pending":
        return "Waiting for review"
    elif status == "approved":
        return "Approved"
    elif status == "rejected":
        return "Rejected"
    else:
        return "Unknown"

# Right - data, not control flow. Adding a status is a one-line data change.
STATUS_LABELS: dict[OrderStatus, str] = {
    OrderStatus.PENDING: "Waiting for review",
    OrderStatus.APPROVED: "Approved",
    OrderStatus.REJECTED: "Rejected",
}

def get_status_label(status: OrderStatus) -> str:
    return STATUS_LABELS.get(status, "Unknown")
```

Guard clauses instead of nesting:

```typescript
// Wrong: three levels of nesting, the happy path is buried.
function activate(user: User): Result {
  if (user) {
    if (user.isVerified) {
      if (!user.isBanned) {
        return performActivation(user);
      } else {
        return failure("banned");
      }
    } else {
      return failure("not verified");
    }
  }
  return failure("missing user");
}

// Right: every precondition exits early, the happy path is last and flat.
function activateUser(user: User): Result {
  if (!user.isVerified) return failure(ErrorCode.USER_NOT_VERIFIED);
  if (user.isBanned) return failure(ErrorCode.USER_BANNED);
  return performActivation(user);
}
```

## Naming

Full words. `userRepository`, not `usrRepo`. `paginationMetadata`, not `pgMeta`.
`temporaryAccessToken`, not `tmpTok`. Allowed short forms are `id`, `url`, `uri`, `api`,
`http`, `db`, `io`, `sql`.

Booleans read as an assertion: `isActive`, `hasPermission`, `canRefund`, `shouldRetry`.
Functions start with a verb: `findUserByEmail`, `revokeRefreshTokenFamily`.
Repository methods say what they do to storage: `findById`, `insert`, `updateById`,
`deleteById` - never `get`/`set`/`handle`/`process`/`doStuff`.

## Database

- Every schema change is a migration file, checked in, reversible, never an ad-hoc ALTER.
- Every foreign key has an index. Every query that filters or sorts has a supporting index.
- Multi-write operations run in a transaction. Partial writes are not acceptable.
- No N+1 queries: load related rows with a join or a batched fetch.
- Soft delete only where the product requires history; otherwise delete.
- Money is an integer of minor units or a fixed-precision decimal. Never a float.
- Timestamps are stored UTC, `TIMESTAMPTZ`, and serialized ISO 8601.

## Concurrency and reliability

- Every outbound network call has an explicit timeout. No unbounded waits.
- Retries use exponential backoff with jitter, and only on idempotent operations.
- Every mutating endpoint that a client might resend accepts an `Idempotency-Key`.
- Background jobs are idempotent, because they will be delivered more than once.
- Long work goes to a queue, not to the request thread.

## Definition of done for backend work

- [ ] Layering respected; no database access outside a repository
- [ ] Request and response schemas defined and validated, unknown keys rejected
- [ ] Response uses the envelope, camelCase keys
- [ ] Ownership or role checked in the service for every client-supplied id
- [ ] Errors mapped to a typed error code; no stack trace or internal message reaches the client
- [ ] Unit tests for the service, integration tests for the endpoint (see `testing-standard`)
- [ ] Lint, format, type check, and tests all green
