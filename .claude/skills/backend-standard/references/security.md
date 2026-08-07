# Security Standard

Every item here is mandatory. If a requirement cannot be met, say so explicitly rather than
shipping a weaker version quietly.

## Password hashing

Use Argon2id. Parameters: memory 19 MiB, iterations 2, parallelism 1, 16-byte salt, 32-byte
output. These are the OWASP minimums; raise memory if the host allows.

Fallback when Argon2id is unavailable: bcrypt with cost 12 or higher, and remember bcrypt
silently truncates at 72 bytes, so pre-hash long inputs with SHA-256 before bcrypt.

Never: MD5, SHA-1, SHA-256 alone, unsalted anything, a hand-rolled scheme, or a shared
application-wide salt. Never store a password reversibly. Never log one, even at debug level.

```python
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

password_hasher = PasswordHasher(
    time_cost=2, memory_cost=19456, parallelism=1, hash_len=32, salt_len=16
)


def hash_password(plain_text_password: str) -> str:
    return password_hasher.hash(plain_text_password)


def verify_password(stored_hash: str, plain_text_password: str) -> bool:
    try:
        password_hasher.verify(stored_hash, plain_text_password)
    except VerifyMismatchError:
        return False
    return True
```

Rehash on login when `password_hasher.check_needs_rehash(stored_hash)` is true, so
parameters can be raised over time without a migration.

Password policy: minimum 12 characters, maximum 128, no composition rules (they push users
toward `Password1!`), and reject any password found in a breach corpus. Check the breach
list with the k-anonymity range API so the password never leaves the server.

## Access and refresh tokens

Two tokens with different jobs.

**Access token** - JWT, 15 minutes, stateless, sent in `Authorization: Bearer`. Signed with
RS256 or EdDSA in production, HS256 acceptable only for a single-service deployment. Claims:
`sub`, `iat`, `exp`, `jti`, `iss`, `aud`, and a `tokenType: "access"` claim so a refresh
token can never be presented as an access token. Never put a role or permission list in the
token if it must be revocable within the token lifetime.

**Refresh token** - opaque, 256 bits from a cryptographically secure random source, never a
JWT. Lifetime 7 to 30 days. Stored in the database as a SHA-256 hash, never in plain text,
so a database leak does not hand over live sessions.

**Rotation with reuse detection.** This is the part that is usually missed and it is not
optional. Every refresh issues a brand-new refresh token and invalidates the one presented.
Each token records the `familyId` of the login it descends from. If a token that has already
been used is presented again, that means it was stolen: revoke the entire family
immediately, log a security event, and force re-authentication.

```
login            -> family F, token R1
refresh with R1  -> R1 marked used, issue R2 (family F)
refresh with R2  -> R2 marked used, issue R3 (family F)
refresh with R1  -> R1 already used -> attacker or replay
                    -> revoke every token in family F, alert, require login
```

**Transport.** The refresh token goes in a cookie: `HttpOnly`, `Secure`, `SameSite=Strict`,
`Path=/api/v1/auth/refresh`, with an explicit `Max-Age`. Never `localStorage` or
`sessionStorage` - both are readable by any injected script. The access token is held in
memory on the client only.

**Logout** deletes the refresh token server-side and clears the cookie. A logout that only
clears the client is not a logout. "Log out everywhere" revokes every family for the user.

Bind a refresh token to a coarse client fingerprint (user agent family plus IP network, not
the exact IP - mobile networks change it). A mismatch is a signal to re-authenticate, not to
hard-fail.

## Brute-force protection

Layered. Any single layer is bypassable.

1. **Per-IP rate limit** on `/auth/*`: 10 attempts per minute, sliding window, in shared
   storage such as Redis so it holds across instances.
2. **Per-account throttle** with exponential backoff, keyed on the account, not the IP, so a
   distributed attack is still slowed: attempt 4 waits 1s, 5 waits 2s, 6 waits 4s, capped at
   15 minutes.
3. **Temporary lockout** after 10 consecutive failures, cleared by a successful password
   reset or by time.
4. **Proof of work or CAPTCHA** after 3 failures from one IP.
5. **Global anomaly rule**: an unusual rate of failures across many accounts triggers an
   alert; that is credential stuffing.

