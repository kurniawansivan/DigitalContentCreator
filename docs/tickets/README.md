# Tickets Index

One file per unit of work. New tickets copy [`TEMPLATE.md`](./TEMPLATE.md) and follow the
four phases in `.claude/skills/ticket-workflow/SKILL.md`: scope, contract, test plan, then
implementation. See [`../README.md`](../README.md) for the status convention.

Order below is dependency order (build top to bottom), not PRD section order.

| ID | Title | Requirement area | Depends on | Status |
| --- | --- | --- | --- | --- |
| [MOMENTA-0001](./MOMENTA-0001-scaffold-monolith.md) | Scaffold the monolith (Next.js + PostgreSQL + Docker) | Foundation | - | Ready |
| [MOMENTA-0002](./MOMENTA-0002-user-accounts.md) | User accounts (register, login, session) | Foundation | 0001 | Proposed |
| [MOMENTA-0003](./MOMENTA-0003-moment-calendar-engine.md) | Moment & Calendar Engine | [01](../requirements/01-moment-calendar-engine.md) | 0001 | Proposed |
| [MOMENTA-0004](./MOMENTA-0004-brand-kit.md) | Brand Kit & Style Customization | [04](../requirements/04-brand-kit.md) | 0002 | Proposed |
| [MOMENTA-0005](./MOMENTA-0005-script-generation-engine.md) | Script Generation Engine | [02](../requirements/02-script-generation-engine.md) | 0002, 0003 | Proposed |
| [MOMENTA-0006](./MOMENTA-0006-reelkit-video-assembly.md) | Reelkit Video Assembly | [03](../requirements/03-reelkit-video-assembly.md) | 0001, 0004, 0005 | Proposed |
| [MOMENTA-0007](./MOMENTA-0007-content-planner-dashboard.md) | Content Planner Dashboard | [05](../requirements/05-content-planner-dashboard.md) | 0003, 0005, 0006 | Proposed |
| [MOMENTA-0008](./MOMENTA-0008-reminder-notification.md) | H-1 reminder notification | [05](../requirements/05-content-planner-dashboard.md) | 0007 | Proposed |

This covers PRD.md Fase 1 (MVP) and Fase 2 in full (PRD §13). Fase 3 / nice-to-have items
(PRD §14 - multi-format export, template marketplace, WhatsApp delivery, batch ZIP, etc.)
are intentionally not pre-ticketed; raise them as new tickets here if/when prioritized,
rather than growing the scope of the tickets above.

Only MOMENTA-0001 has been discussed and agreed in detail so far (`Ready`). MOMENTA-0002
through 0008 are drafted against PRD.md and the matching requirement file, and need a
quick read-through/confirmation before their status moves to `Ready`.
