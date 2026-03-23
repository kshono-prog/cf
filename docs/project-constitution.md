# Project Constitution

## Purpose

Creator Founding is a creator operations platform that combines public support, project funding, and reviewable AI assistance in one product.

## Product Principles

- Keep the main value focused on creator operations, not generic AI novelty.
- Make support status and next actions understandable from the same workflow.
- Prefer reviewable assistance over invisible automation.
- Separate daily work from high-risk funding and settlement controls.
- Preserve creator trust with clear state, clear ownership, and visible audit trails.

## Safety Rules

- Never auto-execute bridge, settlement, or fund movement without explicit human approval.
- Treat project status, goal achievement, bridge state, and distribution state as reviewable records.
- Do not hide owner-only controls or bypass owner checks.
- Keep high-risk or externally meaningful actions reviewable before the next step advances.
- Avoid expanding risk scope through convenience UI alone.

## Source of Truth

- Product intent: `docs/roadmap/vision.md`
- Runtime boundaries: `docs/architecture.md`
- Domain terms: `docs/domain-model.md`
- Task output contracts: `docs/specs/creator-ai-office/task-output-contracts.md`
- Current implementation status: `PROJECT_STATE.md`
- Current work queue: `TASKS.md`

## AI Operating Principles

- Start with deterministic suggestions before introducing LLM-dependent behavior.
- Prefer local context already available in dashboard or summary payloads.
- Explain why a suggestion exists, not only what to do next.
- Return a short, prioritized list rather than many weak suggestions.
- Keep high-risk actions approval-gated even when the recommendation is obvious.

## Engineering Principles

- Prefer minimal diffs and preserve the current architecture.
- Keep logic pure where possible and isolate UI from decision rules.
- Use runtime guards for `unknown` data instead of unsafe casts.
- Keep docs and fixtures close to implementation decisions.
- Validate with `lint`, `typecheck`, and `build` before closing work.

## Current Golden Flow

1. Creator creates or selects a `Project`.
2. Creator saves a `Goal`.
3. Creator checks `Summary` and contribution progress.
4. Creator confirms goal achievement when the target is reached.
5. Creator saves a distribution `Plan`.
6. Creator prepares or confirms `Bridge` state.
7. Creator saves the `Distribution result`.

## Near-Term AI Goal

The near-term AI goal is to add a thin recommendation layer that reads current project summary data and proposes the next operator action without executing anything automatically.
