# 01. Moment & Calendar Engine

**Status:** Proposed
**PRD source:** [PRD.md §5.1](../../PRD.md#51-moment--calendar-engine)
**Depends on:** none (foundational data layer for everything else)

## Summary

Classify every date of the month into one or more moment categories (national holiday,
religious holiday, payday, start/end of month, weekend, generic promo), from a data source
that does not depend on a live third-party API at runtime.

## Functional requirements

- [ ] Indonesian public holidays and joint-leave days (`cuti bersama`) are vendored as a
      static JSON file per calendar year inside the repo - not fetched live at runtime.
- [ ] A documented, manual, once-a-year refresh process updates that file, cross-checked
      against the official SKB 3 Menteri release (see PRD §5.1 for sourcing).
- [ ] Computed moments (payday on the 25th and the 1st, start of month, end of month,
      weekend) are derived purely from the date - no external data needed.
- [ ] Every date resolves to one or more categories: `hari_besar_keagamaan`,
      `hari_besar_nasional`, `gajian`, `awal_bulan`, `akhir_bulan`, `weekend`,
      `generic_promo`.
- [ ] `GET /api/v1/moments?month=&year=` returns every moment for the requested month.

## Locked decisions (PRD §15)

- No runtime dependency on `APIHariLibur_V2` or `api-harilibur.vercel.app` - they are
  populate/cross-check sources for the annual manual refresh only.

## Related tickets

- [MOMENTA-0003](../tickets/MOMENTA-0003-moment-calendar-engine.md)
