# Architecture

## Architecture Overview

### System Vision

Creator Founding is architecturally shifting from a creator support application into a **multi-actor operating platform** centered on three primary roles:

- **Creator**
- **Manager**
- **AI Office**

This architectural shift affects:

- domain modeling
- UI structure
- data models
- responsibility boundaries
- future AI integration strategy

## 1. Architectural Principle

### 1.1 Human-centered operational core

The architecture should support a world where:

- creators own expression and final creative decisions
- managers own execution, external coordination, and field-sensitive decisions
- AI Office supports organization, summarization, drafting, planning, and prioritization

This means architecture should **not** assume:

- full AI autonomy
- creator-only self-management
- public profile pages as the main operating surface

### 1.2 Build the human operating system first

The key architectural decision is:
**build the human operating system first, then let AI improvements compound on top of it.**

This means near-term architecture should optimize for:

- human-usable workflows
- structured operational memory
- structured relationship memory
- reviewable action history
- AI augmentation rather than AI replacement

## 2. Surface Areas

### 2.1 Creator Surface

Primary internal creator-facing operating area.

Current implementation basis:

- [`app/[username]/mypage/page.tsx`](/Users/shounokazuaki/cf/app/[username]/mypage/page.tsx)
- [`app/[username]/mypage/AccountPageClient.tsx`](/Users/shounokazuaki/cf/app/[username]/mypage/AccountPageClient.tsx)
- [`components/mypage/CreatorReadyHomeRoute.tsx`](/Users/shounokazuaki/cf/components/mypage/CreatorReadyHomeRoute.tsx)
- [`components/mypage/CreatorProfileSection.tsx`](/Users/shounokazuaki/cf/components/mypage/CreatorProfileSection.tsx)
- [`components/mypage/CreatorProfileEditForm.tsx`](/Users/shounokazuaki/cf/components/mypage/CreatorProfileEditForm.tsx)

Current state:

- profile editing
- project creation
- goal save
- summary / actions
- gas support
- creator application / user application flows
- setup progress and next-best-action guidance toward public launch
- AI profile draft generation before manual save
- AI share draft generation after public page setup

Planned direction:

- convert from a settings-heavy management screen into **Creator Home**
- make it a state-first, action-first, AI-assisted operating surface
- keep editing secondary / collapsible
- preserve existing project, goal, summary, and settlement functionality while changing information priority
- make onboarding and public launch completion visible as a first-class flow

Runtime notes:

- prefer a single `mypage/dashboard` read endpoint for `me`, per-currency summary, and settlement data
- let `AccountPageClient` hydrate child panels from dashboard data before issuing route-specific refreshes
- keep write-side actions separate from aggregated read-side composition
- route client-side write operations through shared `lib/mypage/api.ts` functions
- keep summary/distribution write orchestration in dedicated hooks rather than inline in `AccountPageClient`
- render `loading / unconnected / noUser / userOnly / creatorReady` as separate containers instead of inline status branches
- keep `creatorReady` home logic and dashboard parsing in dedicated helpers
- use `CreatorProfileSection` / `CreatorProfileEditForm` as movable settings modules, not as the dominant surface

### 2.2 Public Surface

Public creator-facing activity / support page.

Current implementation basis:

- [`app/[username]/page.tsx`](/Users/shounokazuaki/cf/app/[username]/page.tsx)
- [`components/ProfileClient.tsx`](/Users/shounokazuaki/cf/components/ProfileClient.tsx)
- [`app/[username]/ProfileClientSection.tsx`](/Users/shounokazuaki/cf/app/[username]/ProfileClientSection.tsx)

Current responsibilities:

- creator presentation
- support flow
- project progress display
- goal display
- wallet / contribution flow
- public activity presentation

Planned direction:

- remain the public support surface
- not become the main internal operations console
- later receive curated public activity signals without absorbing manager/internal workflows
- keep progress, trust, and support cues legible to supporters
- show lightweight owner-only CTA for page review and share generation without changing supporter-facing contribution meaning

### 2.3 Manager Surface

New internal operating area to be added.

Detailed requirements:

