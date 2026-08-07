# End-to-End Tests

Scope: a real browser driving the real frontend against the real backend. Playwright is the
default. These are the slowest and most valuable tests, so they cover journeys, not details.

## What to cover

One end-to-end test per user-visible flow that would be a serious incident if it broke:

- Sign up, verify, sign in, sign out
- The core product action (create the main entity, edit it, delete it)
- Checkout or payment, if the product has one
- Password reset
- The main failure the user will actually hit (invalid input, expired session, declined card)

Not covered here: field-level validation permutations, every error message, styling. Those
belong in unit and integration tests, which run in milliseconds instead of seconds.

## Rules

**Query like a user.** By role, label, or visible text. A test id is the last resort. Never
a CSS class or a DOM path - both change for cosmetic reasons and produce a fragile suite.

```typescript
test("a new customer can register and reach the dashboard", async ({ page }) => {
  await page.goto("/sign-up");

  await page.getByLabel("Email address").fill(uniqueEmailAddress());
  await page.getByLabel("Password").fill("correct horse battery staple");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard/);
});
```

**Never sleep.** Playwright's assertions retry until the condition holds. `waitForTimeout` is
banned - it is both slower and flakier than waiting for the condition.

**Independent tests.** Each test creates its own account and data through an API call in
setup, not by clicking through the user interface. Signing in through the form in every test
is slow and makes an unrelated login change break everything. Reuse a stored authentication
state for tests that need a signed-in user.

**Deterministic data.** Unique email addresses per run. No dependence on rows that happen to
be in the environment.

**Real backend, stubbed third parties.** Point at a real application instance with a seeded
test database. Payment, email, and SMS providers use their sandbox or are intercepted at the
network layer.

## Mobile viewports are not optional

The product is mobile-first, so the suite runs mobile first. Configure at minimum a mobile
project and a desktop project:

```typescript
projects: [
  { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
  { name: "mobile-safari", use: { ...devices["iPhone 14"] } },
  { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
],
```

Critical flows run on all three. Everything else runs on mobile-chrome.

## Accessibility inside the end-to-end run

Every end-to-end test that lands on a new page runs an automated accessibility scan, so a
regression fails the build rather than reaching a user:

```typescript
const accessibilityResults = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
  .analyze();

expect(accessibilityResults.violations).toEqual([]);
```

## Flakiness

Zero tolerance. A flaky end-to-end test destroys trust in the suite faster than no suite at
all. When one flakes:

1. Find the actual race - almost always a wait on a duration instead of a condition, shared
   data between tests, or an unawaited navigation.
2. Fix it in the same ticket.
3. Never paper over it with a retry count, and never mark it skipped.

## In CI

- Runs on every pull request, blocking merge.
- Trace, screenshot, and video captured on failure only.
- Sharded across parallel workers to stay under roughly ten minutes.
- Runs against a fresh deployment with a freshly migrated database.
