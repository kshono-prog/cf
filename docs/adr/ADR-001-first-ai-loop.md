# ADR-001 First AI Loop

## Context

Creator Founding already has a structured operator flow around `Project`, `Goal`, `Summary`, `Achieve`, `Bridge`, and `Distribution result`. The product direction emphasizes approval-based assistance, but the first useful AI layer should remain easy to review and safe to ship.

## Decision

Implement the first AI loop as deterministic next-action suggestions driven by existing summary data. Keep the logic in a local pure function and surface the result inside the current mypage summary flow without auto-running any action.

## Why

- Deterministic rules are easy to review and test.
- Existing summary payloads already contain the state needed for the first suggestions.
- A pure function keeps the decision logic reusable for later API or agent integration.
- Advisory UI preserves current approval boundaries for high-risk actions.

## Alternatives

- Call an LLM immediately:
  - richer wording, but harder to validate and harder to keep deterministic
- Add a new AI-specific API first:
  - possible later, but unnecessary before the decision rules are stable
- Auto-run low-risk actions:
  - rejected for the first loop because the product still prioritizes explicit approval and auditability

## Follow-ups

- Add target-aware scroll or focus helpers from suggestions into existing UI blocks
- Attach structured `draftPayload` data for plan or announcement drafts
- Promote the pure function behind an API once the rule set stabilizes
- Evaluate where LLM assistance adds value without weakening approval boundaries
