# Project State

最終更新: 2026-03-29（AI Manager x402 connector polling check-in を event ledger に追加）

## Project Name

Creator Founding

## Current Product Definition

Creator Founding is evolving from a tipping / project support app into a **Creator・Manager・AI Office** based operating system for creative activity.

Current near-term product focus is also shifting from “add more internal functions” toward
“increase registration, public page completion, and first support conversion.”

It is no longer defined as only:

- a tipping page
- a creator profile page
- an AI assistant

It is now defined as:

- a creator operating hub
- a manager support desk
- an AI office layer for planning, summarization, drafting, and coordination
- a growth onboarding layer that gets creators from wallet connect to public launch faster
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
- [AI Manager Account 構想書](/Users/shounokazuaki/cf/docs/specs/creator-ai-office/ai-manager-account.md)
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
- `AI Manager Account` additive foundation now exists with schema / migration / owner-auth API / settings UI / Creator Home summary / AI Office Overview boundary summary
- `AI Manager` usage ledger / payment attempt ledger / pause-on-failure groundwork now exists for AgentTask creation, with free-tier waiver vs billable deduction boundary
- `AI Manager` budget transaction ledger and owner-operated budget top-up / deduction UI now exist, and usage settlement now writes debit entries into the same budget audit trail
- `AI Manager` public badged surface now exists on the public profile page, with explicit AI disclosure and a safe public-only persona projection
- `Manager Desk` Creator Detail now includes an `AI Manager` read-only section with safe visibility / operating-mode summary and owner / manager / AI responsibility boundary copy
- `AI Manager` settings now expose real wallet top-up target, Platform Operations Wallet payee, Polygon / JPYC settlement boundary, and x402 readiness without changing fund movement behavior
- `AI Manager` now records owner-reported real wallet top-up evidence and can match that evidence to owner-operated internal ledger credits without changing onchain fund movement behavior
- `AI Manager` billable usage now chooses `x402` when ready, records pending x402 settlement separately from internal ledger consumption, and lets owner confirm or fail the settlement without adding automatic fund movement
- `AI Manager` account payload now includes reconciliation summary (`pending x402 / failed x402 / unmatched top-up evidence / latest confirmed`) and surfaces it in Settings, Creator Home, and AI Office Overview
- `AI Manager` funding instructions now include verified payee registry metadata (`payee id / label / verification status`), and x402 readiness is evaluated against that verified payee boundary before the rail turns active
- `AI Manager` now has a server-only external x402 connector ingestion route that can confirm or fail pending settlement attempts through the same shared state machine used by owner manual confirmation
- `AI Manager` is now explicitly positioned as a creator-scoped public operator rather than a general user account, and can be shown at `/<creator>/manager/<slug>` as a dedicated public showcase page
- `AI Manager` public showcase now includes creator activity proof, current support project progress, and direct support CTA so visitors can see that the manager is actively supporting real creator work
- `AI Manager` public showcase now also includes a public-safe recent support activity summary so visitors can quickly understand what kinds of creator support the manager has been handling recently
- `AI Manager` x402 connector ingestion now treats matching duplicate confirmations/failures as idempotent replays and emits structured server logs for settlement observability
- `AI Manager` reconciliation summary now includes pending x402 delivery health (`callback待ち / やや滞留 / 長時間滞留`) so owner can see when connector follow-up is needed
- `AI Manager` Settings and AI Office now show a small pending x402 queue so owner can identify which recent billable tasks are still waiting on settlement callbacks
- `AI Manager` Settings and AI Office now also show recent x402 activity so owner can review recent pending / confirmed / failed settlement events without opening raw ledgers
- `AI Manager` Settings / Creator Home / AI Office now also derive an owner follow-up queue so stale pending x402, failed settlement, and unmatched top-up evidence become explicit next actions instead of passive ledger rows
- `AI Manager` now records additive payment attempt events (`billing system / owner review / x402 connector`) so recent delivery events are visible in Settings and AI Office without depending only on heuristic pending age
- `AI Manager` pending x402 queue now also shows the last recorded delivery event (`source / label / time`), so owner can tell whether a settlement is merely waiting or has already seen connector-side activity
- `AI Manager` reconciliation summary now also carries the latest pending x402 event metadata, so Creator Home / Settings / AI Office can show event-aware summary cards without opening the full queue
- `AI Manager` delivery-status heuristic itself now considers the latest pending x402 event, so recent connector-side activity can keep an older pending settlement in `ACTIVE / WATCH` instead of immediately reading as stale only by attempt age
- `AI Manager` owner follow-up now also reflects the latest event source, so Home / Settings / AI Office can point owner toward `x402 connector / owner review / funding evidence` instead of showing only a generic stale warning
- `AI Manager` failed x402 follow-up now also reflects the latest event source, so connector-side failure and owner-side failure no longer collapse into the same generic recovery instruction
- `AI Manager` now also derives a small replay / recovery summary from payment attempt events, so owner can quickly see duplicate replay acceptance and failed-to-confirm recovery without opening the raw delivery event list
- `AI Manager` reconciliation summary surface now also carries recent recovery context in Home / Settings / AI Office, so owner can judge unresolved risk and recent recovery in one place
- `AI Manager` recovery summary now also shows a small source breakdown (`x402 connector / owner review`), so owner can see where recovery is actually happening without opening detailed timelines
- `AI Manager` now also accepts server-only x402 connector polling check-ins for still-pending settlement attempts, records them as additive `PENDING_OBSERVED` events, and suppresses short duplicate polls so pending delivery freshness can improve without noisy ledgers
- additive phase 1 manager core schema for `ManagerAssignment / ManagerNote / ExternalContact / ActionLog`
- minimal manager-side APIs for assignments, notes, contacts, and action log reads
- manager desk read model and API entrypoints for `dashboard / creator detail`
- manager desk dashboard route now exists at [app/manager-desk/page.tsx](/Users/shounokazuaki/cf/app/manager-desk/page.tsx) with a top-level layout and creator workspace entry link
- creator detail route now exists at [app/manager-desk/creators/[creatorProfileId]/page.tsx](/Users/shounokazuaki/cf/app/manager-desk/creators/[creatorProfileId]/page.tsx) and already shows `project / next actions / notes / contacts / action log`
- additive `Meeting` schema, migration, and minimal Meeting APIs now exist
- `Meeting` migration is now applied in the database environment
- shared planner timeline helper now composes `Meeting / ManagerNote follow-up / ExternalContact next action / Project deadline`
- Creator Home now includes `Upcoming / Planner`
- Creator Home now includes `Manager Feed` from `SHAREABLE_WITH_CREATOR` manager notes
- Creator Home hero and AI Manager now read a structured `Daily Briefing` contract from planner / project / note / contact signals
- manager note create / update now auto-enriches `aiSummary / aiTags / followUpNeeded / followUpDueAt / urgencyScore` from note, contact, and meeting context
- Manager Desk dashboard and creator detail now show `AI Office` attention cards with short summaries, reasons, and local adopt / defer / dismiss decisions
- Manager Desk Creator Detail now includes `Upcoming / Planner`
- Manager Desk now includes `Contact Pipeline` with creator / status / overdue filters over assigned contacts
- Manager Desk now includes `Notes Surface` with creator / noteType / visibility / follow-up / q filters over assigned notes
- Manager Desk now includes `Activity Timeline` that merges `ActionLog / Meeting / shareable note updates`
- public profile progress cards, support hero, and wallet contribution flow
- guided settlement flow with explicit review boundaries
- posting compose, supporter reporting, creator discovery, and notification groundwork from recent Phase 7 delivery
- Phase 8: Creator Stage derivation + maturity axes in Manager Desk Creator Detail
- Phase 8: MEETING_AGENDA_DRAFT / CONTACT_OUTREACH_DRAFT AgentTask 追加（MANAGER Agent）
- Phase 8: Supporter Fan Relations Overview（累計/今月/直近30日 + top supporters + FAN_RELATION CTA）
- Phase 8: Opportunity CRM（/manager-desk/opportunities — IN_DISCUSSION/NEGOTIATING/WON/ONGOING をステージ別表示 + 連絡文 CTA）
- Phase 8: Meeting planner から AI Office MEETING_AGENDA_DRAFT へのショートカットリンク
- Phase 8: AI Office 承認実績サマリー（承認数/却下数/承認率/判断中央値を Overview に追加）
- Phase 8: Wave 1 rename（外部SNS連携 → CF 内投稿向けコピーに修正）
- Phase 14-A: Opportunity CRM カードからインラインノート作成（`/api/manager-notes` POST）
- Phase 14-B: Contact Pipeline 一括ステータス更新（PATCH + `Promise.allSettled`）
- Phase 14-C/D: PublicProfile ActivityHeatmap / NextGoalReveal / SupporterWall（実装済み確認）
- Phase 15-A: `Contribution.message` スキーマ・API・UI・MicroTestimonials（公開プロフィール）
- Phase 15-B: `Expense` モデル + `ExternalContact.contractStatus` スキーマ・API・Manager Desk 費用サマリー
- Phase 16-A: `AgentTask.rejectReason` スキーマ・executor・シリアライズ・Overview RejectionPatternCard・Inbox 却下理由表示
- Phase 16-B: Meeting Copilot phase 1（upcomingMeetings readModel + Manager Desk インライン議事メモ）
- Phase 17-A: Contact Pipeline 契約ステータス表示（SerializedExternalContact に contractStatus/contractStartAt）
- Phase 17-B: Creator Home Expense 入力フォーム（useCreatorReadyExpenses + CreatorReadyExpenseInputSection）
- Phase 17-C: AI Office Overview 履歴行から Inbox タスクへジャンプ（onOpenTaskInInbox + setOpenLatestTaskType）
- Phase 18-A: Expense Analytics（CreatorReadyExpenseInputSection に当月合計 + カテゴリ別バー）
- Phase 18-B: Contract Lifecycle UI（Contact Pipeline 契約ステータスインライン編集 + 12ヶ月更新アラート）
- Phase 18-C: `RevenueRecord` モデル + API + Creator Home 収入記録セクション + 月次収支サマリー
- Phase 19-A: `StageEvidence` モデル + API + Manager Desk Creator Detail Stage Evidence セクション
- Phase 19-B: 公開プロフィール Revenue Proof card（総収益・最大単月・収益活動月数、RevenueRecord 存在時のみ）
- Phase 20-A: `DAILY_ACTION_PLAN` executor に収支シグナル（今月収支・先月比・最弱成熟軸）を統合
- Phase 20-B: `CONTACT_INTELLIGENCE_ALERT` AgentTask 追加（停滞・期限超過・温度感を分析しリスク接点をリスト化）
- Phase 21-A: 公開プロフィール Community Trust Surface（連続支援月数・loyal/recurring バッジ・`PublicProfileSupporterTrustCard`）
- Phase 21-B: SupporterCRM 信頼スコア（`consecutiveSupportMonths` / `trustScore` 追加・信頼度順ソート・継続バッジ）
- Phase 22-A: x402 Service Catalog groundwork（PHASE_3 サーフェス5種追加・`getX402SurfaceForTaskType` ヘルパー追加）
- Phase 22-B: `CreatorProfile.ecosystemRole` スキーマ追加・Creator Discovery ロールフィルター・CreatorCard ロールバッジ
- Phase 23-A: ecosystemRole 自己選択フルスタック（serializer→API→state→context→AccountPageClient→actions→profileApi→EditForm）
- Phase 23-B: Daily Briefing プロフィール完成度シグナル（紹介文 < 20文字 or ecosystemRole 未設定でアクション追加）
- Phase 25-A: `ProjectMember` スキーマ追加（role / sharePercent / walletAddress / displayName / status + migration）
- Phase 25-B: Manager Desk ProjectMembers セクション（API GET+POST + フック + UI + Creator Detail 統合）
- Phase 26-A: 公開プロフィール ProfileHero に creatorType / ecosystemRole バッジを追加（ProfileClient から伝播）
- Phase 26-B: 公開プロフィール チームメンバーセクション（`getPublicTeamMembers` + `PublicProfileTeamSection`）
- Phase 26-C: `DISTRIBUTION_PLAN_DRAFT` executor が ProjectMember.sharePercent で按分 draft を生成（member_share_template ソース追加）
- Phase 27-UX: 訪問者向けパブリックプロフィール UX 強化（BottomNav 3/4/5タブ分離・スティッキーCTA・セクション順序再設計・ProfileHero バナー拡大・ImpactNumbers Hero統合・スクロールアンカーナビ・CreatorDiscovery カード強化）
- Phase 27-A: 月次収支レポート自動起票（`useMonthlyCashflowReportAutoTrigger` — 3日以降・月1回・FINANCE agent）
- Phase 27-B: Creator Home 収支ヘルスカード（`CreatorReadyCashflowHealthCard` — 当月収支グリッド + 先月比 + AI分析リンク）
- Phase 27-C: Creator Home 月次収支レポート inline 表示（`CreatorReadyCashflowReportSection` — 当月承認済みレポートを inline 描画）
- Growth Onboarding Phase: `GrowthEvent` schema + `/api/growth/events` + sendBeacon/fetch keepalive tracking
- Growth Onboarding Phase: mypage `SetupProgressCard / NextBestActionCard` による公開セットアップ導線
- Growth Onboarding Phase: AIプロフィール下書き（`/api/ai/profile-draft`）を propose-first で追加
- Growth Onboarding Phase: AI拡散文面生成（`/api/ai/share-drafts`）を追加
- Growth Onboarding Phase: owner が公開ページを確認した導線と SNS 拡散導線を追加
- Growth Onboarding Phase 2: confirmed contribution path から `first_tip_received` を記録
- Growth Onboarding Phase 2: mypage settings に `GrowthOverviewCard` と owner-auth growth overview read model を追加
- Growth Onboarding Phase 3: home / settings に `GrowthCoachCard` を追加し、次の growth action を即時提示
- Growth Onboarding Phase 3: settings の setup progress / next action が growth overview の server-side facts と同期
- Growth Onboarding Phase 4: settings に manual share execution log を追加し、`share_post_logged` で実投稿まで追跡

