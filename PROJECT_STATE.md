# Project State

最終更新: 2026-03-26

## Project Name

Creator Founding

## Current Product Definition

Creator Founding is evolving from a tipping / project support app into a **Creator・Manager・AI Office** based operating system for creative activity.

It is no longer defined as only:

- a tipping page
- a creator profile page
- an AI assistant

It is now defined as:

- a creator operating hub
- a manager support desk
- an AI office layer for planning, summarization, drafting, and coordination
- a trust / activity based foundation for future opportunity and ecosystem expansion

## Motto

**すべての人に開く。信頼を積み上げる。ともに成長する。**

## Documentation Baseline

方向性を共有するため、次の文書を現在の基準とする。

- [Vision](/Users/shounokazuaki/cf/docs/roadmap/vision.md)
- [Project Constitution](/Users/shounokazuaki/cf/docs/project-constitution.md)
- [Roadmap](/Users/shounokazuaki/cf/docs/roadmap/roadmap.md)
- [Execution Plan](/Users/shounokazuaki/cf/docs/roadmap/execution-plan.md)
- [責任境界](/Users/shounokazuaki/cf/docs/creator-manager-ai-office-responsibility-boundaries.md)
- [Creator Home 再設計案](/Users/shounokazuaki/cf/docs/specs/ux/creator-home-redesign.md)
- [Manager Desk 要件定義](/Users/shounokazuaki/cf/docs/specs/manager-desk/requirements.md)
- [Manager Desk データモデル定義](/Users/shounokazuaki/cf/docs/specs/manager-desk/data-models.md)
- [Manager Core Schema Proposal](/Users/shounokazuaki/cf/docs/specs/manager-desk/schema-proposal.md)
- [Meeting / Planner / Follow-up Minimum Contract](/Users/shounokazuaki/cf/docs/specs/operations/meeting-planner-follow-up-minimum.md)
- [Meeting Schema Proposal](/Users/shounokazuaki/cf/docs/specs/operations/meeting-schema-proposal.md)

## Current Reality

### What already exists

The current codebase already has a meaningful operational core for creators:

- creator mypage
- profile editing
- project creation
- goal setting
- summary / progress handling
- goal achievement and distribution-related actions
- public profile page with support flow and progress visualization

The current [`AccountPageClient.tsx`](/Users/shounokazuaki/cf/app/[username]/mypage/AccountPageClient.tsx) is effectively the first version of a creator operations hub, even though it is still UI-heavy on settings and form editing.

The public page ([page.tsx](/Users/shounokazuaki/cf/app/[username]/page.tsx) + [ProfileClient.tsx](/Users/shounokazuaki/cf/components/ProfileClient.tsx)) already works as a support-facing activity page with:

- project progress
- goal display
- contribution flow
- wallet connect
- public creator presentation

This should remain the public-facing activity / support surface rather than becoming the main internal operating surface.

### Current implementation status

The current implementation already includes several building blocks that support this direction:

- aggregated mypage dashboard reads for `me / summary / settlement`
- `AI Office` separated into `概要 / 下書きを作る / 承認待ち`
- creator home routing that prioritizes daily work over advanced surfaces
- `Creator Home` first slice now starts with a `Daily Briefing Hero` and `Project Progress` view ahead of settings-heavy editing
- `Creator Home` also shows `AI Manager` cards and `Today / This Week` derived tasks from existing AI Office and progress signals
- additive phase 1 manager core schema for `ManagerAssignment / ManagerNote / ExternalContact / ActionLog`
- minimal manager-side APIs for assignments, notes, contacts, and action log reads
- manager desk read model and API entrypoints for `dashboard / creator detail`
- manager desk dashboard route now exists at [app/manager-desk/page.tsx](/Users/shounokazuaki/cf/app/manager-desk/page.tsx) with a top-level layout and creator workspace entry link
- creator detail route now exists at [app/manager-desk/creators/[creatorProfileId]/page.tsx](/Users/shounokazuaki/cf/app/manager-desk/creators/[creatorProfileId]/page.tsx) and already shows `project / next actions / notes / contacts / action log`
- additive `Meeting` schema, migration, and minimal Meeting APIs now exist
- `Meeting` migration is now applied in the database environment
- shared planner timeline helper now composes `Meeting / ManagerNote follow-up / ExternalContact next action / Project deadline`
- Creator Home now includes `Upcoming / Planner`
- Manager Desk Creator Detail now includes `Upcoming / Planner`
- next planned slice is structured AI assistance over this new context: `Daily Briefing / note summarization / follow-up extraction`
- public profile progress cards, support hero, and wallet contribution flow
- guided settlement flow with explicit review boundaries
- posting compose, supporter reporting, creator discovery, and notification groundwork from recent Phase 7 delivery

