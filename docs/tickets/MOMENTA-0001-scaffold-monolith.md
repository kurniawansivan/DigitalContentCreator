# MOMENTA-0001: Scaffold the monolith

**Status:** Ready (scope agreed, implementation not started)
**Requirement area:** Foundation - [PRD.md §8 (HLD)](../../PRD.md#8-high-level-architecture-hld), [§9 (schema)](../../PRD.md#9-skema-data-final), [§10 (API)](../../PRD.md#10-desain-api-final), [§11 (tech stack)](../../PRD.md#11-tech-stack-terkunci)
**Depends on:** none

## Implementation approach (read before starting)

Use standard, officially maintained scaffolding tools to generate the baseline instead of
hand-writing every config file from scratch: e.g. `npx create-next-app@latest` for the
Next.js + TypeScript + ESLint baseline, Prisma's own CLI flow for `prisma init` /
`prisma migrate`, and official Docker Compose examples as a starting point. Then layer the
`.claude/presets/node-typescript` + `.claude/presets/react` rules on top of that generated
baseline (merge, per `.claude/presets/README.md` - do not hand-roll an equivalent config
file from memory. Hand-rolled config is slower, drifts from upstream defaults, and is more
likely to fight the framework's own conventions (this bit the team during a first attempt
at this ticket - see note below).

> Note: a first attempt at this ticket (2026-08-08) hand-assembled every config file
> (tsconfig, eslint flat config, Dockerfile, docker-compose, Prisma config) from scratch
> instead of starting from `create-next-app`/`prisma init`. It was cancelled before
> completion specifically because of that approach. Do not repeat it.

## Phase 1 - Scope

**Goal:** a developer can run the project locally and get one working TypeScript monolith
(Next.js) connected to PostgreSQL (Prisma) and Redis (BullMQ), with one example endpoint
proving the full pipeline works, plus a worker process proven to receive and process a
queued job.

**Acceptance criteria**

- [ ] `GET /api/v1/health` returns a success envelope (`statusCode: 200`) with
      `{ database: "up", queue: "up" }` when Postgres and Redis are reachable.
- [ ] `GET /api/v1/health` returns an error envelope (`statusCode: 503`,
      `code: SERVICE_UNAVAILABLE`) when Postgres is unreachable, with no internal detail
      leaked.
- [ ] A repository-level integration test round-trips a real row in Postgres via Prisma.
- [ ] A service-level unit test covers the "up" and "down" branches with a fake repository.
- [ ] A job can be enqueued from the web process and is genuinely processed by a worker
      process running separately, over real Redis.
- [ ] The homepage shows live database status, proving frontend and backend share the same
      codebase/runtime.
- [ ] `docker compose up` starts `web`, `worker` (same image, different command),
      `postgres`, `redis`, and `minio`, and the stack answers over the network.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test` all pass with zero suppressions.

**Out of scope**

- All product features (moment engine, script engine, real reelkit rendering, brand kit,
  dashboard) - separate tickets against `docs/requirements/`.
- Authentication - added alongside the first feature that actually needs a user identity.
- Real ffmpeg rendering - this ticket's queue/worker proof is a no-op `system-ping` job.
- CI pipeline.

**Affected surface**

- 100% new files - this is a greenfield project (only `.claude/`, `CLAUDE.md`, `PRD.md`,
  and `docs/` exist today).

**Risks**

- This is the first public API contract (`/api/v1/health` + envelope) - every later
  endpoint follows its shape, so mistakes here propagate.
- This is the first "one image, two commands" (`web` vs `worker`) infra setup - later
  render-pipeline tickets depend on it working correctly.
- No auth, money, or personal data touched by this ticket itself.

## Phase 2 - Contract

**`GET /api/v1/health`**

Success (200):

```jsonc
{
  "status": "success",
  "statusCode": 200,
  "message": "Service is healthy",
  "data": { "database": "up", "queue": "up" },
  "meta": null,
  "errors": null,
  "requestId": "...",
  "timestamp": "..."
}
```

Degraded (503, error code `SERVICE_UNAVAILABLE`, already in the shared error-code enum -
no new code needed):

```jsonc
{
  "status": "error",
  "statusCode": 503,
  "message": "Service is degraded",
  "data": null,
  "meta": null,
  "errors": [{ "field": null, "code": "SERVICE_UNAVAILABLE", "message": "Database is unreachable" }],
  "requestId": "...",
  "timestamp": "..."
}
```

**Migration:**

```prisma
model SystemHealthCheck {
  id        String   @id @default(cuid())
  checkedAt DateTime @default(now()) @map("checked_at")

  @@map("system_health_checks")
}
```

**Job contract (BullMQ):** queue `system-ping`, job `ping`, payload
`{ requestedAt: string }`, result `{ respondedAt: string, workerInstanceId: string }`.
Idempotent (no side effect beyond echoing the timestamp).

**Component:** `HealthStatusCard` - props `{ database: "up" | "down" }`.

## Phase 3 - Test plan

| Acceptance criterion | Test level | Test name |
| --- | --- | --- |
| DB & queue up -> 200 healthy envelope | Integration | returns 200 with a healthy envelope when the database and queue are reachable |
| DB down -> 503 SERVICE_UNAVAILABLE, no internal detail leaked | Integration | returns 503 SERVICE_UNAVAILABLE without leaking internal error detail when the database is unreachable |
| Service reports "up" when repository ping resolves | Unit | reports the database as up when the repository ping resolves |
| Service throws typed error when repository ping rejects | Unit | throws a SERVICE_UNAVAILABLE ApplicationError when the repository ping rejects |
| Repository round-trips a real row in Postgres | Integration | inserts and reads back a system health check row in Postgres |
| Web enqueues a job the worker actually processes via real Redis | Integration | processes a system-ping job through BullMQ and resolves with a workerInstanceId |
| Homepage shows live "up" status end to end | End-to-end | shows the database as up on the homepage when the full stack is healthy |
| Homepage shows live "down" status end to end (main failure path) | End-to-end | shows the database as down on the homepage when Postgres is unreachable |
| `docker compose up` boots all 5 services and answers over the network | End-to-end (smoke, CI) | docker compose stack boots and GET /api/v1/health responds 200 over the network |

## Phase 4 - Implementation notes

Not started.

- [ ] Migration and model
- [ ] Repository, with integration test
- [ ] Service and business rules, with unit tests
- [ ] Controller, route, schemas, with endpoint integration test
- [ ] Frontend data layer, then components, with unit tests
- [ ] End-to-end test for the flow
- [ ] Documentation updated (README)
- [ ] `/audit` clean
- [ ] `/ship` clean
