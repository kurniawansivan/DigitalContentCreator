# Engineering Standard

This repository uses a fixed engineering standard. It is enforced mechanically by hooks in
`.claude/hooks/`. You cannot end a turn while lint, type checks, or tests are failing.

## Absolute rules

These are never negotiable. Do not ask for permission to break one, and do not work around
one. If a rule blocks you, the code is wrong, not the rule.

1. **Never suppress a check.** No `eslint-disable`, `@ts-ignore`, `@ts-nocheck`,
   `@ts-expect-error`, `# noqa`, `# type: ignore`, `# pylint: disable`, `prettier-ignore`,
   `biome-ignore`, `istanbul ignore`, `--no-verify`, `--passWithNoTests`. Fix the cause.
2. **Never skip a test.** No `.skip`, `.only`, `xit`, `xdescribe`, `fit`, `fdescribe`,
   `@pytest.mark.skip`, `@pytest.mark.xfail`.
3. **Never use `any`** (TypeScript) or `Any` (Python). Use a real type, or `unknown` /
   `object` plus narrowing.
4. **No abbreviations in identifiers.** `userRepository`, not `usrRepo`. `index`, not `idx`.
   `request`, not `req` (except framework-supplied handler parameters). Allowed short forms:
   `id`, `url`, `uri`, `api`, `http`, `db`, `io`, `ui`, `sql`.
5. **One function, one job.** Maximum 40 lines, nesting depth 2, 3 parameters. Replace
   `else` chains with guard clauses, early returns, or a lookup map.
6. **No duplicated logic.** The second time you write the same logic, extract it.
7. **Format and lint every file you touch.** The `PostToolUse` hook runs the formatter,
   linter, and type checker on each edited file. If it reports a problem, fix it
   immediately, before continuing with anything else.
8. **Every ticket ships tests.** No tests means the ticket is not done. See the
   `testing-standard` skill.
9. **Every API response uses the fixed envelope with camelCase keys.** See
   `.claude/skills/backend-standard/references/api-contract.md`.
10. **Never edit `.claude/hooks/**`, `.claude/settings.json`, `.claude/scripts/**`, or
    `.claude/baseline/**`.** Those are the guardrails. Only the human changes them.
11. **No em dashes. No banner or divider comments.** Never use an em dash in code, a
    comment, or a string; use a hyphen, a comma, or two sentences. Never write a comment
    line made only of repeated punctuation as a section border. A comment is one short
    line; if it needs more than that, it belongs in documentation, not the code.

## In an existing codebase, match what is already there

This standard describes where the code is going. It does not authorise a rewrite to get
there. Inside existing code, **follow the surrounding pattern** for structure, naming,
layering, error style, and test style - consistency beats correctness-in-isolation, and a
large unrequested refactor is a worse outcome than code that does not match the standard.

Genuinely new modules get the standard in full. Existing modules get a migration path, not
a cutover. If a change starts rippling into files the ticket never mentioned, stop and name
it as a separate refactor.

Rules 1, 2, and the security rules never bend, in any codebase, at any age. "The rest of
the file does it" is a reason to raise a cleanup ticket, never a reason to add one more.

Load the `legacy-adoption` skill before the first change in any codebase that already has
code in it.

## Where work is tracked

Every ticket, requirement, and its acceptance criteria live in `docs/`, not only in chat
history. `docs/requirements/` restates each PRD.md functional area in engineering-ready
terms; `docs/tickets/` holds one file per unit of work, following the four phases in the
`ticket-workflow` skill (scope, contract, test plan, then implementation notes).

Before starting any unit of work, in this order:

1. Read the ticket file in `docs/tickets/` for the work requested. If it does not exist
   yet, create it there first (copy `docs/tickets/TEMPLATE.md`) instead of only describing
   it in chat.
2. Read the current codebase relevant to that ticket - check what actually exists on disk,
   do not assume from memory, from the PRD, or from the ticket file alone.
3. State a short implementation plan for the ticket as a whole - the order of files and
   layers you will touch, and which existing tools/scaffolding you will use rather than
   hand-roll - before writing any code, and get it confirmed.

A ticket is not done until every acceptance criterion checked off in its `docs/tickets/`
file. Update the ticket file itself when scope changes mid-implementation, so it stays the
record of what was actually decided, not only what was originally proposed.

## Load the standard before writing code

Do not write code in these areas from memory. Load the skill first.

| Working on | Load skill |
| --- | --- |
| API, service, repository, database, auth, background job | `backend-standard` |
| Component, page, styling, layout, design system | `frontend-standard` |
| Any test, at any level | `testing-standard` |
| Starting or finishing a unit of work | `ticket-workflow` |
| Any change inside an existing or legacy codebase | `legacy-adoption` |

## Architecture

Backend request flow is strictly one direction:

```
route -> controller -> service -> repository -> database
```

- A controller only translates HTTP to and from the service layer. It never touches the
  database and never contains business rules.
- A service holds business rules. It never sees `request` or `response` objects, and never
  writes SQL.
- A repository only reads and writes data. It contains no business rules.

Frontend is mobile-first. Write base styles for the smallest screen, then widen with
`min-width` media queries only. `max-width` media queries are blocked.

## Before you report the work as done

Run `/audit`. It launches three independent reviewers (backend, frontend, tests) that read
the diff cold and report violations. Fix everything they find, then run `/ship`.

Reporting work as complete while a gate is failing is a worse outcome than reporting that
the work is blocked. Say what is failing.