### Current constraints

The current product still has several structural limitations:

- `AccountPageClient` remains too central to creator-side orchestration
- creator operations and settings/editing are not yet cleanly separated
- manager workflows and relationship memory now have dashboard, contact, notes, and activity surfaces, and creator-facing `Manager Feed` is live, but growth / reflection layers are still incomplete
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

For the current phase, this also means:
**“reduce the time from wallet connection to a complete public page and first support.”**

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

In the current growth phase, the same mypage must also behave like a **public setup guide** for first-time creators:

- show setup completion clearly
- suggest one next best action
- help draft profile / project / goal inputs
- help generate share-ready public messaging
- keep advanced financial and settlement controls available but secondary

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

At the same time, when the owner views the page, it should lightly confirm:

- the page has been reviewed
- the next action is to return to mypage and generate share drafts
- growth actions stay separate from supporter-facing contribution flows

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
- creator onboarding completion
- public launch conversion
- first support conversion

## Current Growth Onboarding Capability

### What creators can do now

- connect wallet and register from mypage
- see setup progress toward public launch
- follow a next-best-action card instead of reading a generic settings screen
- generate an AI profile draft from natural language
- apply the draft into existing profile / project / goal inputs and then review manually
- generate AI share drafts that include the public page URL
- copy platform-specific share text with one click
- confirm the public page as the owner and continue setup from there
- accumulate growth events without blocking core UI or financial actions

