# MOMENTA-0004: Brand Kit & Style Customization

**Status:** Proposed
**Requirement area:** [docs/requirements/04-brand-kit.md](../requirements/04-brand-kit.md)
**Depends on:** MOMENTA-0002 (user accounts)

## Phase 1 - Scope

**Goal:** a user can set (or start from a preset) the colors, font, text position, and
logo that every rendered video will use, with a plain-language warning if their color
choice is hard to read.

**Acceptance criteria**

- [ ] `GET /api/v1/brand-kit` returns the current user's brand kit, or a default preset
      if they have not customized one yet (never a bare 404 - "no brand kit yet" is not
      an error state).
- [ ] `PUT /api/v1/brand-kit` updates primary color, accent color, font (validated
      against a fixed allowed list), text position (`top | middle | bottom`), and logo
      watermark (upload + position).
- [ ] The response to `PUT /api/v1/brand-kit` includes a WCAG AA contrast check result
      for primary-vs-background and accent-vs-background; a failing contrast is a
      warning in the response, never a validation error that blocks saving (locked
      decision, PRD §5.4 / §15).
- [ ] At least three starter presets ("pastel playful", "bold minimal", "earthy warm")
      are selectable and pre-fill the same fields `PUT` accepts.
- [ ] Logo upload validates the file by inspecting its bytes (real image format), not by
      trusting the extension or declared content type, and caps file size.
- [ ] A user can only ever read or write their own brand kit - never another user's
      (ownership check in the service, not only the route).

**Out of scope**

- Applying the brand kit during render - that is MOMENTA-0006's job; this ticket only
  stores and validates it.
- A brand-kit version history / undo - not in PRD MVP scope.

**Affected surface**

- New table: `brandKits` (PRD §9).
- New module: `src/modules/brandKit/*`.
- Logo files land in the same S3-compatible storage the render pipeline will use
  (MinIO locally / R2 in production, per PRD §11) - this ticket only needs a `logos/`
  prefix; the shared storage client itself is scaffolded in MOMENTA-0001.

**Risks**

- File upload handling: must validate real bytes and cap size (security.md upload
  rules), or this becomes the first unauthenticated-content-type vulnerability in the
  codebase. Logo upload is the only file-upload surface in this ticket - not user-facing
  arbitrary file execution risk, but still validated as if it were.

## Phase 2 - Contract

**`GET /api/v1/brand-kit`** -> `200`,
`data: { primaryColor, accentColor, font, textPosition, logoUrl, contrastWarning }`.

**`PUT /api/v1/brand-kit`** - body `{ primaryColor, accentColor, font, textPosition,
logoFile? }` -> `200`, same shape as `GET`, `contrastWarning: { primaryOnBackground:
boolean, accentOnBackground: boolean }` (`true` means "passes AA", per the locked
decision this is advisory only).

**Migration:**

```prisma
model BrandKit {
  id           String  @id @default(cuid())
  userId       String  @unique @map("user_id")
  primaryColor String  @map("primary_color")
  accentColor  String  @map("accent_color")
  font         String
  textPosition String  @map("text_position")
  logoUrl      String? @map("logo_url")

  @@map("brand_kits")
}
```

**Error codes used:** `VALIDATION_FAILED` / `INVALID_PARAMETER` (422, e.g. font not in
the allowed list), `UNSUPPORTED_MEDIA_TYPE` (415, logo file is not a real image),
`PAYLOAD_TOO_LARGE` (413, logo exceeds the size cap), `PERMISSION_DENIED` (403, brand kit
belongs to another user - should not be reachable since the id is never taken from the
client, but tested anyway) - all already in the shared enum.

## Phase 3 - Test plan

| Acceptance criterion | Test level | Test name |
| --- | --- | --- |
| Default preset returned for a new user | Integration | returns a default preset brand kit for a user who has not customized one |
| Update happy path | Integration | updates the brand kit and returns 200 with the new values |
| Contrast check flags a poor combination without blocking the save | Unit | flags low contrast as a warning while still returning 200 |
| Contrast check passes a compliant combination | Unit | reports no warning for a WCAG AA compliant color pair |
| Font outside the allowed list rejected | Integration | returns 422 for a font not in the allowed list |
| Logo upload validates real file bytes | Unit | rejects a renamed non-image file even with an image extension |
| Logo upload size cap enforced | Integration | returns 413 for a logo file over the size limit |
| A user cannot read or write another user's brand kit | Integration | returns 403 or 404 when acting on another user's brand kit id |

## Phase 4 - Implementation notes

Not started.
