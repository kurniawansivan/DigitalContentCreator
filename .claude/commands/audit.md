---
description: Run the independent backend, frontend, and test auditors over the current diff in parallel
allowed-tools: Agent, Bash(git diff:*), Bash(git status:*), Read, Grep, Glob
---

Audit the current change with three independent reviewers.

First establish what changed:

!`git status --short 2>/dev/null | head -50`

!`git diff --stat HEAD 2>/dev/null | tail -30`

Then launch the auditors. Send them in a single message so they run concurrently:

- `backend-auditor` - if the diff touches any server, API, service, repository, model,
  migration, middleware, or job code
- `frontend-auditor` - if the diff touches any component, page, style, token, hook, or store
- `test-auditor` - always, without exception
- `contract-guard` - if the diff touches both sides, or changes any request or response schema

Give each auditor the list of changed files and tell it to read the full files, not only the
diff hunks.

$ARGUMENTS

When the reports come back:

1. Merge them and order every finding by severity, most severe first.
2. Deduplicate findings that two auditors raised.
3. For each finding, verify it yourself against the code before acting. Auditors are not
   infallible, and a wrong finding acted on blindly makes the code worse. If a finding is
   wrong, say which one and why.
4. Fix every confirmed BLOCKER and MAJOR. Never by suppressing a rule, skipping a test, or
   weakening an assertion - those routes are blocked and they are also the wrong answer.
5. Re-run `/audit` after fixing, until the confirmed findings are empty.

Report the final state honestly: what was found, what was fixed, and anything left open with
the reason. Do not report the audit as clean while a confirmed finding stands.
