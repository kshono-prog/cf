# Architecture

## Goal

Creator Founding is structured as a creator support platform with an AI Office layer on top of funding and operations data.

## Main Layers

### Public Product Layer

- creator public page
- project summary and progress
- funding-centric SNS data/API foundation for creator posts, replies, likes, and post-linked tips
- creator follow/follower relation and public community read/write UI layered on top of creator identity
- events and public creator discovery

### Creator Operation Layer

- mypage management
- project and settlement management
- AI Office task creation and review
- AI agent and promotion-job storage foundation for later approved automation
- metrics collection and display

AI Office runtime note:

- prefer aggregated dashboard reads over many small client-side API calls
- keep task creation and approval as dedicated endpoints
- keep read-side data composition in service modules

Creator mypage runtime note:

- prefer a single `mypage/dashboard` read endpoint for `me`, per-currency summary, and settlement data
- let `AccountPageClient` hydrate child panels from dashboard data before issuing route-specific refreshes
- keep write-side actions separate from aggregated read-side composition
- route client-side write operations through shared `lib/mypage/api.ts` functions
- keep summary/distribution write orchestration in a dedicated hook rather than inline in `AccountPageClient`
- keep profile form state in a dedicated hook and shell UI state in a separate shell hook
- normalize primary mypage mutation responses to `ok + me` so the client can treat save/apply/update uniformly
- render `loading / unconnected / noUser / userOnly / creatorReady` as separate containers instead of inline status branches
- keep `creatorReady` workspace navigation explicit about `MVP` vs `beta` surfaces so experimental features do not blur into the main path
- lazy-load `creatorReady` route views so opening one workspace does not eagerly ship all other route panels
- within `creatorReady`, keep `links`, `project management`, and `summary actions` as separate section containers
- add `SNS・AI事務所` to the creator `support-page` as a localized accordion backed by dedicated mypage SNS routes so profile/project/settlement flows stay unchanged
- within project management, keep `per-currency project blocks` and `AI Office` as separate composition units
- move `ProjectSection` create/edit/fetch into a dedicated hook backed by shared project API helpers
- move `CurrencyGoalSettlementPanel` summary fetch and goal mutations into a dedicated hook backed by shared mypage API helpers
- move `ProjectSettlementPanel` bridge/distribution state and mutations into a dedicated hook backed by shared mypage API helpers
- render `ProjectSettlementPanel` execution logs and CCTP jobs as dedicated section containers instead of inline blocks
- render `ProjectSettlementPanel` bridge forms and distribution draft editor as dedicated section containers instead of inline blocks
- render `ProjectSettlementPanel` distribution execution controls and manual result controls as dedicated section containers instead of inline blocks
- aggregate `ProjectSettlementPanel` section props through a dedicated presenter hook so the panel stays focused on composition
- split `ProjectSettlementPanel` presenter hooks into `bridge`, `distribution`, and `execution` units so grouped props do not re-accumulate in one file
- split `useProjectSettlementPanel` state and actions into dedicated `bridge`, `distribution`, and `execution` hooks, and keep the root hook focused on fetch/recompute orchestration

### Funding and Settlement Layer

- contribution recording
- contribution-to-post linkage for post-level tipping
- goal and settlement state
- distribution planning and execution records
- bridge visibility and audit trail

### Development Control Layer

- docs as source of context
- task and decision logs
- GitHub issue and PR standardization
- CI and Codex automation

## Current Technical Boundaries

- `app/`: routes and API handlers
- `components/`: UI and route-level client composition
- `lib/`: shared domain logic, integrations, task execution, Prisma access
- `prisma/`: schema and seed data
- `docs/`: vision, specs, runbooks, decisions, tasks

## AI Office Architecture

Current flow:

1. UI creates `AgentTask`
2. API validates task input
3. executor builds task output
4. task is stored as `WAITING_APPROVAL` or `DONE`
5. owner approves or rejects
6. audit log records state changes

Supporting parts:

- input parser and normalization
- task definition registry
- output renderer registry
- shared create-side task config for action cards, tier labeling, defaults, and task input building
- dashboard aggregation service for read-side composition
- metrics and contribution data as optional context

## Architecture Constraints

- runtime behavior must be safe on Vercel + Supabase
- high-risk funding and bridge logic must remain explicit
- DB-affecting changes must explain migration impact
- AI-generated changes must stay within narrow scopes
