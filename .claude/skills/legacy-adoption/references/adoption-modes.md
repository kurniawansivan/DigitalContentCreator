# Adoption Modes and the Ratchet

The gates would block on turn one in an existing codebase: thousands of pre-existing lint
problems, type errors, and possibly already-failing tests, none of them caused by the
current change. The ratchet exists so the gates measure *your* change, not the repository's
history.

## The three modes

Set in `.claude/adoption.conf`.

| Mode | Formatter | Lint | Types | Tests | Use when |
| --- | --- | --- | --- | --- | --- |
| `strict` | Formats every file touched | Whole repository must be clean | Zero errors | All pass | Greenfield, or once the debt reaches zero |
| `ratchet` | Formats new files only; never rewrites a legacy file | Files you touch must not get worse; new files must be clean | Repository error count must not rise | Failure count must not rise | Existing codebase. The default when a baseline exists |
| `observe` | Formats new files only | Reports, never blocks | Reports | Reports | First week of adoption, while the team calibrates |

## Setting up the ratchet

Run once, by hand, in the target repository:

```bash
./.claude/scripts/generate-baseline.sh --mode ratchet
```

It records, into `.claude/baseline/`:

- the commit it was taken at (`BASELINE_REF`)
- the total lint problem count
- the total type error count
- the failing test count
- the lint problem count **per file**

Commit that directory and `.claude/adoption.conf` so the whole team ratchets from the same
point.

The script refuses to overwrite an existing baseline. Regenerating it after writing new
violations would launder them into the accepted debt, which defeats the entire mechanism. A
human who genuinely wants a new baseline deletes the directory deliberately.

## What the ratchet enforces

**Per file, for every file this change touched.** Its lint problem count is compared against
the count recorded at baseline. A file that had 40 problems may still have 40. It may not
have 41. A file that did not exist at baseline has an allowance of zero, so **new code meets
the standard in full**.

**Repository-wide, for types.** Type checkers cannot be scoped to a file list without losing
the project configuration, so the total error count is compared instead. It may fall. It may
not rise.

**Repository-wide, for tests.** A suite that was already red stays exactly as red. One more
failing test than the baseline is a regression this change caused, and it blocks.

**Formatting is not ratcheted; it is skipped.** Running a formatter over a file that has
never been formatted produces a diff of hundreds of unrelated lines, which is precisely the
unreviewable change the ratchet exists to prevent. Pre-existing files are left alone. New
files are formatted normally.

Format a legacy file in its own commit, then add that commit to `.git-blame-ignore-revs`:

```bash
git rev-parse HEAD >> .git-blame-ignore-revs
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

## What the ratchet does not soften

Ratchet mode changes how *counts* are enforced. It does not create an exemption for anything
in the "never negotiable" list. In every mode, these are blocked before the edit is written:

- any suppression comment
- any skipped or focused test
- any hardcoded secret

For `any`/`Any`, `console.log`, `max-width` queries, and hardcoded colors there is one
narrow allowance: a **full-file rewrite** (a `Write` over an existing legacy file) may keep
the occurrences that were already in that file, but may not add one. An `Edit` is always
held to the strict rule, because an `Edit` is code you are writing right now.

## Paying down the debt

The counts only move in one direction, so debt falls as a side effect of normal work. To
make it deliberate:

- Pick one rule, fix it repository-wide in a dedicated commit, and let the baseline counts
  drop. Do not mix it with feature work.
- Do the highest-value ones first: missing `await`, `any` on public signatures, missing
  authorization checks, unparameterized SQL.
- Track the numbers. `LINT_ERROR_COUNT` falling every sprint is a healthier signal than any
  coverage percentage.
- When the counts reach zero, switch `ADOPTION_MODE` to `strict` and delete the baseline.

## Overriding the detected commands

If the repository does not use standard script names, create `.claude/gate.config.sh`:

```bash
LINT_COMMAND="make lint"
TYPECHECK_COMMAND="make typecheck"
TEST_COMMAND="make test-fast"
```

An explicit command is used as-is and is not ratcheted - the ratchet applies to the
auto-detected per-file path. If the suite is slow, point `TEST_COMMAND` at a fast subset for
the Stop hook and leave the full run to continuous integration.

`GATE_ENABLED=0` disables the gate entirely. That is a human's decision to make and record,
not a way around a red build.
