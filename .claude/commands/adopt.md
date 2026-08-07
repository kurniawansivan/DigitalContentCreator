---
description: Analyse an existing codebase and set up incremental adoption of the standard
allowed-tools: Bash, Read, Grep, Glob, Write, Skill
---

Set up adoption of the engineering standard in this existing codebase.

Load `.claude/skills/legacy-adoption/SKILL.md` first.

## 1. Survey what is actually here

!`ls -la && echo "---" && git log --oneline -10 2>/dev/null && echo "---" && git rev-list --count HEAD 2>/dev/null`

!`cat package.json 2>/dev/null | head -60; cat pyproject.toml 2>/dev/null | head -60`

Determine and report, from the code rather than from assumption:

- Language, framework, and versions
- Size: file count, rough line count, age in commits
- Where business logic actually lives today (controllers, models, services, utilities)
- How failure is reported today (exception, error tuple, null, result object)
- Current response shape of the API, and whether it is camelCase or snake_case
- Test framework, test count, and whether the suite currently passes
- Existing lint, format, and type configuration, and whether it currently passes
- Authentication approach: hashing algorithm, token type, token lifetime
- Anything alarming: hardcoded secrets, string-built SQL, missing authorization checks

## 2. Decide the mode

Recommend one, with the reason:

- `strict` - the repository is small or already clean
- `ratchet` - the normal choice for an existing codebase
- `observe` - the suite is currently red, or the team needs a week to calibrate

## 3. Record the baseline

Ask me to confirm the mode, then run:

```bash
./.claude/scripts/generate-baseline.sh --mode <mode>
```

Report the numbers it records. Those are the debt ceiling from now on.

## 4. Write the adoption plan

Create `ADOPTION.md` in the repository root containing:

- **House conventions** - the local patterns new code should match: naming, layering, error
  style, test style, import style. This is what stops the standard from being applied
  blindly over a codebase with its own coherent shape.
- **Where the standard applies in full** - which folders are new-code territory
- **Where the standard bends** - which existing modules keep their pattern, and why
- **Never negotiable here either** - suppressions, skipped tests, secrets, string-built SQL,
  missing authorization checks
- **Migration ladder** - the ordered list of debts to pay down, highest value first, each as
  its own future ticket, with the relevant recipe from
  `.claude/skills/legacy-adoption/references/migration-recipes.md`
- **Baseline numbers** and the date

## 5. Report anything dangerous separately

If the survey found a hardcoded secret, a SQL injection, or a missing authorization check,
list those separately and clearly at the end. Those are not adoption debt to schedule; they
are incidents. Do not fix them silently as part of this command - tell me what you found and
where, and let me decide.

$ARGUMENTS

Do not change any application code in this command. It surveys, records, and plans only.
