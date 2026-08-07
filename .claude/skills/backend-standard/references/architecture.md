# Architecture and SOLID

The goal is that a change stays local. If adding one field touches eight files, or adding
one payment provider means editing an `if` chain in four places, the layering is wrong.

## Layers

```
HTTP boundary   route + middleware      parse, authenticate, rate limit, shape the response
Controller      controller / handler    HTTP in, HTTP out, calls one service function
Service         business rules          the only place a rule lives; no HTTP, no SQL
Repository      data access             the only place SQL or an ORM call lives
Model           entity + value objects  shape and invariants of the data
```

Import direction is downward only. A repository never imports a service. A service never
imports a controller. Nothing outside the repository layer imports the database client.

## Folder layout

Group by feature, not by technical role. `users/` containing its controller, service,
repository, schemas, and tests beats four top-level folders that all have to be opened
together for every change.

```
src/
  modules/
    users/
      users.controller.ts     # or router.py
      users.service.ts
      users.repository.ts
      users.schema.ts         # request and response schemas
      users.types.ts
      users.service.test.ts
      users.controller.test.ts
  shared/
    http/         envelope, error handler, middleware
    errors/       error classes and the error-code enum
    config/       validated configuration
    database/     client, migrations, base repository
    logging/
  main.ts
```

## SOLID, concretely

**Single responsibility.** A module changes for one reason. A service that formats currency,
sends email, and writes to the database has three. Split it. The practical test: can you
describe what the file does in one sentence with no "and"?

**Open for extension, closed for modification.** Adding a variant should add a file, not edit
a conditional. When you see a growing `if provider == ...` chain, replace it with a registry:

```typescript
// Wrong: every new provider edits this function, and probably three others like it.
function charge(provider: string, amount: Money) {
  if (provider === "stripe") return chargeStripe(amount);
  if (provider === "adyen") return chargeAdyen(amount);
  throw new Error("unknown provider");
}

// Right: every new provider adds one entry. This function never changes again.
interface PaymentProvider {
  charge(amount: Money): Promise<ChargeResult>;
  refund(chargeId: string, amount: Money): Promise<RefundResult>;
}

const paymentProviders: Record<PaymentProviderName, PaymentProvider> = {
  stripe: stripePaymentProvider,
  adyen: adyenPaymentProvider,
};

function getPaymentProvider(name: PaymentProviderName): PaymentProvider {
  const provider = paymentProviders[name];
  if (!provider) throw new UnsupportedPaymentProviderError(name);
  return provider;
}
```

**Liskov substitution.** Any implementation of an interface must be usable wherever the
interface is expected. An implementation that throws "not supported" for a method it
inherited means the interface is too wide. Split it.

**Interface segregation.** Small, purpose-shaped interfaces. A service that only reads users
depends on `UserReader`, not on a 20-method `UserRepository`. The dependency list of a
function is documentation of what it actually does.

**Dependency inversion.** High-level code depends on abstractions. The service receives a
repository through its constructor or through dependency injection. It never constructs one,
never imports the database client, and never reads configuration directly.

```python
class UserRepository(Protocol):
    async def find_by_email(self, email_address: str) -> User | None: ...
    async def insert(self, user: NewUser) -> User: ...


class RegistrationService:
    def __init__(self, user_repository: UserRepository, email_sender: EmailSender) -> None:
        self._user_repository = user_repository
        self._email_sender = email_sender
```

That constructor is why the service can be unit tested with two fakes and no database.

## DRY, and where it stops

Extract on the second occurrence of the same *logic*. Two functions that happen to look
alike but change for different reasons are not duplication; merging them creates a shared
dependency between two unrelated features and the next change has to fight it.

Things that must exist in exactly one place: validation rules, error codes and messages,
permission checks, the response envelope builder, date and money formatting, HTTP client
configuration, and every magic number or string.

```typescript
// Wrong: the same rule, drifting apart, in three files.
if (user.role === "admin" || user.role === "owner") { ... }

// Right: one predicate, one place to change, testable on its own.
export function canManageBilling(user: User): boolean {
  return user.role === UserRole.ADMIN || user.role === UserRole.OWNER;
}
```

## Function shape

- 40 lines maximum. Past that, there is a named step inside wanting to be its own function.
- Nesting depth 2 maximum. Use guard clauses.
- 3 parameters maximum. More means one typed options object, which also kills call sites
  like `createUser("a", "b", true, false, null)`.
- No boolean parameter that selects behaviour. `renderList(items, true)` should be two
  functions, or an enum.
- Return early, return one type. Do not return `User | null | false | string`.
- No output parameters and no mutation of an argument. Return a new value.
- Pure where possible: given the same input, the same output, no hidden side effect. Push
  input and output to the edges so the core stays testable.

## Configuration

One validated configuration object built at startup. Every consumer receives typed values.
No `process.env` or `os.environ` read outside that module. Missing or malformed
configuration crashes the process at boot, not on the first request at 3am.

## Comments

Comment *why*, never *what*. If a comment explains what the code does, rename things until
it does not need one. Comments that earn their place: a non-obvious constraint, a link to a
specification, the reason a slower approach was chosen, a workaround with the upstream issue
number. No commented-out code - version control already keeps it.

A comment is one short line. No divider or banner made of repeated punctuation
(`# ----`, `// ====`, `/* **** */`) - it carries no information and turns every future diff
in that area into noise. If a section needs a label, the label alone is the comment: `#
Passwords`, nothing above or below it. No em dash either, in a comment or in a string: use a
hyphen, a comma, or split the sentence. Both are blocked by the pre-edit hook.