- [`docs/specs/manager-desk/requirements.md`](/Users/shounokazuaki/cf/docs/specs/manager-desk/requirements.md)

Planned role:

- multi-creator support hub
- note / contact / meeting / follow-up control center
- AI-assisted manager workflow surface

Main goals:

- reduce manager memory burden
- centralize field observations and contact states
- make AI output operationally actionable
- support a small number of managers handling multiple creators

This is a new domain surface and should not simply be a clone of creator mypage.

### 2.4 Funding and Settlement Surface

High-risk operational layer that remains explicit and reviewable.

Responsibilities:

- contribution recording
- contribution-to-post linkage for post-level tipping
- goal and settlement state
- distribution planning and execution records
- bridge visibility and audit trail

Architectural rule:

- bridge / distribution execution must remain separate from speculative AI autonomy
- custody-like or funds-movement operations must stay explicit, reviewable, and auditable

### 2.5 Development Control Surface

Operational scaffolding for building the product safely.

Responsibilities:

- docs as source of context
- task and decision logs
- GitHub issue and PR standardization
- CI and Codex automation

## 3. Responsibility Boundaries

Detailed operating document:

- [`docs/creator-manager-ai-office-responsibility-boundaries.md`](/Users/shounokazuaki/cf/docs/creator-manager-ai-office-responsibility-boundaries.md)

### 3.1 Creator

Owns:

- creative direction
- expressive decisions
- major public-facing final approvals
- acceptance / rejection of major opportunities
- personal brand / identity decisions

Must not be silently overridden by manager or AI.

### 3.2 Manager

Owns:

- external coordination
- venue scouting
- outreach / sales / negotiation
- on-site execution
- relationship handling
- turning plans into real-world action
- operational prioritization in reality-constrained situations

Must not override creator expression or major personal direction.

### 3.3 AI Office

Owns:

- summarization
- briefings
- drafting
- task extraction
- comparison support
- agenda generation
- timeline condensation
- missing-items detection
- structured memory support

Must not:

- auto-send externally
- auto-approve public commitments
- auto-finalize contracts / payouts / submissions
- replace field judgment with false certainty

## 4. Current Architecture Strengths

### 4.1 Creator mypage already acts as a proto-operations hub

[`AccountPageClient.tsx`](/Users/shounokazuaki/cf/app/[username]/mypage/AccountPageClient.tsx) already centralizes:

- creator registration flow
- creator profile management
- project creation
- goal save
- project summary
- bridge / distribution related actions

This means the project already has an initial internal operating layer, even if the UX is still form-heavy.

### 4.2 Public profile is already separated from creator mypage

The architecture already separates:

- internal creator surface
- public support surface

This separation should be preserved.

### 4.3 Creator editing is modular enough for restructuring

[`CreatorProfileSection.tsx`](/Users/shounokazuaki/cf/components/mypage/CreatorProfileSection.tsx) and [`CreatorProfileEditForm.tsx`](/Users/shounokazuaki/cf/components/mypage/CreatorProfileEditForm.tsx) support embedding extra sections and can be moved into a lower-priority settings area under Creator Home rather than remaining the dominant experience.

## 5. New Domain Entities

### 5.1 ManagerAssignment

Defines creator-manager support relationships.

Purpose:

- clarify support responsibility
- enable manager dashboards
- route AI operational suggestions meaningfully

Core fields:

- id
- creatorProfileId
- managerUserId
- roleType
- assignedAt
- status

### 5.2 ManagerNote

Stores real-world contextual notes gathered by managers.

Purpose:

- preserve field intelligence
- capture non-structured but strategically critical context
- enrich AI support with real-world nuance

Types include:

- venue scout
- sales meeting
- negotiation
- creator condition
- event operations
- risk
- follow-up

Key requirements:

- author traceability
- visibility boundary
- optional project/contact relation
- AI summary support
- follow-up indicators

### 5.3 ExternalContact

Stores external counterparties and relationship states.

Targets include:

- venues
- organizers
- media
- brands
- companies
- collaborators
- sponsors

Key requirements:

