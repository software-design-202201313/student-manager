# PRD / Design Spec Gap Analysis

As of 2026-04-08, this table lists only the meaningful mismatches between `docs/prd.md`, `docs/design-spec.md`, and the current implementation. Use it to decide what to build next.

| Priority | Gap | Spec expectation | Current state | Recommended action |
|---|---|---|---|---|
| P1 | Onboarding contract | PRD REQ-004 says teachers directly create student and parent accounts. | The app now uses invite-based activation, with invitation preview/acceptance and password recovery/reset flows. | Pick one contract and align everything. If invite-based onboarding is the intended product direction, update PRD/design-spec. If direct creation is required, add explicit direct onboarding APIs and keep invites as an optional fallback. |
| P1 | List response shape | Design spec says list endpoints should return `{ total, items }` with pagination. | Many list endpoints currently return arrays for MVP simplicity. | Either implement pagination wrappers across list endpoints or revise the design spec to explicitly state the MVP array contract. |
| P2 | Bulk grade entry API | Design spec mentions `POST /grades/bulk` for class-wide grade entry. | The app currently exposes CSV/XLSX import routes under `/import/*` instead of a dedicated bulk grade endpoint. | Decide whether a dedicated bulk endpoint is still needed. If yes, implement it; if not, update the docs to treat the import routes as the supported bulk path. |

## Recommended Development Order

1. Lock the onboarding contract first. It affects the auth flow, user creation UX, and the product narrative in the docs.
2. Resolve the list response shape second. This is a cross-cutting API contract decision.
3. Decide on the bulk grade API last. Functionally the app already supports grade import, so this is mostly a contract and documentation decision unless you need the exact endpoint for compliance.
