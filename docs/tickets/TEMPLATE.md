# TICKET-ID: Title

**Status:** Proposed
**Requirement area:** [link to docs/requirements/NN-....md, or "Foundation" for infra]
**Depends on:** (other ticket IDs, or none)

## Phase 1 - Scope

**Goal:** one sentence, user-visible outcome.

**Acceptance criteria**

- [ ] ...

**Out of scope**

- ...

**Affected surface**

- Endpoints:
- Screens:
- Tables:
- Existing files touched:

**Risks**

- (auth, money, personal data, migrations, public contract - or "none" and why)

## Phase 2 - Contract

Request/response schemas (envelope, camelCase), error codes, database migration,
component props/states.

## Phase 3 - Test plan

| Acceptance criterion | Test level | Test name |
| --- | --- | --- |
| | | |

## Phase 4 - Implementation notes

Filled in once work starts: order of files touched, decisions made mid-implementation,
deviations from Phase 1-2 and why.

- [ ] Migration and model
- [ ] Repository, with integration test
- [ ] Service and business rules, with unit tests
- [ ] Controller, route, schemas, with endpoint integration test
- [ ] Frontend types generated from the updated OpenAPI document
- [ ] Frontend data layer, then components, with unit tests
- [ ] End-to-end test for the flow
- [ ] Documentation updated (changelog, README if setup changed)
- [ ] `/audit` clean
- [ ] `/ship` clean