Every failed login returns the identical response regardless of cause: same status, same
message ("Invalid email address or password"), same error code, same response time. Never
reveal whether the account exists.

Timing must match too. When the account does not exist, still run a hash verification
against a fixed dummy hash so the response time does not disclose existence.

The same discipline applies to signup ("if that address is new, you will receive an email"),
password reset (always the same response), and any endpoint that looks up a user by an
identifier.

## Reset and verification tokens

Random 256-bit value, stored hashed, single use, expires in 15 minutes for password reset
and 24 hours for email verification. Using one invalidates every other outstanding token for
that user and revokes all refresh-token families. Compare with a constant-time comparison,
never `==` on the raw value.

## Sessions and multi-factor

- Regenerate the session identifier on every privilege change, including login.
- Require the current password to change email, password, or MFA settings.
- Support TOTP with a 30-second step and a one-step drift window; store the secret
  encrypted; issue single-use recovery codes stored hashed.
- Rate-limit MFA verification exactly like password verification.

## Authorization

- Deny by default. A route with no explicit policy is closed, not open.
- Check permission in the service layer against the specific record, not only in a route
  guard. Every id that arrives from a client is untrusted.
- Never expose a sequential primary key in a URL where enumeration matters; use a UUIDv7 or
  a prefixed public id.
- Server decides prices, totals, roles, and status transitions. A client-supplied value for
  any of these is input to validate, never a value to trust.

## Input handling

- Parse every inbound payload with a schema at the boundary, and reject unknown keys.
- Allowlist, never blocklist.
- Parameterized queries only. String-built SQL is forbidden even when the input "cannot" be
  hostile.
- Validate upload content type by inspecting file bytes, not by trusting the extension or
  the declared type. Cap size. Store outside the web root. Never execute an upload.
- Any URL supplied by a user and fetched by the server is a server-side request forgery
  risk: resolve the hostname, reject private and link-local ranges, disable redirects, and
  set a timeout.
- Cap request body size, array lengths, string lengths, and pagination limits. Absent caps
  are a denial-of-service vector.

## Transport and headers

- HTTPS only. HTTP redirects to HTTPS. `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
- `Content-Security-Policy` with no `unsafe-inline` and no `unsafe-eval`; use a nonce.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`.
- CORS with an explicit origin allowlist. Never `Access-Control-Allow-Origin: *` together
  with credentials.
- Cookie-based authentication requires CSRF protection: `SameSite=Strict` plus a
  double-submit or synchronizer token on every state-changing request.

## Secrets and configuration

- Secrets come from the environment or a secret manager. Never a literal in source, never in
  a committed `.env`, never in a comment, never in a test fixture that looks real.
- Validate the whole configuration at startup and fail fast on anything missing.
- `.env*`, `*.pem`, and `*.key` are gitignored, and a secret scanner runs in CI.
- Rotate on a schedule and immediately on any suspected exposure.

## Logging and observability

- Structured JSON logs with a `requestId` on every line, propagated across services.
- Redact by allowlist: log the fields you chose to log. Never log a password, token, cookie,
  authorization header, full card number, or government identifier.
- Log security events with enough context to investigate: login success and failure, lockout,
  token reuse detection, permission denial, role change, password change, MFA change.
- Never place personal data or a token in a URL, query string, or referrer.

## Dependencies

- Lockfile committed. Automated vulnerability scan in CI. A high-severity finding fails the
  build.
- Pin versions. Review the diff of a dependency upgrade the same way you review code.

## Backend security checklist

- [ ] Argon2id hashing, rehash on login when parameters change
- [ ] Access token 15 minutes, refresh token opaque, hashed at rest, rotated with reuse detection
- [ ] Refresh token in an HttpOnly, Secure, SameSite=Strict cookie; access token in memory only
- [ ] Layered rate limit, account throttle, lockout, CAPTCHA escalation
- [ ] Identical response and timing for every authentication failure
- [ ] Schema validation at the boundary, unknown keys rejected
- [ ] Parameterized queries everywhere
- [ ] Ownership checked in the service for every client-supplied id
- [ ] Security headers and a CORS allowlist set
- [ ] No secret in source; configuration validated at startup
- [ ] Security events logged with redaction; no secret in any log line
