---
description: Start a ticket the correct way - scope, contract, test plan, then implementation
allowed-tools: Read, Grep, Glob, Bash, Edit, Write, Skill
---

Start a ticket for: $ARGUMENTS

Follow `.claude/skills/ticket-workflow/SKILL.md`. Load it now if it is not already loaded.

Do not write implementation code until phases 1 to 3 are written down and shown to me.

**Phase 1 - Scope.** Produce:

- Goal, in one sentence describing the user-visible outcome
- Acceptance criteria as observable, testable statements
- Explicitly out of scope
- Affected surface: endpoints, screens, tables, existing files
- Risks: anything touching auth, money, personal data, migrations, or a public contract

Before writing any of this, read the existing code in the affected area. Match the patterns
that are already there. If the codebase already solves this problem a different way, say so
and use the existing way.

**Phase 2 - Contract.** Request and response schemas using the envelope with camelCase keys,
the error codes this feature can return, the database migration, and the component props and
states for anything on screen.

**Phase 3 - Test plan.** A table mapping every acceptance criterion to a test level and a
test name, per the testing standard. For a bug fix, start with the failing test that
reproduces it.

Stop there and show me the three phases. Once I confirm, implement in the order given in the
workflow skill: migration, repository, service, controller, generated types, frontend data
layer, components, end-to-end test - writing each test alongside its code, not afterwards.

Finish with `/audit`, then `/ship`.
