# Integration and API Tests

Scope: a real HTTP request through the real application into a real database. Routing,
middleware, validation, authorization, serialization, transactions, and constraints all
participate. This level catches everything unit tests cannot.

## Setup

Use a disposable real database - Testcontainers, or a dedicated test database created and
migrated per run. Not SQLite standing in for PostgreSQL: dialect differences, constraint
behaviour, and transaction semantics all differ, and those differences are exactly what this
level exists to catch.

Isolation: wrap each test in a transaction and roll back, or truncate between tests. Never
let one test's rows leak into the next.

Migrations run against the test database as part of setup, which also proves the migrations
work.

## Every endpoint gets these

For each endpoint, assert:

1. **Happy path** - correct status code, correct envelope, correct data shape and values.
2. **Validation failure** - 422, every offending field present in `errors`, camelCase field
   paths.
3. **Unauthenticated** - 401 when the token is missing, malformed, or expired.
4. **Unauthorized** - 403 when authenticated as a user who may not perform the action.
5. **Not found** - 404 for an id that does not exist.
6. **Ownership** - a user requesting another user's record gets 404 or 403, never the record.
   Write this test for every endpoint that accepts an id from the client.
7. **Side effects** - the database actually changed, or actually did not on failure.

Point 6 is the one that gets skipped and it is the one that ships an insecure direct object
reference.

## Assert the whole envelope

The envelope is the contract. Assert its shape, not only the payload, or drift ships silently.

```typescript
it("returns the created user in the standard envelope", async () => {
  const response = await request(application)
    .post("/api/v1/users")
    .set("Authorization", `Bearer ${adminAccessToken}`)
    .send({ emailAddress: "new@example.com", password: "correct horse battery staple" });

  expect(response.status).toBe(201);
  expect(response.body).toMatchObject({
    status: "success",
    statusCode: 201,
    message: expect.any(String),
    data: { id: expect.any(String), emailAddress: "new@example.com" },
    meta: null,
    errors: null,
    requestId: expect.any(String),
    timestamp: expect.any(String),
  });
  // The password hash must never leave the server.
  expect(response.body.data).not.toHaveProperty("hashedPassword");
  expect(response.body.data).not.toHaveProperty("password");

  const stored = await userRepository.findByEmail("new@example.com");
  expect(stored).not.toBeNull();
});
```

The last two assertions matter as much as the first: an integration test is the right place
to prove that secret fields are not serialized and that the write actually landed.

## Security paths that must have an integration test

- Registration with an email address that already exists returns the same generic response
  as a new one, and does not disclose existence.
- Login with a wrong password and login with an unknown account return the identical status,
  message, and error code.
- Repeated failed logins trigger the throttle and then the lockout, and return 429 with
  `Retry-After`.
- A refresh token can be used once; presenting it a second time revokes the whole family and
  every token in it stops working.
- An expired access token returns 401 with `ACCESS_TOKEN_EXPIRED`.
- A refresh token presented as an access token is rejected.
- Logout invalidates the refresh token server-side.
- A password reset token is single use and expires.
- A payload with an unknown extra field is rejected, not silently accepted.
- A user cannot read, update, or delete another user's record.

## Contract verification

Generate the OpenAPI document from the code, and assert in CI that it did not change
unexpectedly. Validate real responses against the schema so the document cannot drift from
the implementation. Frontend types are generated from that same document, which makes a
breaking backend change a failing frontend build instead of a production bug.

## What does not belong here

- Third-party network calls: stub them at the HTTP boundary (MSW, `responses`, a recorded
  cassette). Never call a real payment provider in a test.
- Email and SMS: capture through a fake sender and assert on what was captured.
- Time: freeze it.
