# AI Office x402 Rollout

## Purpose

Creator Founding should grow from a creator funding UI into a reviewable operating system for creators. This document fixes the staged path for introducing role-based AI agents and x402-ready machine-billable surfaces without weakening current safety boundaries.

## Current Foundation

Already present in product or code:

- creator profile and public page
- `Project` and `Goal` management
- summary and progress aggregation
- goal achievement confirmation
- bridge and distribution result handling
- wallet connection and support flow
- reviewable AI Office task model

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
- keep all output as `proposal -> optional review -> optional execution`

### Phase 2

Introduce billable internal capabilities and stricter agent boundaries.

- expose low-risk AI Office capabilities as internal billable APIs
- add x402 candidate surfaces only for analysis and draft generation
- start from a `JPYC` budget-wallet model for creator-funded AI usage
- expose owner-facing funding instructions for `AI budget wallet` top-up and `Platform Operations Wallet` settlement readiness before enabling real wallet automation
- require settlement payees to pass a verified payee registry check before `x402` becomes active
- add owner-reported top-up evidence and ledger match records before enabling x402 settlement execution
- when x402 is ready, mark usage as `PAYMENT_PENDING` until owner confirms the settlement `txHash`
- add a server-only external connector ingestion route so confirmed or failed settlement results can reuse the same state machine as owner review
- treat matching duplicate connector callbacks as idempotent replays and log structured settlement events for observability
- expose pending x402 delivery health in owner-facing reconciliation so connector follow-up timing is visible
- derive an owner follow-up queue from stale pending x402, failed settlement, and unmatched top-up evidence so the next manual action is explicit
- persist payment attempt delivery events from `billing system / owner review / x402 connector` so recent settlement state changes are reviewable in owner-facing UI
- enrich pending x402 queue with the last delivery event so owner can distinguish simple callback wait from already-observed connector activity
- include the latest pending x402 event in reconciliation summary so Home / Settings / AI Office surfaces can stay event-aware at a glance
- use the latest pending x402 event as part of delivery-health derivation so older attempts with fresh connector activity do not immediately read as stale
- accept server-only connector polling check-ins for still-pending settlements and store them as additive `PENDING_OBSERVED` delivery events
- suppress short duplicate polling check-ins so pending delivery freshness improves without noisy repeated event rows
- use the latest pending event source in owner follow-up so the UI can suggest whether to inspect `x402 connector`, `owner review`, or `funding evidence`
- use the latest failed event source in owner follow-up so connector-side failures and owner-side failures can suggest different recovery paths
- derive a compact replay / recovery summary from payment attempt events so recent duplicate replay acceptance and failed-to-confirm recovery are visible without opening the raw delivery timeline
- include recent recovery context in reconciliation summary surfaces so unresolved risk and recent recovery can be read together in Home / Settings / AI Office
- break recent recovery down by source (`x402 connector / owner review / billing system`) so the owner can compare where recovery is actually being resolved
- if owner marks x402 settlement as failed, pause billable capability until the issue is reviewed
- if budget balance is empty, keep the agent within a free service range
- initial free service range is `internal briefing + lightweight draft support`
- settle billable usage to a dedicated `Platform Operations Wallet`
- split `provider API cost` and `platform maintenance fee` in usage records
- allow auto-pay only within owner-approved caps and allowed capability lists
- initial caps are `100 / 300 / 3000 JPYC` for `perAction / daily / monthly`
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
- web research API

Initial billable capability scope for AI Manager:

- `POST_DRAFTING`
- `FAN_REPLY_ASSIST`
- `PROGRESS_SUMMARY`
- `WEB_RESEARCH`

Phase 1 web collection boundary:

- manual trigger only

Not allowed as x402 automation targets at this stage:

- bridge execution
- distribution execution
- goal achievement confirmation
- wallet signature delegation
- any direct funds movement decision
- arbitrary wallet transfer to non-platform payees

## Required Boundaries

- high-risk financial actions remain human-approved and locally reviewable
- x402 applies to billable intelligence or drafts, not custody-like behavior
- payee must be a verified platform destination, not user-supplied free-form wallets
- billable usage must support `providerCostUsd / platformFeeUsd / totalChargeUsd`
- creator-funded usage should start from a segregated AI budget wallet, not support funds
- agent outputs must preserve `basedOn` or equivalent evidence references
- internal role definitions must stay narrower than broad `AI assistant` behavior

## Implementation Checklist

1. Keep role metadata in code, not only in docs.
2. Keep x402 candidate surfaces in a separate registry from settlement operations.
3. Reuse existing `AgentTask` approval model for any new agent output.
4. Add a verified `Platform Operations Wallet` or x402 payee registry.
5. Add caps and allowed-capability policy before enabling auto-pay.
6. Add tests that prevent high-risk surfaces from being marked x402-ready.
7. Add usage and approval metrics before externalizing billable APIs.

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
