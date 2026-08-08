# MOMENTA-0005: Script Generation Engine

**Status:** Proposed
**Requirement area:** [docs/requirements/02-script-generation-engine.md](../requirements/02-script-generation-engine.md)
**Depends on:** MOMENTA-0003 (moment engine), MOMENTA-0002 (user accounts)

## Phase 1 - Scope

**Goal:** for a given date and the logged-in user's niche, the system produces a ready
script (text + search keywords) deterministically - no AI call, no manual writing.

**Acceptance criteria**

- [ ] A template bank (database rows, not hardcoded strings) stores sentences with
      variable slots per moment category.
- [ ] A niche dictionary (database rows) supplies slot values per business category;
      MVP ships with at least 3-4 niches (PRD §13: kuliner, fashion, jasa, kerajinan).
- [ ] Template selection excludes any template the same user was given in the last N
      days (anti-repetition), then picks randomly among the remaining matches for the
      date's moment category.
- [ ] `POST /api/v1/scripts/generate` (`{ date, niche }`) produces one script:
      `{ text, keywords[], momentId, category }`.
- [ ] `POST /api/v1/scripts/generate-month` produces one script per moment-bearing date
      in the requested month for the current user, in one call.
- [ ] `GET /api/v1/scripts/:id` returns a previously generated script; `404` for another
      user's script id (never leaks its existence).
- [ ] `POST /api/v1/scripts/:id/regenerate` re-rolls the template for that same date,
      respecting the same anti-repetition rule, and overwrites the stored script.
- [ ] Keywords are produced from a static moment+niche -> English search-term lookup
      table, for later use as Pexels/Pixabay queries (consumed by MOMENTA-0006).
- [ ] If no template exists for a date's category + the user's niche, the endpoint
      returns a clear `422`/`404`-class error rather than a silent empty script - this
      is a content-ops gap (PRD §12), not a crash.

**Out of scope**

- Any generative AI text - explicitly a PRD non-goal.
- Actually sourcing/rendering video - MOMENTA-0006.
- The template/niche-dictionary content-management UI (PRD §14 nice-to-have,
  "panel isi template mudah") - for MVP, templates and dictionaries are seeded directly
  in the database.

**Affected surface**

- New tables: `templates`, `nicheDictionaries`, `userTemplateHistory`,
  `generatedScripts` (PRD §9).
- New module: `src/modules/scripts/*`.
- Seed data: an initial template bank and niche dictionaries for the 3-4 MVP niches,
  checked in as a Prisma seed script.

**Risks**

- None touching auth/money/personal data directly. The main risk is content quality
  (template variety), which PRD §12 already names as an operational risk, not a
  technical one - not a blocker for this ticket's acceptance criteria.

## Phase 2 - Contract

**`POST /api/v1/scripts/generate`** - body `{ date, niche }` -> `201`,
`data: { id, text, keywords, momentId, category, date }`.

**`POST /api/v1/scripts/generate-month`** - body `{ month, year }` -> `201`,
`data: [{ id, text, keywords, momentId, category, date }, ...]`.

**`GET /api/v1/scripts/:id`** -> `200`, same shape as one item above.

**`POST /api/v1/scripts/:id/regenerate`** -> `200`, same shape, `id` unchanged, `text`/
`keywords` replaced.

**Migration:**

```prisma
model Template {
  id             String  @id @default(cuid())
  momentCategory String  @map("moment_category")
  niche          String
  templateText   String  @map("template_text")
  isActive       Boolean @default(true) @map("is_active")

  @@index([momentCategory, niche, isActive])
  @@map("templates")
}

model NicheDictionary {
  id           String @id @default(cuid())
  niche        String
  variableKey  String @map("variable_key")
  value        String

  @@index([niche, variableKey])
  @@map("niche_dictionaries")
}

model UserTemplateHistory {
  id         String   @id @default(cuid())
  userId     String   @map("user_id")
  templateId String   @map("template_id")
  usedAt     DateTime @default(now()) @map("used_at")

  @@index([userId, templateId, usedAt])
  @@map("user_template_history")
}

model GeneratedScript {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  momentId  String   @map("moment_id")
  date      DateTime @db.Date
  finalText String   @map("final_text")
  keywords  String[]
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([userId, date])
  @@map("generated_scripts")
}
```

**Error codes used:** `RESOURCE_NOT_FOUND` (404, no template for the category/niche, or
script belongs to another user), `VALIDATION_FAILED` (422, unknown niche) - already in
the shared enum.

## Phase 3 - Test plan

| Acceptance criterion | Test level | Test name |
| --- | --- | --- |
| Template selection excludes recently-used templates | Unit | never selects a template used by this user in the last N days when an alternative exists |
| Template selection falls back when all templates were recently used | Unit | selects a template anyway when every match was recently used, rather than failing |
| Slot filling produces final text with no unfilled placeholder | Unit | fills every variable slot from the niche dictionary and product data |
| Keyword lookup maps moment+niche to English terms | Unit | maps a known moment and niche to its expected keyword list |
| Generate happy path | Integration | returns 201 with a script for the requested date and niche |
| Generate-month produces one script per moment-bearing date | Integration | returns one script per moment-bearing date in the requested month |
| Regenerate respects anti-repetition and overwrites | Integration | regenerates the script for the same date without repeating the just-used template |
| Reading another user's script id is not found | Integration | returns 404 for a script id belonging to another user |
| Missing template for niche/category is a clear error, not a crash | Integration | returns a typed error when no template exists for the requested niche and category |

## Phase 4 - Implementation notes

Not started.
