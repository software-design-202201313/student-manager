# Development Priority Plan

This plan is based on the current codebase and the gap table in `docs/spec-gap-analysis.md`.

## What is actually actionable now

| Priority | Task | Type | Why it matters | Done when |
|---|---|---|---|---|
| P1 | Add integration/e2e coverage and wire it into the QA gate | Code | This is the only remaining work that clearly improves confidence without changing product direction. | QA runs end-to-end tests and coverage is measured in CI. |
| P2 | Keep the onboarding contract documented as invite-based | Spec | The app already behaves this way; the doc should stop implying direct creation. | PRD/design-spec/README all say invite-based onboarding. |
| P2 | Keep list responses documented as arrays for MVP | Spec | The current API contract is array-based, so docs need to stay in sync. | Spec notes arrays as the current contract and pagination as future work. |
| P3 | Keep bulk grade input documented via `/import/*` | Spec | The code already supports the supported bulk path; no extra endpoint is required unless product scope changes. | Design spec and PRD refer to `/import/grades` and `/import/grades/xlsx`. |

## If you decide to change product direction later

| Priority | Candidate work | Reason |
|---|---|---|
| P1 | Reintroduce `{ total, items }` pagination across list endpoints | This is a cross-cutting API contract change and would touch several clients. |
| P2 | Add `POST /grades/bulk` | Only needed if you want a dedicated bulk-write endpoint instead of import routes. |
| P3 | Add direct student/parent creation APIs | Only needed if you want to move away from invite-based onboarding. |

## Short version

- Do now: integration/e2e coverage.
- Document and preserve: invite-based onboarding, array list responses, `/import/*` bulk grade path.
- Only change code for the P2/P3 items if the product direction changes.
