# Requirements Index

Each file bridges a PRD.md section 5 functional area into engineering-ready requirements.
PRD.md stays the detailed, canonical spec - these files restate it in testable/implementable
terms and track which tickets implement it.

| # | Area | PRD source | Status | Tickets |
| --- | --- | --- | --- | --- |
| 01 | Moment & Calendar Engine | [PRD.md §5.1](../../PRD.md#51-moment--calendar-engine) | Proposed | [MOMENTA-0003](../tickets/MOMENTA-0003-moment-calendar-engine.md) |
| 02 | Script Generation Engine | [PRD.md §5.2](../../PRD.md#52-script-generation-engine-tanpa-ai) | Proposed | [MOMENTA-0005](../tickets/MOMENTA-0005-script-generation-engine.md) |
| 03 | Reelkit Video Assembly | [PRD.md §5.3](../../PRD.md#53-reelkit-integration-video-assembly) | Proposed | [MOMENTA-0006](../tickets/MOMENTA-0006-reelkit-video-assembly.md) |
| 04 | Brand Kit / Style Customization | [PRD.md §5.4](../../PRD.md#54-brand-kit--kustomisasi-style-fe-per-user) | Proposed | [MOMENTA-0004](../tickets/MOMENTA-0004-brand-kit.md) |
| 05 | Content Planner Dashboard | [PRD.md §5.5](../../PRD.md#55-content-planner-dashboard) | Proposed | [MOMENTA-0007](../tickets/MOMENTA-0007-content-planner-dashboard.md), [MOMENTA-0008](../tickets/MOMENTA-0008-reminder-notification.md) |

Foundational/infrastructure work (project scaffold, user accounts, CI, shared libraries)
does not map to a single PRD requirement - it lives directly in `docs/tickets/`
referencing the relevant architecture sections (PRD.md §7-11) instead of a requirement
file here. See [MOMENTA-0001](../tickets/MOMENTA-0001-scaffold-monolith.md) and
[MOMENTA-0002](../tickets/MOMENTA-0002-user-accounts.md).

See [`docs/tickets/README.md`](../tickets/README.md) for build order and dependencies.
