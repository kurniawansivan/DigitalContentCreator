---
name: testing-standard
description: The testing standard for this repository - what to test at each level, coverage thresholds, how to write an assertion that can actually fail, what a fake test looks like, mocking boundaries, test data, and the end-to-end requirement on every ticket. Load before writing or changing any test, or when deciding whether a change is adequately covered, using Vitest, Jest, pytest, Playwright, Cypress, Testing Library, or Supertest.
---

# Testing Standard

Every ticket ships tests. A ticket with no test is not done, and "it is hard to test" means
the design is wrong, not that the test is optional.

| Level | Reference |
| --- | --- |
| Unit tests | `references/unit.md` |
| Integration and API tests | `references/integration.md` |
| End-to-end tests | `references/end-to-end.md` |

## What each ticket must produce

| Change | Required tests |
| --- | --- |
| Backend service or business rule | Unit tests, including every branch and failure path |
| New or changed endpoint | Integration test against a real database, asserting the full envelope |
| Auth, permission, money, or data deletion | Unit plus integration, and every negative case |
| Frontend component with logic | Unit test through the rendered output, behaviour not implementation |
| A user-visible flow | One end-to-end test covering the happy path and the main failure |
| Bug fix | A test that fails before the fix and passes after. Write it first |

## Coverage

Minimum 80% lines and branches overall. 100% for authentication, authorization, payment,
and anything that deletes data. Coverage is a floor, not a goal - 100% coverage with weak
assertions tests nothing.

Coverage exclusions are forbidden. `istanbul ignore` and `# pragma: no cover` are blocked by
a hook. Untestable code is a design problem to fix.

## The shape of a test

Arrange, act, assert. One behaviour per test. The name states the behaviour and the
condition, so a failure is readable without opening the file.

```typescript
// Wrong: name says nothing, asserts nothing meaningful.
it("works", async () => {
  const result = await userService.register(input);
  expect(result).toBeDefined();
});

// Right: name is a sentence about behaviour; assertion can genuinely fail.
it("rejects registration when the email address is already in use", async () => {
  await userRepository.insert(buildUser({ emailAddress: "taken@example.com" }));

  const registration = userService.register(
    buildRegistrationInput({ emailAddress: "taken@example.com" }),
  );

  await expect(registration).rejects.toMatchObject({
    code: ErrorCode.RESOURCE_ALREADY_EXISTS,
    statusCode: 409,
  });
});
```

## Tests that do not count

The test auditor rejects all of these:

- `expect(true).toBe(true)`, `assert True`, or any assertion independent of the code
- `expect(result).toBeDefined()` or `toBeTruthy()` as the only assertion
- A test with no assertion at all
- A test that mocks the function it is supposed to be testing
- A test that asserts a mock was called, and nothing about the outcome
- A snapshot as the only assertion for logic
- A test that passes when the implementation is deleted or its body emptied
- A test that copies the implementation's arithmetic into the expectation
- A test asserting only that no exception was thrown

The check to apply: if I break the implementation, does this test go red? If not, delete it
and write a real one.

## Mocking

Mock at the process boundary and nowhere else. Third-party HTTP, email, payments, clock,
random, and file system are mocked. Your own service, repository, and pure functions are
not.

- Use a real database in integration tests, through a disposable container or a per-test
  transaction that rolls back. An in-memory substitute for the real engine hides dialect and
  constraint bugs.
- Freeze time rather than sleeping. Never `sleep` in a test to wait for something.
- Seed the random generator so failures reproduce.
- Over-mocking is the most common way a suite becomes green and worthless: it ends up
  testing the mocks.

## Test data

Use builders with sensible defaults and explicit overrides, so a test states only the field
it cares about.

```typescript
export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: "usr_test_1",
    emailAddress: "person@example.com",
    hashedPassword: "$argon2id$fake",
    isVerified: true,
    role: UserRole.MEMBER,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}
```

Every test creates its own data and cleans up. Tests never share mutable state, never depend
on execution order, and pass when run alone, in parallel, and in a different order. A test
that only passes as part of the suite is broken.

## Reliability

- Zero tolerance for flakiness. A test that fails intermittently is deleted or fixed within
  the same ticket - never retried into silence.
- No arbitrary waits. Wait for a condition, never for a duration.
- The suite runs in CI on every push, and on a clean checkout.
- Never mark a failing test skipped to unblock a merge. Fix the code or revert it.