### Current constraints

The current product still has several structural limitations:

- `AccountPageClient` remains too central to creator-side orchestration
- creator operations and settings/editing are not yet cleanly separated
- manager workflows and relationship memory now have dashboard UI ground, but `Contact Pipeline / Notes / Activity Timeline` are still incomplete
- trust / stage / skill concepts are not yet modeled in the product
- MVP and beta boundaries still need stronger product-level articulation

## Core Strategic Shift

### Previous framing

- creator profile + support collection
- project / goal tracking
- AI as optional support

### New framing

- Creator = creative owner and final decision maker
- Manager = human execution / field / external relationship layer
- AI Office = summarization / planning / drafting / operational support layer

The product direction is now:
**“an operating environment where creators do not have to carry creative activity alone.”**

This means the product must support:

- planning
- meetings
- manager notes
- external contact tracking
- follow-up
- activity logs
- opportunity preparation
- trust accumulation
- gradual stage progression

## Current Design Decisions

- Creator Home should be a restructuring of the existing [`AccountPageClient.tsx`](/Users/shounokazuaki/cf/app/[username]/mypage/AccountPageClient.tsx), not a detached parallel product.
- Public profile should remain the support-facing and progress-facing public activity surface.
- `CreatorProfileSection` / `CreatorProfileEditForm` should move toward lower-priority settings/editing areas rather than remaining the dominant creator experience.
- AI proposes. Humans decide.
- High-risk funding, bridge, and distribution execution must stay explicit and reviewable.
- The near-term leverage is structured operational memory, not brittle full autonomy.

## Role Model

### Creator

Responsible for:

- creative output
- expressive direction
- final approval on public / external decisions
- personal brand and value alignment

### Manager

Responsible for:

- fieldwork
- venue scouting
- outreach / sales
- external relationship handling
- negotiation
- operational execution
- real-world coordination
- translating AI suggestions into reality

### AI Office

Responsible for:

- summarization
- task extraction
- agenda generation
- briefings
- draft generation
- structured suggestions
- comparison support
- note organization
- operational memory support

### Key boundary

AI proposes. Humans decide.
Creator owns expression.
Manager owns execution / external handling.
AI Office owns organization / suggestion / support.

## Product Direction

### Creator Home

The creator-facing mypage should be redesigned from a **settings-heavy editor** into a **daily operating home**.

Target top-level structure:

- Daily Briefing / Hero
- Project Progress
- AI Manager suggestions
- Today / This Week tasks
- Manager Feed
- Upcoming / Planner
- Quick Actions
- Growth / Reflection
- Settings / Edit (collapsed / secondary)

This is a restructuring of the current [`AccountPageClient.tsx`](/Users/shounokazuaki/cf/app/[username]/mypage/AccountPageClient.tsx) rather than a completely separate new domain.

### Manager Desk

A new manager-facing operating hub is now part of the core roadmap.

Its job is to let a small number of human managers support multiple creators effectively through:

- creator overview
- manager notes
- external contacts
- meeting support
- follow-up tracking
- AI summaries
- action logs

### Public Profile

The public profile page remains:

- the support-facing page
- the progress-facing page
- the public creator activity surface

It should not become the main internal operations dashboard.

## New Core Data Directions

The following models are now considered core near-term architecture additions:

### ManagerAssignment

Defines which manager supports which creator.

### ManagerNote

Stores field observations, context, relationship notes, risks, venue scouting notes, negotiation notes, and creator condition notes.

### ExternalContact

Stores external relationships such as:

