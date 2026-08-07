---
name: legacy-adoption
description: How to apply this engineering standard inside an existing or legacy codebase without rewriting it - which rules bend to the local convention and which never bend, how to match the surrounding pattern, the ratchet gates, and how to introduce the response envelope, design tokens, layering, and tests incrementally. Load before the first change in any codebase that already has code in it, when a standard rule conflicts with an existing pattern, or when a change is starting to grow beyond its ticket.
---

# Working in an Existing Codebase

The standard describes where the codebase is going. It does not authorise a rewrite to get
there. In a codebase that already has code in it, the default is: **match what is around
you, leave it better than you found it, and change nothing this ticket did not ask for.**

A large refactor that nobody asked for is a worse outcome than code that is inconsistent
with the standard. It cannot be reviewed, it cannot be reverted cleanly, and it breaks
things nobody predicted.

| Reference | Covers |
| --- | --- |
| `references/pattern-matching.md` | Which rules bend to local convention, which never do, and how to read the local convention |
| `references/adoption-modes.md` | strict / ratchet / observe, the baseline, and what the gates actually check |
| `references/migration-recipes.md` | Introducing the envelope, tokens, layering, auth, and tests without a big-bang change |

## Before the first change

Read before you write. Specifically:

1. Two or three files near the one you are about to change. Note the layering, the naming,
   the error style, the test style, the import style.
2. The existing tests for that area. They document the real contract, including the
   accidental parts other code depends on.
3. `git log` on the file. A file changed by ten people last month is live; a file untouched
   for three years may have callers nobody remembers.

Then state, in one line, which local pattern you are following and where it differs from
the standard. If you cannot find a local pattern, the standard applies in full.

## The three questions

**Is this file mine now?**
You touched it, so its lint must not get worse and the lines you wrote meet the standard in
full. The rest of the file is not your ticket.

**Does the standard conflict with the local pattern here?**
For structure, naming, and idiom: the local pattern wins inside existing code. Consistency
is worth more than correctness-in-isolation, because a reader has to hold one model in
their head, not two. For security, secrets, suppressions, and skipped tests: the standard
wins always - see the absolutes below.

**Would this change ripple?**
If a change forces edits in files the ticket never mentioned, stop. That is a separate
refactor ticket. Deliver the ticket, name the refactor, move on.

## Never negotiable, in any codebase, at any age

These do not bend to local convention, are not grandfathered, and are blocked by the hooks
regardless of adoption mode:

- **No new suppression.** No `eslint-disable`, `@ts-ignore`, `# noqa`, `# type: ignore`,
  `prettier-ignore`, `istanbul ignore`. If the surrounding file is full of them, that is
  the debt you are ratcheting down, not a pattern to copy.
- **No new skipped test.** `.skip`, `.only`, `xit`, `@pytest.mark.skip`. If the file is full
  of skipped tests, do not add the next one.
- **No secret in source.** Not even next to the three that are already there. An existing
  hardcoded credential is an incident to report, not a convention to match.
- **No new SQL built by string concatenation**, even in a file that does it everywhere else.
  Parameterize the query you write.
- **No weakening of an existing check.** Never lower a coverage threshold, add an ignore
  path, widen a lint exclusion, or delete a test to make a build green.

"The rest of the file does it" is a reason to raise a cleanup ticket. It is never a reason
to add one more.

## The boy scout rule, with a boundary

Leave the file better than you found it - by a small, reviewable amount:

**Do** fix the function you are already editing: rename the abbreviated variable, extract
the nested branch you had to read anyway, add the missing type on the signature you
touched, add the test that was missing for the behaviour you changed.

**Do not** reformat the file, reorder its imports, rename its exports, restructure its
folder, migrate it to a new pattern, or upgrade its library - not as part of another ticket.

The test: can a reviewer see what the ticket did without scrolling past unrelated churn? If
the diff is 40 lines of feature and 400 lines of formatting, the answer is no, and the
formatting belongs in its own commit.

Formatting an unformatted legacy file is a real improvement - do it in a **separate,
formatting-only commit**, and add that commit hash to `.git-blame-ignore-revs` so it does
not destroy the blame history. The hooks will not auto-format a pre-existing file for
exactly this reason.

## When the standard would break something

Some of the standard cannot be applied to a running system without a migration:

- Changing an existing endpoint to the envelope breaks every current client.
- Adding `extra="forbid"` to an existing schema rejects payloads that used to work.
- Turning on strict types across a large project produces thousands of errors at once.
- Shortening a token lifetime logs everyone out.

In each case the answer is the same shape: **new code gets the standard, old code gets a
migration path, and both run at once until the old path is retired.** The recipes are in
`references/migration-recipes.md`. Never flip one of these globally in a ticket that was
about something else.

## What to say

When a rule was bent, say so, once, plainly:

> Followed the existing `services/user_svc.py` structure rather than the standard's
> `controller / service / repository` split - the module has eleven callers that would all
> need updating. New endpoints in `modules/billing/` use the standard layout. Raising the
> migration as a separate ticket.

Do not silently apply the standard and leave the ripple for someone else to find. Do not
silently ignore the standard either.
