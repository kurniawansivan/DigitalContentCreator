# MOMENTA-0001: Scaffold the monolith

**Status:** Done
**Requirement area:** Foundation - [PRD.md §8 (HLD)](../../PRD.md#8-high-level-architecture-hld), [§9 (schema)](../../PRD.md#9-skema-data-final), [§10 (API)](../../PRD.md#10-desain-api-final), [§11 (tech stack)](../../PRD.md#11-tech-stack-terkunci)
**Depends on:** none

## Implementation approach (read before starting)

Use standard, officially maintained scaffolding tools to generate the baseline instead of
hand-writing every config file from scratch: e.g. `npx create-next-app@latest` for the
Next.js + TypeScript + ESLint baseline, Prisma's own CLI flow for `prisma init` /
`prisma migrate`, and official Docker Compose examples as a starting point. Then layer the
`.claude/presets/node-typescript` + `.claude/presets/react` rules on top of that generated
baseline (merge, per `.claude/presets/README.md` - do not hand-roll an equivalent config
file from memory.

> Note: a first attempt at this ticket (2026-08-08) hand-assembled every config file
> from scratch instead of starting from `create-next-app`/`prisma init`. It was cancelled
> before completion specifically because of that approach. The successful attempt used
> `create-next-app` for the Next.js baseline and hand-wrote `prisma/schema.prisma` +
> `prisma.config.ts` directly (not `prisma init`) - that command was found during the
> first attempt to auto-install its own agent-skill files into `.claude/skills/`,
> `.windsurf/skills/`, `.agents/skills/`, which would have polluted this repo's own
> `.claude/skills/`. `prisma generate` and `prisma migrate dev` do not have that side
> effect - only `prisma init` does.

## Phase 1 - Scope

**Goal:** a developer can run the project locally and get one working TypeScript monolith
(Next.js) connected to PostgreSQL (Prisma) and Redis (BullMQ), with one example endpoint
proving the full pipeline works, plus a worker process proven to receive and process a
queued job.

**Acceptance criteria**

- [x] `GET /api/v1/health` returns a success envelope (`statusCode: 200`) with
      `{ database: "up", queue: "up" }` when Postgres and Redis are reachable.
- [x] `GET /api/v1/health` returns an error envelope (`statusCode: 503`,
      `code: SERVICE_UNAVAILABLE`) when Postgres is unreachable, with no internal detail
      leaked.
- [x] A repository-level integration test round-trips a real row in Postgres via Prisma.
- [x] A service-level unit test covers the "up" and "down" branches with a fake repository.
- [x] A job can be enqueued from the web process and is genuinely processed by a worker
      process running separately, over real Redis.
- [x] The homepage shows live database status, proving frontend and backend share the same
      codebase/runtime.
- [x] `docker compose up` starts `web`, `worker` (same image, different command),
      `postgres`, `redis`, and `minio`, and the stack answers over the network.
- [x] `npm run lint`, `npm run typecheck`, `npm run test` all pass with zero suppressions.

**Out of scope**

- All product features (moment engine, script engine, real reelkit rendering, brand kit,
  dashboard) - separate tickets against `docs/requirements/`.
- Authentication - added alongside the first feature that actually needs a user identity
  (MOMENTA-0002).
- Real ffmpeg rendering - this ticket's queue/worker proof is a no-op `system-ping` job.
- CI pipeline.

**Affected surface**

- 100% new files - this was a greenfield project (only `.claude/`, `CLAUDE.md`, `PRD.md`,
  and `docs/` existed before this ticket).

**Risks**

- This is the first public API contract (`/api/v1/health` + envelope) - every later
  endpoint follows its shape.
- This is the first "one image, two commands" (`web` vs `worker`) infra setup - later
  render-pipeline tickets depend on it working correctly. Verified for real: a job
  enqueued from inside the running `web` container was observed completing in the
  separate `worker` container's logs, over the docker-compose network.
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
no new code needed). One `errors[]` entry per dependency that is actually down, so a
queue-only outage never gets reported as a database outage:

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

Every response, success or error, also carries the `requestId` as an `X-Request-Id`
response header, per the API contract.

**Migration:**

```prisma
model SystemHealthCheck {
  id        String   @id @default(cuid())
  checkedAt DateTime @default(now()) @db.Timestamptz() @map("checked_at")

  @@map("system_health_checks")
}
```

**Job contract (BullMQ):** queue `system-ping`, job `ping`, payload
`{ requestedAt: string }`, result `{ respondedAt: string, workerInstanceId: string }`.
Idempotent (no side effect beyond echoing the timestamp).

**Component:** `HealthStatusCard` - props `{ database: DependencyStatus }` where
`DependencyStatus = "up" | "down"` (imported from `health.types.ts`, not redeclared).

## Phase 3 - Test plan

| Acceptance criterion | Test level | Test name | Status |
| --- | --- | --- | --- |
| DB & queue up -> 200 healthy envelope | Integration | returns 200 with a healthy envelope when the database and queue are reachable | Done |
| DB down -> 503 SERVICE_UNAVAILABLE, no internal detail leaked | Integration | returns 503 SERVICE_UNAVAILABLE without leaking internal error detail when the database is unreachable | Done |
| Response carries the correlation id as X-Request-Id | Integration | (same test) asserts `response.headers.get("X-Request-Id")` equals the body's `requestId` | Done |
| Service reports "up"/"down" per dependency, independently | Unit | reports only the database (or only the queue) as down when just that check rejects | Done |
| A hung dependency reports "down" instead of hanging the request | Unit | reports a dependency as down when its check never resolves, instead of hanging (proves the BLOCKER fix) | Done |
| `withTimeout` races a promise against a deadline correctly | Unit | resolves/rejects with the right value in each of: settles first, rejects first, times out, resolves-then-timer-is-moot | Done |
| `buildJsonResponse` sets the real status and the X-Request-Id header | Unit | uses the envelope's own statusCode as the real HTTP status / sets X-Request-Id to the given request id | Done |
| Repository round-trips a real row in Postgres | Integration | inserts a real row in Postgres for every health check | Done |
| Web enqueues a job the worker actually processes via real Redis | Integration | processes a system-ping job through BullMQ and resolves with a workerInstanceId | Done |
| Homepage reports the database's own status, not the queue's | Unit | reports the database as up even when only the queue is down (regression test for a MAJOR audit finding) | Done |
| Homepage shows live "up" status end to end | End-to-end | shows the database as up on the homepage when the full stack is healthy | Done |
| Homepage shows live "down" status end to end (main failure path) | End-to-end | - | **Deferred** (see note) |
| `docker compose up` boots all 5 services and answers over the network | Manual + logs | `docker compose up --build`, then curl + cross-container job proof, plus a live degraded-then-recovered check (stop/start `postgres`) | Done |

**Deferred:** the "database down" end-to-end browser scenario needs the running app to
see an unreachable Postgres while the *other* e2e test in the same run needs it reachable.
Doing that safely needs fault-injection infra (a second webServer/project pointed at a
bad `DATABASE_URL`, or a test-only toggle) that this foundation ticket does not build.
The behavior itself is proven at the unit level (`health.service.test.ts`) and now also
at the integration/HTTP level (`route.integration.test.ts`, added during implementation)
by pointing a real Prisma client at an unreachable port and asserting the actual
`GET`-shaped `Response`. Revisit if a later ticket adds the fault-injection harness.

## Phase 4 - Implementation notes

Built in this order: Next.js baseline (`create-next-app`) merged with the repository
preset -> Prisma schema/config (hand-written, see note above) -> shared infra
(`env`, `errorCode`/`ApplicationError`, envelope, `errorHandler`, `logger`,
`prismaClient`, `redisConnection`) -> `health` module (`repository` -> `service` -> unit
tests -> `controller` -> `route` -> integration tests) -> `systemPing` module
(`processor` unit-tested first, then `queue`/`worker` wiring -> integration test) ->
`worker.ts` entrypoint -> frontend (`HealthStatusCard` + homepage) -> `e2e` spec -> real
Postgres migration -> `docker compose up --build` for the full stack.

Deviations from Phase 1/2, decided while implementing:

- **Layering caught a real bug**: the first draft of `health.controller.ts` constructed
  `HealthRepository` directly, which `import/no-restricted-paths` correctly rejected
  ("a controller must not touch a repository"). Fixed by adding
  `health.factory.ts` (a composition root) that both `route.ts` and `page.tsx` use to
  build a `HealthService`; the controller now only receives one as a parameter.
- **Static generation bug caught by the Docker build**: `src/app/page.tsx` was silently
  pre-rendered as a *static* page at build time by default, baking one build-time health
  snapshot into the HTML forever. Fixed with `export const dynamic = "force-dynamic"`.
  This is the kind of bug that only a real `docker compose up --build` surfaces, not
  `npm run dev`.
- **Docker fixes**: `npm ci`'s default `prepare` script (`husky`) has no business running
  in a container (no `.git`, and `husky` is a devDependency `--omit=dev` doesn't install)
  - both `npm ci` calls in the `Dockerfile` now pass `--ignore-scripts`. The build stage
  also needs a placeholder `DATABASE_URL`/`REDIS_URL` (never a real one) because
  `prisma generate` and `next build` both load the env-validation module at build time;
  the runner stage gets its real values from `docker-compose.yml` at container start.
  The runner image was also missing `tsconfig.json`, which `tsx` needs at runtime to
  resolve the `@/*` path alias - added to the `COPY` list.
- **ESLint**: mixing `@eslint/json` and `@eslint/css` (added so the repo's own pre-edit
  hook can lint JSON/CSS files without false "unconfigured file" warnings) into one flat
  config alongside the TypeScript rule set requires scoping the TS/type-checked rule sets
  to JS/TS files explicitly (`files` + `extends`), or they get applied to JSON/CSS files
  too and crash looking for a TypeScript parser. See `eslint.config.mjs` comments.
- Coverage thresholds (80% floor) apply only to unit-testable logic (services, pure
  processors, components, shared utilities) - repositories, controllers, queues, and
  worker/wiring factories are excluded from the unit coverage report because they are
  proven by integration tests instead, per `testing-standard`'s test-level table.
  `page.tsx` and `loading.tsx` are deliberately *not* in that exclusion list even though
  they contain JSX that never runs under Vitest - narrowed during the audit round below
  so a future page with real logic (like this one) cannot hide an untested branch inside
  a blanket `src/app/**` exclude again. Overall coverage after that change: 91.8%
  statements / 90.9% branches / 90.47% functions / 91.8% lines - still comfortably above
  the 80% floor.

### Audit round (`/audit`, 2026-08-08)

Four independent reviewers (backend, frontend, test, contract-guard) read the diff cold.
Confirmed findings and what was done about each:

- **BLOCKER - health check could hang forever.** `redisConnection` is configured with
  `maxRetriesPerRequest: null` (BullMQ requires this for its blocking Worker commands),
  which also means ioredis queues commands forever instead of failing when Redis is
  unreachable - so `RedisConnectionChecker.checkConnection()` never resolved or rejected
  during a real Redis outage, and the request just hung. Fixed by adding
  `src/shared/async/withTimeout.ts` (a generic promise-vs-deadline race, unit-tested) and
  redesigning `HealthService` around it (see below).
- **MAJOR - a queue outage was reported as a database outage.** The original
  `HealthService.getHealthStatus()` checked the database, then the queue, and threw on
  the *first* failure with a generic error - so `page.tsx`'s catch-all mapped any
  rejection to `database: "down"`, even when the database was fine and only the queue was
  down. Fixed by redesigning the service to check both dependencies in parallel (each
  wrapped in the new 2-second timeout) and always resolve with a full
  `{ database, queue }` status - it never throws for an expected "a dependency is down"
  outcome anymore, only for a genuine bug. The controller now inspects the returned
  status to decide 200 vs 503 and builds one `errors[]` entry per actually-down
  dependency; the homepage reads `status.database` directly, which is accurate
  regardless of the queue's state. This also made the old "checks the database before
  the queue" unit test obsolete (parallel-and-independent is the new, correct behavior)
  - replaced with tests for each dependency independently and for the timeout itself.
- **MAJOR - no loading state.** The homepage is `force-dynamic` and awaits two live
  dependency checks before it can render anything, with no `loading.tsx` and no Suspense
  boundary. Added `src/app/loading.tsx` (Next's file-based Suspense boundary), styled
  from the same tokens as `HealthStatusCard`.
- **MAJOR - `page.tsx`'s catch branch had no test, and the coverage config hid that.**
  `vitest.config.ts` blanket-excluded `src/app/**` from coverage, which also hid this
  file's own conditional logic, not just route wiring. Fixed by exporting
  `getDatabaseStatus(healthService)` (dependency-injected, same pattern as
  `handleGetHealth`) with its own unit tests, and narrowing the coverage exclude to
  `src/app/**/route.ts` + `src/app/layout.tsx` specifically (pure wiring/config) instead
  of the whole directory.
- **MAJOR - the API contract's `X-Request-Id` header was never set.** Every response
  used a bare `Response.json(body, { status })`. Added
  `src/shared/http/jsonResponse.ts` (`buildJsonResponse`, unit-tested) as the one place a
  route turns an envelope into a `Response`, so every future endpoint gets the header for
  free instead of by remembering to add it by hand.
- **MAJOR - migration used `TIMESTAMP` instead of `TIMESTAMPTZ`.** `backend-standard` is
  explicit that timestamps are `TIMESTAMPTZ`. Since this was the first migration, the
  wrong type would have been the template every later model copied. Added
  `@db.Timestamptz()` and a follow-up migration
  (`20260808054601_checked_at_timestamptz`), applied against the running Postgres.
- **MINOR** (all fixed): `systemPing.worker.ts` imported the producer-side
  `systemPing.queue.ts` module just to read the `SYSTEM_PING_QUEUE_NAME` string, which
  eagerly constructed an unused BullMQ `Queue` (producer) in the worker process - the
  constant moved to `systemPing.types.ts`, which both `queue.ts` and `worker.ts` now
  import instead. `errorHandler.ts`'s generic-error branch hardcoded the string literal
  `"INTERNAL_ERROR"` instead of `ErrorCode.INTERNAL_ERROR` - fixed. The Dockerfile copied
  `*.test.ts`/`*.integration.test.ts` into both build stages and the final runner image -
  added to `.dockerignore`. `HealthStatusCard`'s prop type and `page.tsx`'s local
  duplicated the `"up" | "down"` union instead of importing `DependencyStatus` from
  `health.types.ts` - fixed.
- **Verified, not just fixed**: after the fixes, `npm run test` (91.8% coverage, still
  above the 80% floor), `npm run test:integration` (including a new assertion that
  `X-Request-Id` matches the body's `requestId`), and `npm run test:e2e` were all re-run
  and pass. The full `docker compose up --build` stack was rebuilt, and the timeout fix
  was verified against a *real* outage, not just a unit test: stopping the `postgres`
  container and curling `/api/v1/health` returned `503` in well under a second (rather
  than hanging), and starting `postgres` back up recovered to `200` within Postgres's own
  ~6-second health-check window.
- One operational lesson from this round, not a code finding: a stale `worker` container
  left running from an earlier manual Docker test (built before these fixes) competed
  with the local Vitest run for jobs on the same Redis queue and caused one flaky-looking
  integration test failure. Stopping `docker compose`'s `web`/`worker` before running
  local integration tests (or vice versa) avoids two workers racing on one queue.

### Audit round 2 (re-`/audit` after the round 1 fixes)

Re-running all four auditors against the round-1 fixes found: round 1's fixes for the
BLOCKER, the mislabeling bug, the header, `TIMESTAMPTZ`, and all the MINORs held up under
direct re-inspection (and, for the coverage claim, under mutation testing). Three real
problems from the fix round itself:

- **The claimed fix for "`page.tsx`'s catch branch is untested" did not actually close
  the gap.** Extracting `getDatabaseStatus` and testing it with a real `HealthService`
  looked right, but `HealthService.getHealthStatus()` was redesigned in the same round to
  never reject - so the real service could never drive the `catch` branch under test, no
  matter how the checkers were configured. The test auditor proved this by mutation
  (deleting the `try/catch` left every test green). Fixed for real with a
  `CrashingHealthService` subclass whose `getHealthStatus()` genuinely rejects, in both
  `page.test.ts` and a new `health.controller.test.ts` (the controller has the identical
  shape of bug in its own outer `catch`, not previously flagged, fixed the same way).
- **`checkDependency` discarded the real failure with no log line**, and **the shared,
  `maxRetriesPerRequest: null` Redis connection could still queue an abandoned `.ping()`
  forever even with the timeout in place**, undercutting the BLOCKER fix during a
  sustained outage. Fixed: `logger.warn` on every dependency failure, and
  `health.redisConnectionChecker.ts` now uses its own dedicated Redis connection with
  `enableOfflineQueue: false` so a disconnected ping fails immediately - `withTimeout` is
  now a backstop for slowness, not the only defense against a hang.
- **New flaky integration test, caused by this round's own change**: checking both
  dependencies in parallel (`Promise.all`) meant Prisma's and the new dedicated Redis
  connection's cold starts now compete the moment the test file's module graph first
  loads, and a disconnected-yet ping under `enableOfflineQueue: false` fails immediately
  instead of queuing - so the very first call after a fresh test run could report `503`
  before either connection had finished connecting. Reproduced consistently (3/3 runs)
  before the fix. Fixed with a `beforeAll` warm-up call in
  `route.integration.test.ts`, the same role `docker-compose.yml`'s `start_period` plays
  in production. Verified stable across 3 consecutive `test:integration` runs after the
  fix.
- Also fixed: `health.controller.ts` re-declared `503` locally instead of reusing the
  now-exported `HTTP_STATUS_SERVICE_UNAVAILABLE`; `loading.tsx` shipped with zero test
  coverage (added `loading.test.tsx`); a stale comment in `e2e/health.critical.spec.ts`
  referenced a test name that no longer existed after the `health.service.ts` redesign.

Final coverage after both rounds: 96.05% statements / 94.73% branches / 95.65% functions
/ 96.05% lines. `withTimeout.ts`'s non-`Error`-rejection normalization branch remains
deliberately untested - constructing a non-`Error` rejection anywhere in this codebase,
including in a test, is itself blocked by `@typescript-eslint/prefer-promise-reject-errors`
(confirmed by trying it), so exercising that one defensive branch would require the test
to violate the same rule the rest of the codebase is held to. Noted, not hidden.

Verified for real, not just "should work":

- [x] Migration and model - `npx prisma migrate dev` against the docker-compose Postgres,
      including the audit-driven `TIMESTAMPTZ` follow-up migration.
- [x] Repository, with integration test.
- [x] Service and business rules, with unit tests (redesigned mid-ticket per the audit -
      see above; 91.8% overall coverage, every dependency-status and timeout branch
      covered).
- [x] Controller, route, schemas, with endpoint integration tests (database-down path,
      and the `X-Request-Id` header).
- [x] Frontend data layer, then components, with unit tests (including `page.tsx`'s own
      logic, added during the audit round).
- [x] End-to-end test for the happy-path flow (Playwright, 4 browser/device projects).
- [x] `docker compose up --build`: both `web` and `worker` start from the same image;
      `curl localhost:3000/api/v1/health` returns a live healthy envelope with the
      `X-Request-Id` header; a job enqueued from inside the `web` container was observed
      completing in the `worker` container's logs; stopping/starting `postgres` live
      proved the 503-on-outage and recovery-to-200 behavior for real.
- [x] Documentation updated: `README.md` added at the repo root.
- [x] `/audit` - two rounds. Round 1: four reviewers, 1 BLOCKER + 5 MAJOR + 5 MINOR
      confirmed and fixed. Round 2 (re-auditing the round 1 fixes): found the claimed
      test-coverage fix hadn't actually closed the gap (proven by mutation testing), a
      remaining hang risk in the Redis path, and a flaky test caused by the round 1
      redesign itself - all fixed and re-verified, see above.
- [x] `/ship` - format/lint/typecheck/unit(96.05% coverage)/integration(stable across 3
      runs)/e2e all green; suppression, leftover, and secret sweeps clean; final
      `docker compose up --build` rebuilt and re-verified.