- venue
- organizer
- media
- brand
- company
- collaborator
- sponsor

### ActionLog

Stores structured event history across:

- creator actions
- manager actions
- AI Office actions
- project / goal / contact / task / meeting changes

### Future supporting models

- ActivityTask
- Meeting
- AgentSuggestion
- TrustProfile
- StageProfile
- SkillMap / MaturityMap
- SupporterCRM / OpportunityCRM

## Trust / Stage / Growth Direction

The product is no longer planning to treat creator growth as a single popularity ladder.

Instead, the project direction is to introduce:

- stage-based progression
- multi-axis maturity / skill profiles
- self / external / evidence-based evaluation separation

### Proposed stage direction

- Seed
- Early
- Emerging
- Professionalizing
- Established
- National / Iconic

### Proposed maturity axes

- Craft
- Output
- Audience
- Business
- Operations
- Trust
- Team
- Sustainability

This is intended to support hobby creators, serious creators, and professional-track creators differently without flattening them into one ranking system.

## Why this matters now

AI capabilities are improving rapidly.
Because of that, the project should not over-invest in brittle autonomous workflows too early.

Instead, the current strategy is:

1. fix the vision and role boundaries
2. build human-usable operating systems first
3. collect structured activity / relationship / trust context
4. layer AI into summarization, drafting, briefing, and prioritization
5. let future AI improvements amplify the system later

This means the current high-leverage priorities are not “full autonomy,” but:

- operational structure
- activity memory
- manager workflows
- contact / follow-up management
- trust / stage groundwork

## Recommended Next Execution Order

短期・中期・長期の整理は次を参照する。

- [Execution Plan](/Users/shounokazuaki/cf/docs/roadmap/execution-plan.md)

1. turn Creator Home / Manager Desk / core model docs into implementation-sized issue slices
2. approve and implement `Meeting` schema and shared timeline helper
3. implement `Upcoming / Planner` in Creator Home and Manager Desk
4. layer AI Daily Briefing and note summarization on structured context
5. extend lightweight CRM behavior and Manager Desk follow-up slices

## Near-term Priorities

### Priority A

- prepare the inputs needed for AI Daily Briefing / note summarization over new structured context
- start `AI operational assistance on structured context`
- preserve approval boundaries for schema and high-risk flow changes

### Priority B

- extend Creator Home with `Manager Feed / Growth-Reflection`
- add shared action timeline / follow-up handling
- add AI Daily Briefing and note summarization over structured data
- add lightweight CRM behavior over `ExternalContact`
- expand Manager Desk with `Contact Pipeline / Notes / Activity Timeline`
- convert meeting decisions into structured follow-up tasks

### Priority C

- add Trust / Stage / Skill system
- add Supporter CRM / Opportunity CRM
- add finance / expense / split groundwork
- add ecosystem roles later

## Non-negotiable Direction

The product must remain:

- open at the entrance
- trust-building over time
- supportive of hobby creators
- demanding enough for serious professional paths
- respectful of managers and collaborators
- resistant to AI overreach
- structured so activity becomes long-term asset

## Summary

Creator Founding is no longer only a support app.
It is becoming a **creator operating system with human manager support and AI office augmentation**.

The current code already contains the first creator operations core.
The next major architectural step is to:

- separate creator-facing operations from settings-heavy editing
- introduce a real manager operating surface
- add structured relationship and activity memory
- prepare the system so future AI improvements compound rather than require rework

## Approval Boundaries

AIが自動で進めてよい:

- 既存仕様内の実装
- リファクタ
- lint / type 修正
- docs 更新
- 非破壊な UI 改善

要承認:

- Prisma schema 変更
- migration 追加
- 新規 env var 追加
- 外部 API 追加
- 送金 / ブリッジ / 配分処理の仕様変更
- 依存ライブラリ追加

人が必ず担当する:

- 本番デプロイ
- 本番 env / 秘密鍵更新
- 資金移動判断
- 外部公開物の最終承認

## Validation Policy

最低限必須:

- `npm run lint`
- `npm run typecheck`

重要変更時:

- `npm run build`
- 変更対象画面の手動確認
- 変更対象 API の正常系 / 異常系確認
