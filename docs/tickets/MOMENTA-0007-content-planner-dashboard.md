# MOMENTA-0007: Content Planner Dashboard

**Status:** Proposed
**Requirement area:** [docs/requirements/05-content-planner-dashboard.md](../requirements/05-content-planner-dashboard.md)
**Depends on:** MOMENTA-0003 (moments), MOMENTA-0005 (scripts), MOMENTA-0006 (render)

## Phase 1 - Scope

**Goal:** a user opens one calendar screen, sees exactly what state every date in the
month is in, generates the whole month in one action, and can preview/reroll/download
per date - this is the screen PRD §1 calls the entire point of the product ("buka
kalender, pencet generate, download, upload").

**Acceptance criteria**

- [ ] `GET /api/v1/calendar?month=` returns, per date, one of
      `not_generated | job_running | draft_ready | downloaded`, derived from that date's
      `generatedScripts`/`renderJobs`/`generatedAssets` rows - not a separate, manually
      kept status field that can drift from the real data.
- [ ] The calendar screen renders this status visually at 360px first (mobile-first,
      per `frontend-standard`), before any wider layout is added.
- [ ] "Generate the whole month" enqueues `POST /api/v1/scripts/generate-month`
      followed by a render job per resulting script, and the calendar reflects each
      date's progress as it happens (polling or equivalent), not only after everything
      finishes.
- [ ] The per-date preview page shows the script text, lets the user reroll one
      mismatched clip (calls a not-yet-built `POST /api/v1/render-jobs/:id/reroll-clip`
      - flagged as a new endpoint this ticket must add, not implied by MOMENTA-0006),
      and download once ready.
- [ ] Every list/grid state (empty month with no moments, loading, error) is handled
      explicitly - PRD's whole premise breaks if a network hiccup shows a blank screen
      with no explanation.
- [ ] Marking a date "downloaded" happens automatically when the download link is
      actually used, not on a separate manual button (matches PRD §5.5's three-state
      description).

**Out of scope**

- The optional H-1 reminder notification (PRD §7 step 5) - separate ticket,
  MOMENTA-0008, since it needs a notification channel decision not required for the
  core loop.
- Batch ZIP export (PRD §14 nice-to-have).

**Affected surface**

- New module: `src/modules/calendar/*` (a read-model/aggregation service over
  `moments`, `generatedScripts`, `renderJobs`, `generatedAssets` - no new table of its
  own).
- New endpoint on the render module: `POST /api/v1/render-jobs/:id/reroll-clip`.
- New screens: `src/app/(dashboard)/calendar/page.tsx`,
  `src/app/(dashboard)/calendar/[date]/page.tsx`.

**Risks**

- None touching auth/money/personal data directly, but this is the screen the entire
  product's usability rests on - the mobile-first and empty/loading/error-state
  acceptance criteria are not polish, they are the acceptance bar per
  `frontend-standard`'s definition of done.

## Phase 2 - Contract

**`GET /api/v1/calendar?month=8&year=2026`** -> `200`,
`data: [{ date, status, scriptId, renderJobId, assetId }]` (nullable ids depending on
`status`).

**`POST /api/v1/render-jobs/:id/reroll-clip`** - body `{ sentenceIndex }` -> `202`,
`data: { jobId, status: "rendering" }` (re-enters the render pipeline for one clip only).

**Component states (`CalendarGrid`, `DatePreview`):** `loading`, `empty` (no moments this
month), `error` (calendar fetch failed), `populated` - all four required per
`frontend-standard`'s "every list has an explicit empty/loading/error state" rule.

## Phase 3 - Test plan

| Acceptance criterion | Test level | Test name |
| --- | --- | --- |
| Status derived correctly from underlying rows | Unit | derives not_generated, job_running, draft_ready, and downloaded from the correct combination of script/job/asset rows |
| Calendar endpoint happy path | Integration | returns 200 with one status entry per day of the requested month |
| Generate-the-month enqueues per-date work | Integration | enqueues a script and a render job for every moment-bearing date in the month |
| Reroll-clip re-enters the pipeline for one clip | Integration | returns 202 and re-renders only the targeted sentence's clip |
| Download marks the date downloaded | Integration | flips a date's status to downloaded the first time its asset is actually downloaded |
| Mobile layout at 360px | Component/visual | renders the calendar grid without horizontal scroll at 360px width |
| Empty, loading, and error states render distinctly | Unit | shows the correct one of empty, loading, error, or populated for each calendar fetch outcome |
| Full month-generate-to-download flow | End-to-end | a user generates a full month, opens one date, rerolls a clip, and downloads the result |

## Phase 4 - Implementation notes

Not started.
