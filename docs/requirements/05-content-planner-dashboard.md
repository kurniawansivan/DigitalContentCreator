# 05. Content Planner Dashboard

**Status:** Proposed
**PRD source:** [PRD.md §5.5](../../PRD.md#55-content-planner-dashboard)
**Depends on:** [01](./01-moment-calendar-engine.md), [02](./02-script-generation-engine.md), [03](./03-reelkit-video-assembly.md)

## Summary

The monthly calendar view is the product's control center: at a glance, which dates have
content generated, in progress, ready, or downloaded, plus a one-click "generate the whole
month" action and a per-date preview/reroll/download flow.

## Functional requirements

- [ ] Monthly calendar view shows, per date, one of: not generated / job running / draft
      ready / downloaded - kept in sync with render job status
      (PRD §5.3 / [03](./03-reelkit-video-assembly.md)).
- [ ] "Generate the whole month" enqueues generation for every moment-bearing date in the
      current month in one action.
- [ ] Per-date preview page: re-read the script text, reroll one mismatched clip, then
      download.
- [ ] `GET /api/v1/calendar?month=` returns per-date status for the requested month.
- [ ] Optional (PRD §7 step 5): a day-before reminder notification that "tomorrow's content
      is ready."

## Related tickets

- (none yet)