- stateful relationship tracking
- contact freshness
- temperature / relationship quality signal
- next action support
- creator / project linkage

### 5.4 ActionLog

Stores structured event history.

Purpose:

- auditability
- explainability
- trust accumulation
- timeline reconstruction
- AI memory substrate

Actors:

- CREATOR
- MANAGER
- AI_OFFICE
- SYSTEM

Should remain as append-oriented event history rather than mutable state.

Detailed schema draft:

- [`docs/specs/manager-desk/data-models.md`](/Users/shounokazuaki/cf/docs/specs/manager-desk/data-models.md)
- [`docs/specs/manager-desk/schema-proposal.md`](/Users/shounokazuaki/cf/docs/specs/manager-desk/schema-proposal.md)
- [`docs/specs/operations/meeting-planner-follow-up-minimum.md`](/Users/shounokazuaki/cf/docs/specs/operations/meeting-planner-follow-up-minimum.md)

### 5.5 Meeting / Planner / Follow-up

`Meeting` は future calendar integration の前に、
まず Creator と Manager の意思決定単位として扱う。

`Planner` は phase 1 では write-heavy scheduler ではなく、
`Meeting / ManagerNote follow-up / ExternalContact next action / Project deadline`
を合成する shared timeline read model として始める。

Current implementation status:

- additive `Meeting` schema and migration are in code
- `Meeting` minimal APIs are available for create / list / read / update
- Creator Home and Manager Desk Creator Detail now render `Upcoming / Planner` from the shared timeline helper

詳細 contract:

- [`docs/specs/operations/meeting-planner-follow-up-minimum.md`](/Users/shounokazuaki/cf/docs/specs/operations/meeting-planner-follow-up-minimum.md)

### 5.6 GrowthEvent

Stores additive, low-risk growth telemetry for onboarding and public launch.

Purpose:

- measure onboarding conversion
- measure public launch completion
- measure share draft usage
- measure share execution logging
- support future funnel reporting without touching financial semantics

Current fields:

- id
- event
- username
- walletAddress
- projectId
- metadata
- createdAt

Indexes:

- `(event, createdAt)`
- `(username, createdAt)`
- `(walletAddress, createdAt)`
- `(projectId, createdAt)`

## 6. Planned Information Architecture Changes

### 6.1 Creator Home target structure

Detailed requirements:

- [`docs/specs/ux/creator-home-redesign.md`](/Users/shounokazuaki/cf/docs/specs/ux/creator-home-redesign.md)

Replace current settings-dominant layout with:

- Daily Briefing / Hero
- Project Progress
- AI Manager suggestions
- Today / This Week tasks
- Manager feed
- Upcoming / Planner
- Quick Actions
- Growth / Reflection
- Settings / Edit (collapsed)

This keeps existing functionality but changes priority order.

Near-term growth-first additions:

- setup completion card
- next-best-action card
- growth coach card
- AI profile draft entry point
- AI share draft entry point
- strong public page open CTA
- advanced management panels collapsed by default

### 6.2 Manager Desk target structure

Initial target screens:

- Dashboard
- Creator detail
- Contact pipeline
- Notes / activity timeline

This should not be over-built into a full enterprise CRM initially.
The architectural goal is **lightweight operational leverage**, not maximal complexity.

## 7. AI Integration Strategy

### 7.1 Current recommendation

Use AI for:

- note summarization
- daily briefings
- meeting prep
- task extraction
- candidate comparison
- draft creation
- activity reflection

### 7.2 Avoid early lock-in

Do not overcommit the architecture to:

- one provider
- one agent framework
- one model-specific behavior assumption
- full autonomy patterns

The data layer should become more valuable as AI improves.

### 7.3 Current AgentTask flow

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

### 7.4 API boundary notes

- keep task creation and approval as dedicated endpoints
- keep read-side data composition in service modules
- keep dashboard response parsing and runtime validation in dedicated helpers instead of inside `AiOfficePanel`
- stage role-based agents behind the existing approval model before introducing external or billable execution paths
- treat x402 as a future boundary for low-risk intelligence APIs, not for bridge or distribution execution
- apply CORS allowlists only to explicitly externalizable low-risk read or draft APIs, not to settlement or broad internal surfaces
- prefer `GET,OPTIONS` for cross-origin read-only surfaces, and keep mixed read/write routes read-only from the CORS boundary unless they are split
- keep `public viewer identity` same-origin only until privacy expectations and downstream cache consumers are explicitly designed for cross-origin use

