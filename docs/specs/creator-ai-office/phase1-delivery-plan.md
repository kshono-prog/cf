# Creator AI Office Phase 1 Delivery Plan

## Purpose

Phase 1 turns Creator Founding from a dashboard that shows state into an approval-based operating workspace that helps a creator decide, draft, and review the next step.

This phase does **not** introduce autonomous funds movement, bridge execution, or x402 payment flows. It prepares the product for those later stages by making agent roles, task outputs, and approval boundaries practical.

## Status

As of 2026-03-18:

- Phase 1A `Manager Agent Task` is implemented
- Phase 1B `Distribution Plan Draft` is implemented
- Phase 1C `Role-Based AI Office Surface` is implemented
- Phase 1D `Usefulness Metrics` is implemented
- `Finance Agent -> settlement Draft` handoff is implemented as a Phase 1 extension

The remaining work is no longer core Phase 1 feature delivery. It is manual validation, UX polish, and deciding the first Phase 2 priorities from real usage.

## Phase 1 Outcome

By the end of Phase 1, the product should behave like a usable `AI事務所` for weekly creator operations.

Expected user-visible outcomes:

- a creator can receive a saved `Manager Agent` recommendation in AI Office
- a creator can generate a draft distribution plan from current project state
- AI Office can be explained in terms of roles, not only raw task types
- the team can measure whether suggestions and drafts are actually useful

## Scope

### In Scope

- `Manager Agent` task output based on project summary
- distribution plan draft generation as approval-only assistance
- role-aware AI Office language and launch points
- usefulness metrics for task approval and operator follow-through

### Out of Scope

- automatic bridge execution
- automatic distribution execution
- wallet signature delegation
- x402 seller routes or payment verification
- external MCP or marketplace integrations

## Delivery Order

### Phase 1A: Manager Agent Task

Goal:

- convert current next-action suggestions into a saved `AgentTask` output

User value:

- recommendations persist in inbox and history instead of disappearing with page state

Primary deliverables:

- new task type or role-aware task wrapper for manager recommendations
- parser / executor / output renderer
- AI Office create or automatic low-risk enqueue path
- docs and tests for the new task contract

Acceptance gate:

- a creator can open AI Office and review a `Manager Agent` recommendation
- task output references current summary state and suggested next actions

### Phase 1B: Distribution Plan Draft

Goal:

- let AI draft `distributionPlan` JSON without executing anything

User value:

- reduces manual JSON authoring for settlement preparation

Primary deliverables:

- pure draft builder from `Project / Goal / Summary`
- approval-ready draft payload structure
- UI action to apply draft into the existing plan editor
- `Finance Agent` task output から `Draft` step へ戻れる handoff
- tests for draft shape and safety fallbacks

Acceptance gate:

- a creator can generate a draft and review it before saving
- AI Office の `Finance Agent` から `Draft` step へ advisory payload を渡せる
- the flow does not bypass existing owner or save controls

### Phase 1C: Role-Based AI Office Surface

Goal:

- present AI Office in terms of `Manager / Promotion / Finance / Fan Relation`

User value:

- creators choose help based on intent, not internal task names

Primary deliverables:

- role metadata reflected in UI entry points
- task choices grouped by role with current task types mapped underneath
- updated copy and docs for role-based understanding

Acceptance gate:

- AI Office entry points explain what each role helps with
- current task behavior remains intact under the new grouping

### Phase 1D: Usefulness Metrics

Goal:

- measure whether AI help is actually accepted and acted on

User value:

- indirect but critical: future agent work improves based on evidence

Primary deliverables:

- approval / rejection / follow-through metrics
- simple dashboard or log-side visibility
- docs for what is measured and why

Acceptance gate:

- the team can tell which agent outputs are approved, ignored, or rejected
- metrics do not require schema changes unless separately approved

## Dependencies

- 1A before 1C:
  role-aware UI should be anchored to real outputs
- 1B before x402 planning execution:
  billable draft APIs should reuse the same draft builder
- 1D should start by the end of 1A:
  usefulness data is most valuable from the first real agent task

## Suggested PR Sequence

1. `Manager Agent task contract + executor + renderer`
2. `Manager Agent AI Office entry and history integration`
3. `Distribution plan draft builder + plan editor apply flow`
4. `Role-based AI Office grouping and copy updates`
5. `Usefulness metrics instrumentation and dashboard readout`

## Risks

- role-based UI may hide the underlying task model too much if labels are vague
- draft generation may appear authoritative unless review language stays explicit
- metrics work can sprawl if event names and goals are not fixed early
- manager recommendations can feel noisy unless suggestion quality stays narrow

## Validation Gates

Every Phase 1 task should pass:

- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Manual review expectations:

- AI Office create flow still works
- AI Office inbox and history still render existing task types
- support-page and advanced project workflows remain unchanged unless the task explicitly targets them

## Exit Criteria

Phase 1 is complete when:

- at least one recommendation-style agent output is stored and reviewable
- at least one finance-related draft can be generated and manually applied
- AI Office can be described through roles on the main creator path
- usefulness metrics exist for Phase 2 prioritization
