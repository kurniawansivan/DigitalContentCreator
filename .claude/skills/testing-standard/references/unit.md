# Unit Tests

Scope: one function, one class, one component. Fast (milliseconds), no network, no database,
no file system.

## What to cover

For each function, cover: the happy path, every branch, the boundary of every range, the
empty case, and every error path. If a function has three branches and one test, two thirds
of it is unverified.

Boundary values are where bugs live. For a rule "orders over 100 get free shipping", test
99, 100, and 101. Also test zero, negative, empty string, empty array, very large, and
`null` where the type permits it.

## Backend unit tests

The service is the unit. Its repository dependency is a fake, because the service was built
to receive an interface.

```python
class InMemoryUserRepository:
    """Fake, not a mock. Behaves like the real thing for the cases under test."""

    def __init__(self, users: list[User] | None = None) -> None:
        self._users = {user.email_address: user for user in (users or [])}

    async def find_by_email(self, email_address: str) -> User | None:
        return self._users.get(email_address)

    async def insert(self, user: NewUser) -> User:
        created = User(id="usr_1", **user.model_dump())
        self._users[created.email_address] = created
        return created


async def test_register_rejects_an_email_address_that_is_already_registered() -> None:
    repository = InMemoryUserRepository([build_user(email_address="taken@example.com")])
    service = RegistrationService(repository, FakeEmailSender())

    with pytest.raises(ApplicationError) as raised:
        await service.register(build_registration_input(email_address="taken@example.com"))

    assert raised.value.code is ErrorCode.RESOURCE_ALREADY_EXISTS
    assert raised.value.status_code == 409
```

A hand-written fake beats a mocking library here: it is readable, it enforces the interface,
and it does not silently accept a call that the real implementation would reject.

## Frontend unit tests

Test what the user perceives, never the internals. Query the way a user finds things: by
role, by label, by visible text. Never by test id unless nothing else identifies the element,
and never by class name or component internals.

```typescript
it("shows a field error and does not submit when the email address is invalid", async () => {
  const onSubmit = vi.fn();
  render(<SignInForm onSubmit={onSubmit} />);

  await userEvent.type(screen.getByLabelText("Email address"), "not-an-email");
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

  expect(await screen.findByText("Enter a valid email address")).toBeVisible();
  expect(onSubmit).not.toHaveBeenCalled();
});
```

Rules:

- Assert on rendered output and on the call that would leave the component, not on state.
- Never assert that a hook was called or that a state setter ran.
- Use `userEvent`, not `fireEvent` - it produces the full event sequence a real user does.
- Test the accessible name, which also verifies the element is reachable by a screen reader.
- Test the loading, empty, and error states, not only the populated one.
- Snapshots are for genuinely static markup only, and are read in review like any code. A
  regenerated snapshot nobody read is not a test.

## Pure logic

Formatters, validators, calculators, reducers, and mappers are the cheapest and highest value
tests in the codebase. Cover them exhaustively. Where the input space is wide - parsers,
sorting, money arithmetic - property-based testing (fast-check, Hypothesis) finds the cases a
person would not think of.

## Naming and structure

- File sits beside the source: `users.service.ts` and `users.service.test.ts`.
- Test name is a sentence: "returns an empty list when the account has no orders".
- No logic in a test: no `if`, no loop over cases with branching inside. Use a parameterized
  table instead.
- No shared mutable state between tests, and no reliance on ordering.
