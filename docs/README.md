# Project Documentation

This folder is the source of truth for **what to build** (`requirements/`) and **the
units of work that build it** (`tickets/`), so that state lives on disk instead of only in
chat history.

- [`PRD.md`](../PRD.md) - the locked product requirements document (v1.0, final). It stays
  the canonical, detailed spec. Files under `requirements/` do not repeat it; they bridge
  a PRD section into engineering-ready requirements and point back to it.
- [`requirements/`](./requirements/) - one file per functional area from PRD.md section 5,
  restated as implementation-ready requirements, with links to the ticket(s) that
  implement them.
- [`tickets/`](./tickets/) - one file per unit of work, following the four phases in
  `.claude/skills/ticket-workflow/SKILL.md`: scope, contract, test plan, then
  implementation notes. A ticket is not done until every acceptance criterion in its file
  is checked off.

## Status convention

Both requirement and ticket files carry a `Status` field at the top:

| Status | Meaning |
| --- | --- |
| `Proposed` | Written, not yet reviewed/agreed |
| `Ready` | Scope and contract agreed, not started |
| `In Progress` | Implementation underway |
| `Blocked` | Waiting on a decision or dependency, noted in the file |
| `Done` | Shipped, acceptance criteria all checked off |

## How this connects to CLAUDE.md

Per the root [`CLAUDE.md`](../CLAUDE.md), before starting any unit of work: read the
relevant ticket here (or create it first), check the current codebase against it, and
state an implementation plan for the ticket as a whole before writing code.
