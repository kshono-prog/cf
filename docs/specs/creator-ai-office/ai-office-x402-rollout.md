# AI Office x402 Rollout

## Purpose

Creator Founding should grow from a creator funding UI into an approval-based operating system for creators. This document fixes the staged path for introducing role-based AI agents and x402-ready machine-billable surfaces without weakening current safety boundaries.

## Current Foundation

Already present in product or code:

- creator profile and public page
- `Project` and `Goal` management
- summary and progress aggregation
- goal achievement confirmation
- bridge and distribution result handling
- wallet connection and support flow
- approval-based AI Office task model

## Staged Rollout

### MVP

Focus on advisory AI inside the existing creator workflow.

- `Manager Agent`
  - read summary and settlement state
  - propose next actions
  - monitor goal progress and achievement readiness
- `Promotion Agent`
  - generate project description support
  - create announcement drafts
  - create supporter-facing messages
- `Finance Agent`
  - draft distribution plan JSON
  - summarize funding inflow and purpose buckets
- keep all output as `proposal -> human review -> optional execution`

### Phase 2

Introduce billable internal capabilities and stricter agent boundaries.

- expose low-risk AI Office capabilities as internal billable APIs
- add x402 candidate surfaces only for analysis and draft generation
- keep bridge, distribution execution, and funds movement outside x402 automation
- track per-surface usage, approval rate, and operator override rate

### Future

Expand toward external agent ecosystems only after internal boundaries are stable.

- external MCP or agent access to paid analysis or drafting APIs
- machine-to-machine usage discovery
- agent marketplace or partner integrations
- multi-agent orchestration with preserved human approval boundaries

## Agent Roles

### Manager Agent

- primary domain: `Project`, `Goal`, `Summary`, `Achieve`
- typical outputs:
  - next action suggestions
  - risk notices
  - milestone or readiness summaries
- execution boundary: advisory only

### Promotion Agent

- primary domain: public page, announcements, supporter messaging
- typical outputs:
  - announcement drafts
  - supporter message drafts
  - project description improvements
- execution boundary: approval required for anything user-facing

### Finance Agent

- primary domain: funding analysis and distribution planning
- typical outputs:
  - distribution plan drafts
  - funding breakdown summaries
  - purpose allocation suggestions
- execution boundary: plan drafting only, never automatic funds movement

### Fan Relation Agent

- primary domain: supporter communication and retention
- typical outputs:
  - thank-you drafts
  - re-engagement message drafts
  - monthly or milestone supporter reports
- execution boundary: approval required

## x402 Candidate Surfaces

Safe near-term candidates:

- creator analysis API
- announcement draft API
- supporter message draft API
- weekly report API
- budget or allocation proposal draft API

Not allowed as x402 automation targets at this stage:

- bridge execution
- distribution execution
- goal achievement confirmation
- wallet signature delegation
- any direct funds movement decision

## Required Boundaries

- high-risk financial actions remain human-approved and locally reviewable
- x402 applies to billable intelligence or drafts, not custody-like behavior
- agent outputs must preserve `basedOn` or equivalent evidence references
- internal role definitions must stay narrower than broad `AI assistant` behavior

## Implementation Checklist

1. Keep role metadata in code, not only in docs.
2. Keep x402 candidate surfaces in a separate registry from settlement operations.
3. Reuse existing `AgentTask` approval model for any new agent output.
4. Add tests that prevent high-risk surfaces from being marked x402-ready.
5. Add usage and approval metrics before externalizing billable APIs.

## Success Metrics

- suggestion acceptance rate
- draft approval rate
- time from goal reached to operator completion
- time from achieved goal to saved plan
- x402 candidate surface usage volume
- operator override and rejection reasons

## Phase 1 usefulness definitions

- `follow-through`
  - approval-required task のうち、owner が承認または却下まで進めた割合
- `ignored`
  - `WAITING_APPROVAL` のまま 72 時間以上残っている task
- `approval rate`
  - approval-required task のうち、承認に進んだ割合
- `rejection rate`
  - approval-required task のうち、却下に進んだ割合

この定義は Phase 2 の x402 surface prioritization より先に固定し、外部化前に「役立つ output か」を判断するために使う。
