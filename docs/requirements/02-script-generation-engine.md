# 02. Script Generation Engine

**Status:** Proposed
**PRD source:** [PRD.md §5.2](../../PRD.md#52-script-generation-engine-tanpa-ai)
**Depends on:** [01. Moment & Calendar Engine](./01-moment-calendar-engine.md)

## Summary

Deterministic, template-based script generation - no generative AI. For a given date and
user niche, pick a template that matches the date's moment category, fill its variable
slots from a niche dictionary and the user's product data, and produce search keywords for
the video-assembly step.

## Functional requirements

- [ ] A template bank stores sentences with variable slots per moment category, as data
      (database rows), not hardcoded in application code.
- [ ] A niche dictionary provides slot values (`ctaVerb`, `promoType`, etc.) per business
      category (starting with 3-4 categories per PRD §13 MVP scope).
- [ ] Template selection excludes any template used by that same user within the last N
      days (anti-repetition), then picks randomly among the remaining matches.
- [ ] Output shape: `{ text, keywords[], momentId, category }`.
- [ ] Keywords are mapped from moment name + niche to English search terms via a static
      lookup table, for use as Pexels/Pixabay query terms.
- [ ] `POST /api/v1/scripts/generate`, `POST /api/v1/scripts/generate-month`,
      `GET /api/v1/scripts/:id`, `POST /api/v1/scripts/:id/regenerate`.

## Related tickets

- (none yet)
