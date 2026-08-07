---
description: Final gate before a pull request - format, lint, types, tests, audit, self-review
allowed-tools: Bash, Read, Grep, Glob, Edit, Agent
---

Run the full gate. Stop at the first red step, fix the cause, then start again from the top.
Never move past a failing step, and never make a step pass by suppressing it.

**1. Working tree**

!`git status --short`

**2. Formatter, linter, type checker, tests**

Run the project's own commands. Detect them from `package.json` scripts or `pyproject.toml`,
or read `.claude/gate.config.sh` if the repository defines them there. Typically:

- format check, lint, typecheck, unit tests, integration tests, end-to-end tests
- coverage report, checked against the thresholds in the testing standard

Report the actual output of each. If a step is missing from the project, say so rather than
skipping it silently.

**3. Suppression sweep**

Grep the diff for anything that routes around a gate:

!`git diff HEAD | grep -nE 'eslint-disable|@ts-(ignore|nocheck|expect-error)|# *(noqa|type: *ignore)|pylint: *disable|prettier-ignore|biome-ignore|(istanbul|c8|v8) ignore|pragma: no cover|\.(skip|only)\(|xit\(|fit\(|xdescribe\(|fdescribe\(|@pytest\.mark\.(skip|xfail)|passWithNoTests' || echo "clean"`

Any hit is a blocker. Remove it and fix the underlying problem.

**4. Leftovers sweep**

!`git diff HEAD | grep -nE '^\+.*(console\.(log|debug)|debugger|breakpoint\(\)|pdb\.set_trace|TODO|FIXME|XXX|HACK)' || echo "clean"`

Remove debug output and commented-out code. A `TODO` is only acceptable with a ticket
reference beside it.

**5. Secret sweep**

!`git diff HEAD | grep -nEi '^\+.*(AKIA[0-9A-Z]{16}|BEGIN [A-Z ]*PRIVATE KEY|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|(password|secret|api_?key|token)\s*[:=]\s*["'"'"'][^"'"'"'{$][^"'"'"']{7,})' || echo "clean"`

Any hit is a blocker, even in a test file.

**6. Audit**

Run `/audit` and resolve every confirmed finding.

**7. Self-review**

Read the complete diff line by line as if a stranger wrote it. Check: does anything here
belong to a different ticket, is anything half-finished, would a new engineer understand why
each piece exists, and is every acceptance criterion actually met and actually tested.

**8. Report**

State the result plainly:

- Every gate step and its real outcome
- What the auditors found and what was fixed
- Anything still open, and why

$ARGUMENTS

Do not report the work as shippable while any step is red. If something is blocked, say what
and why, and deliver everything else complete.
