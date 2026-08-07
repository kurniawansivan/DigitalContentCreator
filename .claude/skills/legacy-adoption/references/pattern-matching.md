# Matching the Local Pattern

Inside existing code, consistency usually beats the standard. A reader should be able to
hold one mental model of a module, not two. A file written in the house style is easier to
maintain than a file written correctly in a style nothing else uses.

## The decision table

| Concern | In existing code | Why |
| --- | --- | --- |
| Folder and file layout | **Local wins** | Moving files breaks imports, blame, and everyone's muscle memory |
| Naming style (`snake_case` vs `camelCase` internals) | **Local wins** | Mixed casing inside one module is worse than either casing consistently |
| Layering shape (fat controller, active record, service locator) | **Local wins** for edits to existing modules; standard for new modules | Rewiring a layer ripples through every caller |
| Error style (return tuples vs raise) | **Local wins** | Half-migrated error handling is how errors get swallowed |
| Test framework and style | **Local wins** | Two frameworks in one suite is a maintenance tax forever |
| HTTP client, ORM, date library | **Local wins** | A second library for the same job is duplication with extra steps |
| Response shape on an existing endpoint | **Local wins** until a versioned migration | Changing it breaks live clients |
| Abbreviated identifiers already in the file | **Local wins** for existing names; standard for names you introduce | Renaming a widely-used symbol is its own ticket |
| **Suppression comments** | **Standard wins** | Never add one, whatever the file does |
| **Skipped tests** | **Standard wins** | Never add one |
| **Hardcoded secrets** | **Standard wins** | An existing one is an incident, not a convention |
| **String-built SQL** | **Standard wins** | Parameterize what you write |
| **Missing authorization check** | **Standard wins** | Add it for the code you touch |
| **Lowering a threshold or widening an ignore** | **Standard wins** | Never |

The pattern: **style and structure bend, safety does not.**

## Reading the local convention

Before writing, answer these from the code, not from memory:

- Where does business logic actually live here? Controllers, models, services, or a
  utilities module?
- How does this codebase report failure? Exception, error tuple, null return, result object?
- What does a test look like? Which framework, which assertion style, real database or
  mocks, where do fixtures live?
- How are things named? Look at five sibling files, not one.
- How is a dependency obtained? Constructor injection, a container, a module-level singleton,
  a direct import?
- What is the import style? Relative or absolute, barrel files or direct paths?

Match all six. A new file that matches its neighbours is a file the team can maintain.

## New code inside an old codebase

A genuinely new module - a new feature area, a new service, a new bounded context - gets the
full standard. It has no callers to break and no history to preserve. Put it in its own
folder and let it be the example the rest migrates toward.

The boundary between old and new is where the adapting happens. New module talks to old
module through a thin adapter that translates shapes and errors, so neither side has to
know about the other's conventions:

```python
# modules/billing/  - new, full standard: layered, typed, envelope, tests
# legacy/user_svc.py - untouched

class LegacyUserGateway:
    """Adapter. The only place the new module knows the old one exists.

    When user_svc is eventually rewritten, this file changes and nothing else does.
    """

    async def find_by_id(self, user_id: str) -> User | None:
        raw = legacy_user_svc.get_usr(user_id)  # old name, old shape, old error style
        if raw is None or raw.get("deleted") == 1:
            return None
        return User(
            id=str(raw["usr_id"]),
            email_address=raw["email"],
            is_verified=bool(raw["verified_flg"]),
        )
```

This is the strangler pattern and it is the only approach that works at scale: the new
implementation grows beside the old one, traffic moves over piece by piece, and the old one
is deleted when nothing calls it. Do not attempt a cutover.

## When the standard and the local pattern genuinely clash

1. Follow the local pattern for this change.
2. Say which rule you bent and why, in one sentence.
3. If the debt is worth paying down, name the migration ticket. Do not open it inside this
   ticket.

```
Bent: architecture.md layering. orders.py holds SQL directly in the handler, matching the
other fourteen handlers in this module. Extracting a repository would touch all of them.
New: added the ownership check the standard requires, because that one does not bend.
Follow-up: "Extract repositories in modules/orders" - not done here.
```

## Things that look like the local pattern but are not

Be careful not to copy forward:

- A bug that has been faithfully reproduced in six places. Six occurrences of the same bug
  is not a convention.
- A workaround for a library version that was upgraded two years ago.
- Commented-out code. Never copy it, never add to it.
- A pattern that exists once. One occurrence is not a convention; it is one person's choice.
  Look for three before calling something the house style.
- Anything in a file whose header comment says "temporary" and whose blame is from 2019.

When the "pattern" is really just accumulated damage, follow the standard for your new code
and say why you did not match the surroundings.
