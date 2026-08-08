# Requirements Index

Each file bridges a PRD.md section 5 functional area into engineering-ready requirements.
PRD.md stays the detailed, canonical spec - these files restate it in testable/implementable
terms and track which tickets implement it.

| # | Area | PRD source | Status | Tickets |
| --- | --- | --- | --- | --- |
| 01 | Moment & Calendar Engine | [PRD.md §5.1](../../PRD.md#51-moment--calendar-engine) | Proposed | - |
| 02 | Script Generation Engine | [PRD.md §5.2](../../PRD.md#52-script-generation-engine-tanpa-ai) | Proposed | - |
| 03 | Reelkit Video Assembly | [PRD.md §5.3](../../PRD.md#53-reelkit-integration-video-assembly) | Proposed | - |
| 04 | Brand Kit / Style Customization | [PRD.md §5.4](../../PRD.md#54-brand-kit--kustomisasi-style-fe-per-user) | Proposed | - |
| 05 | Content Planner Dashboard | [PRD.md §5.5](../../PRD.md#55-content-planner-dashboard) | Proposed | - |

Foundational/infrastructure work (project scaffold, CI, shared libraries) does not map to a
single PRD requirement - it lives directly in `docs/tickets/` referencing the relevant
architecture sections (PRD.md §8-11) instead of a requirement file here.
