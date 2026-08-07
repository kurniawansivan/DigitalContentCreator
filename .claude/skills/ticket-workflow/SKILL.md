---
name: ticket-workflow
description: The required workflow for a unit of work in this repository - how to scope a ticket, write the acceptance criteria and test plan before coding, the order of implementation, the definition of done, and the audit gate that must pass before the work is reported as complete. Load when starting a feature, bug fix, or refactor, when asked to plan work, or when about to report work as finished.
---

# Ticket Workflow

A ticket is the unit of work. Every ticket goes through the same five phases in the same
order. Skipping the first phase is what produces work that has to be redone.

## Phase 1 - Understand before writing

Write these down before touching code:

- **Goal.** One sentence about the user-visible outcome. Not "add a users table" but "a new
  customer can create an account and sign in".
- **Acceptance criteria.** Observable, testable statements. Each one becomes a test.
- **Out of scope.** What this ticket explicitly does not do. Without this, the change grows.
- **Affected surface.** Which endpoints, screens, tables, and existing code will change.
- **Risks.** Anything touching auth, money, personal data, migrations, or a public contract
  gets called out here.

Read the code that already exists first. Match its patterns. A ticket that invents a second
way to do something the codebase already does is a rejected ticket, however good the new way
is - raise it as a separate refactor instead.

If two readings of the request lead to materially different work, ask before building. If
the ambiguity is minor, choose, state the assumption, and continue.

## Phase 2 - Contract first

Before implementation, settle the interface between the layers:

- Request and response schemas, using the envelope and camelCase.
- Error codes this feature can return.
- Database changes as a migration.
- Component props and states for anything on screen.

Frontend and backend can then proceed in parallel against an agreed contract instead of
guessing at each other.

## Phase 3 - Test plan, written before the code

List the tests the ticket will produce, mapped to the acceptance criteria:

| Acceptance criterion | Test level | Test name |
| --- | --- | --- |
| A new customer can register | Integration | registers a customer and returns 201 with the envelope |
| A duplicate email is rejected | Integration | returns 409 RESOURCE_ALREADY_EXISTS for a registered email |
| The password is hashed with Argon2id | Unit | stores an argon2id hash and never the plain password |
| Registration is rate limited | Integration | returns 429 after the tenth attempt in a minute |
| A customer reaches the dashboard after signing up | End-to-end | new customer registers and lands on the dashboard |

For a bug fix, the first step is a failing test that reproduces the bug. If you cannot
reproduce it with a test, you do not yet understand the bug.

## Phase 4 - Implement, in this order

1. Migration and model.
2. Repository, with its integration test.
3. Service and business rules, with unit tests. Tests alongside the code, not after it all.
4. Controller, route, and schemas, with the endpoint integration test.
5. Frontend types generated from the updated OpenAPI document.
6. Frontend data layer, then components, with their unit tests.
7. End-to-end test for the flow.
8. Documentation: the changelog, and the README if setup changed.

Commit in small, working steps. Every commit leaves the suite green. Conventional Commits
format: `feat(auth): add refresh token rotation`.

## Phase 5 - The gate

Run in this order, and do not proceed past a red step:

1. Formatter, linter, type checker, and the full test suite - all green with no suppression.
2. `/audit` - the backend, frontend, and test auditors read the diff independently. Fix
   everything they raise.
3. Self-review the diff as if someone else wrote it. Read every line. Remove debugging
   leftovers, commented-out code, and anything that is not part of this ticket.
4. `/ship` - the final combined gate.

## Definition of done

A ticket is done when every one of these is true. Not "mostly".

- [ ] Every acceptance criterion is met and has a test proving it
- [ ] Unit tests for logic, integration tests for endpoints, end-to-end for the flow
- [ ] Coverage at or above threshold; 100% on auth, permission, money, and deletion paths
- [ ] No lint error, no type error, no suppression comment, no skipped test
- [ ] API responses use the envelope with camelCase keys
- [ ] Mobile layout verified at 360 px before any wider layout
- [ ] Keyboard operable, contrast checked, focus visible
- [ ] No secret, no debug output, no commented-out code in the diff
- [ ] All three auditors pass
- [ ] The changelog and any affected documentation are updated

## Reporting

Say what is actually true. If part of the ticket is blocked, deliver everything else in full
and state plainly what is left and why. Reporting a ticket as complete while a gate is red
is worse than reporting it as blocked - the gate will catch it anyway, later and louder.