### 7.5 AI draft layer

The growth phase adds a narrow AI draft layer focused on proposal generation rather than execution.

Responsibilities:

- generate profile drafts from natural language
- suggest conservative goal / project starting points
- generate share-ready draft copy with the public page URL
- validate unknown AI responses with runtime guards before use

Rules:

- AI is propose-first
- no `any`; validate unknown inputs and outputs
- AI draft failures must not block core creator UI
- financial actions stay outside this layer

### 7.6 Growth tracking layer

The growth tracking layer is intentionally lightweight and non-blocking.

Responsibilities:

- collect onboarding funnel events
- record owner public-page review milestones
- record share draft generation and copy activity
- record manual share execution logs after creators actually post
- keep growth event writes additive and independent from contribution / goal / summary writes

Rules:

- growth event failures must not block core UI
- invalid event names are rejected server-side
- metadata is sanitized before persistence

### 7.7 Growth and AI draft APIs

Additive APIs introduced for the growth phase:

- `POST /api/growth/events`
- `POST /api/ai/profile-draft`
- `POST /api/ai/share-drafts`
- `GET /api/mypage/growth-overview`

Boundary notes:

- these APIs should not change the meaning of existing financial / contribution / goal / summary routes
- draft APIs may help creators prepare content, but final save still flows through existing write APIs
- the growth events API is owner-auth-free telemetry and should return a stable `{ ok: true } | { ok: false; error: string }` shape
- growth overview is an owner-auth read model over additive telemetry and confirmed contribution facts
- `first_tip_received` should be emitted from the confirmed contribution path on the server, not from client UI intent
- manual share logging stays on the same additive telemetry rail and does not mutate posting or contribution data

## 8. Trust / Stage / Skill Architecture Direction

Future architecture should support:

- stage-based growth representation
- multi-axis maturity maps
- self / external / evidence separation
- missing-items detection
- relationship capital tracking
- operational maturity tracking

These should be modeled as profiles and evidence layers, not just one score.

Potential future entities:

- TrustProfile
- StageProfile
- SkillAxisAssessment
- AudienceDepthSnapshot
- MissingItem
- EvaluationInput

## 9. Business / CRM / Ecosystem Expansion Direction

The architecture should remain open to later addition of:

- Supporter CRM
- Opportunity CRM
- finance / split / expense layers
- collaborator profiles
- venue profiles
- media / curator roles
- discovery / recommendation layers

But these are later layers.
The first priority is to make creator-manager-AI operational support real.

## 10. Current Technical Boundaries

- `app/`: routes and API handlers
- `components/`: UI and route-level client composition
- `lib/`: shared domain logic, integrations, task execution, Prisma access
- `prisma/`: schema and seed data
- `docs/`: vision, specs, runbooks, decisions, tasks

## 11. Immediate Architecture Priorities

### Priority 1

Formalize domain boundaries:

- Creator
- Manager
- AI Office

### Priority 2

Add core manager support entities:

- ManagerAssignment
- ManagerNote
- ExternalContact
- ActionLog

### Priority 3

Restructure creator mypage into Creator Home.

### Priority 4

Add a growth-first onboarding layer to creator mypage without breaking the financial core.

### Priority 5

Design Manager Desk as a first-class surface.

### Priority 6

Add lightweight AI operational assistance over structured data and propose-first setup flows.

## 12. Architecture Constraints

- runtime behavior must be safe on Vercel + Supabase
- high-risk funding and bridge logic must remain explicit
- DB-affecting changes must explain migration impact
- AI-generated changes must stay within narrow scopes
- machine-billable surfaces must stay separate from custody-like or funds-movement operations
- growth tracking failures must not block core UI
- financial actions must remain separate from growth actions
- `unknown` + runtime guards are preferred over `any`