### What is intentionally not automated yet

- external SNS auto posting
- reaction analysis with automatic optimization loops
- full growth ops dashboard

### Current principle

- AI is propose-first
- growth actions are additive
- financial / contribution / goal / summary flows keep their existing meaning

## Recommended Next Execution Order

短期・中期・長期の整理は次を参照する。

- [Execution Plan](/Users/shounokazuaki/cf/docs/roadmap/execution-plan.md)

1. turn Creator Home / Manager Desk / core model docs into implementation-sized issue slices
2. approve and implement `Meeting` schema and shared timeline helper
3. implement `Upcoming / Planner` in Creator Home and Manager Desk
4. extend Manager Desk follow-up surfaces with `Activity Timeline`
5. add creator-facing Manager Feed / Growth-Reflection over the new structured context

## Near-term Priorities

### Priority A

- improve onboarding completion from wallet connection to public launch
- improve share generation and first support conversion
- extend `Manager Desk` with `Activity Timeline`
- keep `AI Daily Briefing` and manager-side attention cards grounded in structured context
- preserve approval boundaries for schema and high-risk flow changes

### Priority B

- extend Creator Home with `Manager Feed / Growth-Reflection`
- add shared action timeline / follow-up handling
- add missing-items detection over planner / note / contact signals
- add lightweight CRM behavior over `ExternalContact`
- expand Manager Desk from `Contact Pipeline / Notes Surface` into `Activity Timeline`
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
