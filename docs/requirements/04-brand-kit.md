# 04. Brand Kit / Style Customization

**Status:** Proposed
**PRD source:** [PRD.md §5.4](../../PRD.md#54-brand-kit--kustomisasi-style-fe-per-user)
**Depends on:** none (consumed by [03. Reelkit Video Assembly](./03-reelkit-video-assembly.md) at render time)

## Summary

Per-user styling (colors, font, text position, logo watermark) that `reelkit` applies at
render time as a parameter, not as a hardcoded template. Ships with starter presets so a
new user is never looking at a blank state.

## Functional requirements

- [ ] User-configurable: primary color, accent color, font (from a validated, limited
      list), text position (top/middle/bottom), logo watermark (upload + position).
- [ ] Automatic WCAG AA contrast check on primary + accent color selection, shown as a
      non-blocking advisory warning - this is in MVP scope (locked decision, PRD §15).
- [ ] Stored as one JSON object per user; `reelkit` reads it as a styling parameter.
- [ ] At least three starter "vibe" presets (e.g. pastel playful, bold minimal, earthy
      warm) available before any manual customization.
- [ ] `GET /api/v1/brand-kit`, `PUT /api/v1/brand-kit` (response includes the contrast
      check result).

## Related tickets

- (none yet)
