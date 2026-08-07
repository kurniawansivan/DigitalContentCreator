# Migration Recipes

Each recipe introduces one part of the standard into a running system without a cutover.
The shape is always the same: **new code gets the standard, old code gets a bridge, both run
until the old path has no callers.**

Never perform one of these as a side effect of an unrelated ticket.

## The response envelope, without breaking live clients

Changing an existing endpoint's response shape breaks every deployed client - mobile apps
you cannot force-update, integrations you do not control.

**Do not** rewrite existing endpoints in place.

**Do** introduce the envelope at a new version prefix and let both run:

```
/api/users        legacy shape, unchanged, frozen        <- existing clients
/api/v1/users     envelope, camelCase, new work only     <- new clients
```

The v1 handler calls the same service as the legacy handler; only the presentation differs.
No business logic is duplicated.

```typescript
// The legacy route stays exactly as it is. Frozen, not deleted.
legacyRouter.get("/users/:id", async (request, response) => {
  const user = await userService.findById(request.params.id);
  response.json(user); // bare object, as it always was
});

// The new route wraps the same service call in the envelope.
v1Router.get("/users/:id", async (request, response) => {
  const user = await userService.findById(request.params.id);
  response.status(200).json(
    buildSuccessResponse({
      data: toUserResponse(user),
      message: "User retrieved",
      requestId: request.requestId,
    }),
  );
});
```

Retire the legacy path on a schedule: add a `Deprecation` header, log which clients still
call it, tell them, then delete it when the log goes quiet. Deleting an endpoint nobody
calls is safe; changing one people call is not.

If you cannot add a version prefix, put the envelope behind a request header
(`Accept: application/vnd.api.v1+json`) and default to the legacy shape.

## Strict typing, without ten thousand errors at once

Turning on `strict` across a large project produces an unfixable pile in one commit.

Enable it for new code only, then widen the boundary:

```jsonc
// tsconfig.json - strict everywhere
{ "compilerOptions": { "strict": true } }
```

```jsonc
// tsconfig.legacy.json - the old tree, checked loosely, shrinking over time
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "strict": false },
  "include": ["src/legacy/**/*"]
}
```

For Python, the same shape with mypy: strict globally, with a per-module relaxation list
that only ever gets shorter.

```toml
[[tool.mypy.overrides]]
module = ["legacy.orders.*", "legacy.reports.*"]  # delete entries, never add them
disallow_untyped_defs = false
```

The ratchet does the rest: the total error count may fall, never rise.

## Layering, without rewiring every caller

An existing fat controller with SQL in it stays a fat controller. Do not extract a
repository for it as part of a feature ticket.

Instead, when you add behaviour to it, put the *new* logic in a service function the
controller calls. Over several tickets the controller thins out on its own, and no single
change is risky:

```python
# Before: everything in the handler.
@router.post("/orders")
async def create_order(request: Request) -> dict:
    body = await request.json()
    # 80 lines of validation, pricing, SQL, and email
    ...

# After one ticket: the new discount rule goes into a service, the rest is untouched.
@router.post("/orders")
async def create_order(request: Request) -> dict:
    body = await request.json()
    # ... the same 80 lines, still here ...
    discount = order_pricing_service.calculate_discount(  # new, tested, typed
        subtotal_minor_units=subtotal, customer_tier=customer["tier"]
    )
    ...
```

`order_pricing_service` is a new module with the full standard applied and real unit tests.
The next ticket moves one more piece. Nothing ripples.

## Design tokens, into a codebase full of hardcoded colors

Add the token file first. It changes nothing on its own.

Then migrate on touch: when you edit a component, replace the colors *in that component*
with tokens. The hook blocks new hardcoded colors, so the direction is enforced without a
sweep.

To find the palette that already exists, count what is actually used and map the top values
to semantic roles:

```bash
grep -rhoE '#[0-9a-fA-F]{3,8}\b' src --include='*.{css,scss,tsx,jsx,vue,svelte}' \
  | sort | uniq -c | sort -rn | head -30
```

The top ten are almost always the real palette plus a handful of near-duplicates
(`#333333`, `#333`, `#343434`) that should collapse into one token.

## Mobile-first, in a desktop-first stylesheet

Existing `max-width` queries stay. The hook blocks new ones.

When you rework a component, invert its queries - and only that component's:

```css
/* Before: desktop base, narrowed for mobile. */
.sidebar { width: 280px; }
@media (max-width: 768px) { .sidebar { width: 100%; } }

/* After: mobile base, widened for desktop. Same rendering, opposite direction. */
.sidebar { width: 100%; }
@media (min-width: 48rem) { .sidebar { width: 280px; } }
```

Verify at 360 px before and after. Inverting a breakpoint is behaviour-preserving only if
you actually check both sides.

## Tests, in a codebase with none

Do not open a ticket to "add tests". It never finishes and it tests the wrong things.

1. **Every bug fix ships a regression test.** This is free coverage of exactly the code that
   demonstrably breaks.
2. **Every new function ships unit tests.** The standard applies to new code in full.
3. **Before changing legacy behaviour, characterise it.** Write a test that asserts what the
   code does *today* - not what it should do. That test is what tells you whether your change
   altered something you did not intend.
4. **Add end-to-end tests for the top three flows first.** Signup, the core action, checkout.
   Three end-to-end tests over the money paths are worth more than 60% line coverage
   everywhere.

Set the initial coverage threshold to the current measured number, not to 80. Raise it as
the number rises. A threshold you cannot meet gets deleted; a threshold one point above
today's number gets met.

## Authentication, without logging everyone out

Rotating to Argon2id and short-lived tokens must not invalidate every live session.

**Password hashes** migrate transparently on next login:

```python
def verify_and_upgrade(user: User, plain_text_password: str) -> bool:
    if user.hashed_password.startswith("$argon2"):
        if not verify_password(user.hashed_password, plain_text_password):
            return False
    elif not legacy_bcrypt_verify(user.hashed_password, plain_text_password):
        return False

    # Correct password, old algorithm: rehash now, while the plaintext is in hand.
    if not user.hashed_password.startswith("$argon2") or needs_rehash(user.hashed_password):
        user.hashed_password = hash_password(plain_text_password)
        user_repository.update_password_hash(user.id, user.hashed_password)
    return True
```

Never bulk-migrate hashes - the plaintext is not available, and a wrapped hash
(`argon2(bcrypt(password))`) is a scheme you will regret.

**Token lifetimes** shorten in steps. Going from a 30-day access token to 15 minutes in one
deploy logs out every user at once. Issue refresh tokens alongside the existing long-lived
tokens, ship the client change that uses them, wait for adoption, then shorten the access
token. Accept both formats during the overlap, with a hard end date.

**Reuse detection** can be enabled from the day rotation ships - it only fires on tokens
that were already exchanged, so it has nothing to break.

## Rejecting unknown fields

Adding `extra="forbid"` to an existing schema rejects payloads that used to work, and some
client is sending a field nobody remembers adding.

Log first, enforce second:

1. Ship with unknown fields still accepted, but logged with the endpoint and the field name.
2. Watch for a full billing cycle so monthly integrations show up.
3. Contact whoever is sending them, or confirm nothing is.
4. Then switch to `forbid`.

New endpoints use `forbid` from the first commit - there are no clients yet.
