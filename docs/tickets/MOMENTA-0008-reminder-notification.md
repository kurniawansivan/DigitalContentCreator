# MOMENTA-0008: H-1 reminder notification

**Status:** Proposed
**Requirement area:** [docs/requirements/05-content-planner-dashboard.md](../requirements/05-content-planner-dashboard.md) (PRD §7 step 5, Fase 2 per PRD §13)
**Depends on:** MOMENTA-0007 (calendar status model)

## Phase 1 - Scope

**Goal:** a user gets an in-app reminder the day before that tomorrow's content is ready,
so the product proactively closes the loop instead of relying on the user remembering to
check.

**Acceptance criteria**

- [ ] A daily scheduled job (BullMQ repeatable job, not a request-path call) runs
      off-peak and finds, per user, any date exactly one day ahead whose status is
      `draft_ready` or `downloaded`.
- [ ] Exactly one reminder is created per user per date - re-running the job (or a
      redelivered job) never creates a duplicate.
- [ ] `GET /api/v1/notifications` (authenticated) returns the current user's unread and
      recent reminders.
- [ ] `POST /api/v1/notifications/:id/read` marks one reminder read; a user cannot mark
      another user's notification read.
- [ ] In-app only for this ticket - WhatsApp delivery is PRD §14's nice-to-have, a later
      ticket, not this one.

**Out of scope**

- WhatsApp/email delivery channels (PRD §14 nice-to-have).
- Per-user notification preferences (opt out, quiet hours) - not in PRD MVP scope; if
  requested later, it is a new ticket, not a scope add here.

**Affected surface**

- New table: `notifications` (not in PRD §9's original sketch - added here since PRD §7
  step 5 requires persisting a reminder, not just firing a transient push).
- New module: `src/modules/notifications/*`.
- New scheduled job registered alongside the worker scaffolded in MOMENTA-0001.

**Risks**

- None touching auth/money/personal data. The one correctness risk is double-sending
  (idempotency of the daily job across BullMQ's at-least-once delivery), covered
  explicitly below.

## Phase 2 - Contract

**`GET /api/v1/notifications`** -> `200`,
`data: [{ id, date, message, isRead, createdAt }]`.

**`POST /api/v1/notifications/:id/read`** -> `200`, `data: { id, isRead: true }`.

**Migration:**

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  date      DateTime @db.Date
  message   String
  isRead    Boolean  @default(false) @map("is_read")
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([userId, date])
  @@map("notifications")
}
```

The `@@unique([userId, date])` constraint is what makes the daily job idempotent: a
redelivered or re-run job attempting to insert the same reminder twice hits a constraint
violation, which the job treats as "already sent," not an error.

**Error codes used:** `RESOURCE_NOT_FOUND` (404, marking a nonexistent/other-user's
notification read) - already in the shared enum.

## Phase 3 - Test plan

| Acceptance criterion | Test level | Test name |
| --- | --- | --- |
| Job finds the right dates | Unit | selects only dates exactly one day ahead with status draft_ready or downloaded |
| Job is idempotent under redelivery | Unit | creates exactly one notification when the same job payload runs twice |
| Notifications list happy path | Integration | returns 200 with the current user's notifications only |
| Mark-read happy path | Integration | marks a notification read and returns 200 |
| Cannot mark another user's notification read | Integration | returns 404 when marking a notification belonging to another user |
| End-to-end reminder appears in the UI | End-to-end | a user with tomorrow's content ready sees an unread reminder after the job runs |

## Phase 4 - Implementation notes

Not started.
