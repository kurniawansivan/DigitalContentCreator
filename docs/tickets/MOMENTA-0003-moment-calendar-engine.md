# MOMENTA-0003: Moment & Calendar Engine

**Status:** Proposed
**Requirement area:** [docs/requirements/01-moment-calendar-engine.md](../requirements/01-moment-calendar-engine.md)
**Depends on:** MOMENTA-0001

## Phase 1 - Scope

**Goal:** for any requested month, the system returns every date's moment category
(national holiday, payday, weekend, etc.) so the script engine has something to key
templates on.

**Acceptance criteria**

- [ ] A JSON file per calendar year, vendored in the repo (`src/modules/moments/data/`),
      holds Indonesian national holidays and `cuti bersama` dates - not fetched from a
      live API at request time.
- [ ] A documented refresh script/runbook (not a runtime cron) regenerates that file
      once a year from `APIHariLibur_V2`, cross-checked against the official SKB 3
      Menteri release, per PRD §5.1 and §15.
- [ ] Computed moments need no data file: payday (25th and 1st), start of month, end of
      month, and weekend are derived purely from the date.
- [ ] Every date resolves to one or more categories: `hari_besar_keagamaan`,
      `hari_besar_nasional`, `gajian`, `awal_bulan`, `akhir_bulan`, `weekend`,
      `generic_promo`.
- [ ] `GET /api/v1/moments?month=&year=` (authenticated) returns every moment for the
      requested month in the envelope, `data` as an array.
- [ ] Requesting a month/year outside a sane range (e.g. year 1900, month 13) returns
      `422 INVALID_PARAMETER`, not a crash or an empty array.

**Out of scope**

- Any live third-party API call at request time - vendored data only (see risk below).
- Per-user moment overrides / custom business moments - PRD §14 nice-to-have
  ("mode isi cepat"), a later ticket.

**Affected surface**

- New table: `moments` (PRD §9: `id, date, name, category, source`).
- New module: `src/modules/moments/*`.
- New vendored data file(s): `src/modules/moments/data/holidays-<year>.json`.

**Risks**

- The single real risk is letting a live external call leak into the request path by
  accident (e.g. a "just this once" fetch during development that never gets removed).
  The integration test for this ticket must assert no outbound network call happens
  during a request to `/api/v1/moments` (mock the HTTP client at the process boundary
  and assert it is never invoked).

## Phase 2 - Contract

**`GET /api/v1/moments?month=8&year=2026`** -> `200`,
`data: [{ id, date, name, category, source }]`, `meta: null` (small, fixed-size result -
no pagination needed for a single month).

`category` is one of `hari_besar_keagamaan | hari_besar_nasional | gajian | awal_bulan |
akhir_bulan | weekend | generic_promo`. `source` is `vendoredJson | computed`.

**Migration:**

```prisma
model Moment {
  id       String   @id @default(cuid())
  date     DateTime @db.Date
  name     String
  category String
  source   String

  @@unique([date, category])
  @@map("moments")
}
```

**Error codes used:** `INVALID_PARAMETER` (422, out-of-range month/year) - already in the
shared enum.

## Phase 3 - Test plan

| Acceptance criterion | Test level | Test name |
| --- | --- | --- |
| Payday, start/end of month, weekend computed correctly | Unit | classifies the 1st, 25th, last day of month, and a Saturday/Sunday correctly |
| Boundary dates (28/29/30/31-day months) | Unit | classifies end-of-month correctly for February in a leap and non-leap year |
| Vendored holiday lookup returns the right category | Unit | classifies a vendored national holiday date as hari_besar_nasional |
| No live network call happens for a request | Integration | never calls the outbound HTTP client when resolving a month's moments |
| Happy path endpoint | Integration | returns 200 with every moment for the requested month in the envelope |
| Out-of-range month/year rejected | Integration | returns 422 INVALID_PARAMETER for an invalid month or year |
| Unauthenticated request rejected | Integration | returns 401 AUTHENTICATION_REQUIRED without a token |

## Phase 4 - Implementation notes

Not started.
