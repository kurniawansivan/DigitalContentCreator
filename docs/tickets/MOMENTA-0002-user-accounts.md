# MOMENTA-0002: User accounts (register, login, session)

**Status:** Proposed
**Requirement area:** Foundation - [PRD.md §7](../../PRD.md#7-alur-pengguna-utama) step 1 (onboarding), [§9 `users` table](../../PRD.md#9-skema-data-final)
**Depends on:** MOMENTA-0001

## Why this ticket exists

PRD.md does not design a login flow explicitly, but every table in PRD §9
(`brandKits`, `generatedScripts`, `renderJobs`, `generatedAssets`, ...) carries a
`userId`. Nothing in `docs/requirements/` can be built correctly without a real user to
attach data to, and `.claude/skills/backend-standard/references/security.md` governs
this fully - so it is a prerequisite ticket, not a feature ticket, and it follows that
standard exactly rather than inventing a lighter scheme.

## Phase 1 - Scope

**Goal:** a new visitor can register, log in, stay signed in across requests via a
short-lived access token, and log out - so every later ticket has a real, authenticated
user to key its data on.

**Acceptance criteria**

- [ ] `POST /api/v1/auth/register` creates a user with an Argon2id-hashed password and
      returns `201` with the user (never the hash) in the envelope.
- [ ] Registering an email already in use returns `409 EMAIL_ALREADY_REGISTERED`.
- [ ] Password policy enforced: 12-128 characters, no composition rules, rejected if
      found in a breach corpus (k-anonymity range API).
- [ ] `POST /api/v1/auth/login` with correct credentials returns `200` with a 15-minute
      JWT access token in the body and an opaque refresh token as an `HttpOnly`,
      `Secure`, `SameSite=Strict` cookie scoped to `/api/v1/auth/refresh`.
- [ ] Login with a wrong password and login with an unknown email return the identical
      status, message, error code (`401 INVALID_CREDENTIALS`), and response time.
- [ ] `POST /api/v1/auth/refresh` rotates the refresh token (old one marked used, new one
      issued in the same family) and returns a new access token.
- [ ] Presenting an already-used refresh token revokes the entire token family and
      returns `401 REFRESH_TOKEN_REUSED`.
- [ ] `POST /api/v1/auth/logout` deletes the current refresh token server-side and clears
      the cookie.
- [ ] Ten failed login attempts on one account in a sliding window trigger throttling,
      then a temporary lockout (`429`), per the layered brute-force rules in
      `security.md`.
- [ ] A shared "require authentication" check rejects a missing, malformed, or expired
      access token with `401 AUTHENTICATION_REQUIRED` / `ACCESS_TOKEN_EXPIRED`, reusable
      by every later ticket's endpoints.
- [ ] 100% line and branch coverage on this module (auth is one of the paths
      `testing-standard` requires 100% on, not the 80% floor).

**Out of scope**

- OAuth/social login and multi-factor authentication - not required by PRD for MVP.
- Password reset via email - real gap, but not blocking other feature tickets; raise as
  MOMENTA-0002a if not folded into this ticket's Phase 4.
- Roles/permissions - PRD's MVP has exactly one role: the record's owner. No admin/staff
  concept exists yet.

**Affected surface**

- New tables: `users` (PRD §9), `refresh_tokens` (not in PRD §9's sketch - required by
  the rotation-with-reuse-detection rule; added here).
- New module: `src/modules/auth/*`.
- New shared middleware: `src/shared/http/requireAuthentication.ts`, used by every
  authenticated route in later tickets.

**Risks**

- Highest-risk ticket in the backlog: auth. Per CLAUDE.md, security rules never bend
  regardless of deadline pressure. 100% coverage and every negative-path test in
  `testing-standard`'s integration checklist are non-negotiable, not aspirational.

## Phase 2 - Contract

**`POST /api/v1/auth/register`** - body `{ emailAddress, password }` -> `201`,
`data: { id, emailAddress, createdAt }`.

**`POST /api/v1/auth/login`** - body `{ emailAddress, password }` -> `200`,
`data: { accessToken, expiresIn }`, `Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh`.

**`POST /api/v1/auth/refresh`** - reads the refresh token cookie -> `200`,
`data: { accessToken, expiresIn }`, rotated `Set-Cookie`.

**`POST /api/v1/auth/logout`** - `204`, clears the cookie.

**Access token claims:** `sub`, `iat`, `exp`, `jti`, `iss`, `aud`, `tokenType: "access"`.
No role/permission claims (nothing here is revocable within the token's own lifetime).

**Migration (new relative to PRD §9):**

```prisma
model User {
  id           String   @id @default(cuid())
  emailAddress String   @unique @map("email_address")
  passwordHash String   @map("password_hash")
  niche        String?
  brandName    String?  @map("brand_name")
  createdAt    DateTime @default(now()) @map("created_at")

  @@map("users")
}

model RefreshToken {
  id          String    @id @default(cuid())
  userId      String    @map("user_id")
  familyId    String    @map("family_id")
  tokenHash   String    @unique @map("token_hash")
  isUsed      Boolean   @default(false) @map("is_used")
  expiresAt   DateTime  @map("expires_at")
  createdAt   DateTime  @default(now()) @map("created_at")

  @@map("refresh_tokens")
}
```

**Error codes used:** `EMAIL_ALREADY_REGISTERED` (409), `PASSWORD_TOO_SHORT` /
`PASSWORD_FOUND_IN_BREACH` (422), `INVALID_CREDENTIALS` (401), `ACCESS_TOKEN_EXPIRED`
(401), `AUTHENTICATION_REQUIRED` (401), `REFRESH_TOKEN_INVALID` / `REFRESH_TOKEN_EXPIRED`
/ `REFRESH_TOKEN_REUSED` (401), `RATE_LIMIT_EXCEEDED` / `TOO_MANY_FAILED_ATTEMPTS` (429) -
all already defined in the shared error-code enum, no new codes needed.

## Phase 3 - Test plan

| Acceptance criterion | Test level | Test name |
| --- | --- | --- |
| Registration happy path | Integration | registers a user and returns 201 with the envelope, no password hash in the response |
| Duplicate email rejected | Integration | returns 409 EMAIL_ALREADY_REGISTERED for an email already in use |
| Password too short rejected | Unit | rejects a password under 12 characters with PASSWORD_TOO_SHORT |
| Password hashed with Argon2id | Unit | stores an argon2id hash and never the plain password |
| Login happy path issues both tokens | Integration | logs in and returns an access token plus an HttpOnly refresh cookie |
| Wrong password and unknown email return identical response | Integration | returns the same status, code, and message for a wrong password and an unknown email |
| Refresh rotates the token | Integration | issues a new refresh token and invalidates the presented one |
| Reused refresh token revokes the family | Integration | revokes every token in the family when a used refresh token is presented again |
| Logout clears the session | Integration | deletes the refresh token server-side and clears the cookie |
| Lockout after repeated failures | Integration | returns 429 after the tenth failed login attempt in a minute |
| Missing/expired access token rejected | Integration | returns 401 AUTHENTICATION_REQUIRED or ACCESS_TOKEN_EXPIRED for a protected route |
| Full signup-to-authenticated-state flow | End-to-end | a new visitor registers, is logged in, and reaches the (placeholder) dashboard |

## Phase 4 - Implementation notes

Not started.
