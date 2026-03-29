# Tasks

## Current Focus

- **Direction Sync 完了**: Vision / Constitution / Roadmap / responsibility boundaries / Creator Home / Manager Desk / data models の文書化が揃った
- **Next Build Phase**: 人間中心の運営OSの土台を実装へ移す — `Meeting / Planner / follow-up minimum` は実装済み。次は structured context を使う AI operational assistance
- **Planning Baseline**: 短期・中期・長期の実行計画は [Execution Plan](/Users/shounokazuaki/cf/docs/roadmap/execution-plan.md) を基準にする

## Recommended Next Execution Order

1. ~~`CHD-2` Growth / Reflection MVP~~ 完了
2. ~~missing-items detection over planner / note / contact signals~~ 完了
3. ~~Meeting 決定事項を structured task に落とす minimum flow~~ 完了
4. ~~Trust / Stage / CRM groundwork~~ 完了
5. ~~lightweight CRM polish over status / next action / temperature~~ 完了

## Active Tracks

Track 8-I — Growth onboarding and launch conversion
- 完了: setup progress / next-best-action / AI profile draft / AI share draft
- 完了: owner public-page review event
- 完了: `first_tip_received` server-side confirmed contribution tracking
- 完了: owner-auth `growth overview` API + settings card
- 完了: home / settings `growth coach` card
- 完了: settings setup progress / next action の server-side growth sync
- 完了: settings manual share execution log + `share_post_logged` tracking

Track 8-A — Creator Home first slice
- `CH-1` 完了: `Hero / Daily Briefing`
- `CH-1` 完了: `Project Progress` card 化
- `CH-2` 完了: `AI Manager` cards
- `CH-2` 完了: `Today / This Week`
- `CH-2` 完了: settings-first ではない Home 導線

Track 8-B — Manager core models and contracts
- 完了: `ManagerAssignment`
- 完了: `ManagerNote`
- 完了: `ExternalContact`
- 完了: `ActionLog`
- 完了: additive Prisma schema + migration + minimal APIs

Track 8-C — Manager Desk first slice
- 完了: issue 分解
- 完了: Dashboard / Creator Detail read model
- 完了: Dashboard MVP
- 完了: Creator Detail MVP

Track 8-D — Meeting / Planner / follow-up minimum
- 完了: meeting contract
- 完了: shared timeline input shape
- 完了: schema/read model proposal docs
- 完了: additive `Meeting` schema + migration
- 完了: `Meeting` create / list / read / update APIs
- 完了: Creator Home `Upcoming / Planner` MVP
- 完了: Manager Desk `Upcoming / Planner` MVP

Track 8-E — AI operational assistance on structured context
- ready: issue doc created
- 完了: `AO-1` Daily Briefing read contract
- 完了: `AO-2` note summarization / follow-up extraction
- 完了: `AO-3` manager-side UI connection
- later: missing-items detection

Track 8-F — Manager Desk follow-up slices
- ready: issue doc created
- 完了: `MF-1` Contact Pipeline MVP
- 完了: `MF-2` Notes surface MVP
- 完了: `MF-3` Activity Timeline MVP

Track 8-G — Creator Home deferred sections
- ready: issue doc created
- 完了: `CHD-1` Manager Feed MVP
- 完了: `CHD-2` Growth / Reflection MVP

Track 8-H — Missing Items Detection / Meeting Follow-up Flow
- 完了: missing-items detection (Manager Desk) — Note/Contact/Meeting gaps を横断検出
- 完了: Meeting 決定事項 → ManagerNote 変換 minimum flow

Track 8-J — AI Manager Account rollout
- 完了: `AI Manager Account` 構想書 / billing policy / x402方針 / owner-control 原則の仕様化
- 完了: additive Prisma schema + migration (`AiManagerAccount / AiManagerBillingPolicy / AiManagerBudgetBalance`)
- 完了: owner-auth `GET / POST / PATCH /api/creator/ai-manager`
- 完了: settings `AIマネージャー` セクション（人格・公開範囲・JPYC 予算・cap 設定）
- 完了: Creator Home `AI Manager` セクションに account state / visibility / budget summary を追加
- 完了: `AM-2` AI Office Overview に manager identity / billing boundary を統合
- 完了: `AM-3` usage record / payment attempt ledger と pause-on-failure 基盤を追加
- 完了: `AM-4` budget top-up / balance operation UX（owner-operated internal ledger）を追加
- 完了: `AM-5` public badged AI Manager surface と公開時 disclosure copy を公開プロフィールへ追加
- 完了: `AM-6` Manager Desk read-only view と owner / manager / AI の責務境界表示を追加
- 完了: `AM-7` real wallet top-up / x402 readiness API と settings surface を追加
- 完了: `AM-8` real wallet top-up evidence と internal ledger credit の照合フローを追加
- 完了: `AM-9` x402 pending confirmation / fail-to-pause / owner reconciliation UI を追加
- 完了: `AM-10` owner-facing reconciliation summary を Account / Home / AI Office に追加
- 完了: `AM-11` verified payee registry groundwork を funding surface / billing rail 判定へ統合
- 完了: `AM-12` external x402 connector ingestion route と shared settlement state machine を追加
- 完了: `AM-13` `/<creator>/manager/<slug>` public showcase route と slug-based public identity を追加
- 完了: `AM-14` public showcase に creator progress / activity proof / support CTA を統合
- 完了: `AM-15` public showcase に public-safe な recent support activity summary を追加
- 完了: `AM-16` x402 connector ingestion を idempotent retry-safe にし、structured observability log を追加
- 完了: `AM-17` pending x402 delivery status visibility を reconciliation / Settings / Home / AI Office に追加
- 完了: `AM-18` pending x402 queue visibility を Settings / AI Office に追加
- 完了: `AM-19` recent x402 activity visibility を Settings / AI Office に追加
- 完了: `AM-20` owner follow-up queue を Settings / Home / AI Office に追加し、stale pending / failed / unmatched evidence の次アクションを可視化
- 完了: `AM-21` payment attempt event ledger を追加し、recent delivery events を Settings / AI Office で可視化
- 完了: `AM-22` pending x402 queue を event-aware にし、最後の delivery event source / label / time を Settings / AI Office に表示
- 完了: `AM-23` reconciliation summary に latest pending x402 event を統合し、Home / Settings / AI Office の上位サマリーを event-aware 化
- 完了: `AM-24` delivery-status 判定そのものに latest pending event を反映し、recent connector activity がある pending を stale 扱いしにくくした
- 完了: `AM-25` owner follow-up を event source aware にし、connector / owner review / funding evidence の見る先を UI で明示
- 完了: `AM-26` failed x402 follow-up も event source aware にし、connector failure と owner-side failure の戻し先を分けた
- 完了: `AM-27` replay / recovery 専用の owner summary を Settings / Home / AI Office に追加
- 完了: `AM-28` recovery summary を reconciliation card に統合し、上位サマリーから recent recovery を把握できるようにした
- 完了: `AM-29` recovery summary に source 別 breakdown を追加し、connector / owner review の回復線を上位サマリーで比較できるようにした
- 完了: `AM-30` external x402 connector の pending polling check-in route を追加し、`PENDING_OBSERVED` event と短時間重複 suppress で pending delivery の鮮度を上げた
- next: connector polling の event を owner-facing recent timeline / copy にさらに馴染ませるか、recovery summary を時系列 trend に発展させるか整理する

## Phase 2 UX（完了済み）

Issue 1 — ワークスペースナビを2モードに変更: **完了**
- 5タブを廃止し `今日の仕事` / `設定・準備` の2モードトグルに変更
- ヘッダーに `投稿する` と `ファン目線を確認↗` を固定

Issue 2 — 「今日の仕事」モードでAI事務所を主画面に: **完了**
- AI事務所の承認待ちを最上部に固定
- `CreatorReadyHomeRoute.tsx` が AI事務所 + プロジェクト健全性を描画

Issue 3 — 「設定・準備」モードとして SettingsPageClient を正式化: **完了**
- プロフィール編集をインライン展開に変更
- 公開ページの準備状況 + ファン目線確認リンクを追加
- プロジェクト・目標を可視セクションとして配置（詳細設定の折り畳みを廃止）
- 精算セクションを末尾に配置し [試験中] バッジを付与

Issue 4 — 公開ページにクリエイター管理ストリップを追加: **完了**
- `viewerState.isOwner` のとき上部ストリップを表示
- `CreatorManagementStrip.tsx` を新規作成し `ProfileClient.tsx` に接続

Issue 5 — 投稿アクションをヘッダーに統合: **完了**
- 「投稿する」ボタンをどのモードからでも1クリックで到達できるよう `CreatorReadyWorkspaceHeader` に配置

Issue 6 — 初回導線を設定・準備モードに寄せる: **完了**
- プロフィール・Goal 未設定時は設定・準備モードへの誘導バナーを `CreatorReadyHomeRoute` に追加

Dead code cleanup — 旧5タブ時代の不要ファイルを削除: **完了**
- 削除: `CreatorReadyWorkspaceOverview`, `CreatorReadyQuickActionsSection`, `CreatorReadyBetaActionsSection`,
  `CreatorReadyAiApprovalSection`, `useCreatorReadyWorkspaceOverviewData`,
  `CreatorReadyAdvancedRoute`, `CreatorReadyPublicRoute`, `CreatorReadySupportersRoute`,
  `CreatorReadySupportPageRoute`, `CreatorReadyRoutePanel`,
  `CreatorSettingsAiOfficeSection`, `CreatorSettingsProjectSection`

### UX Foundation（完了済み）

- completed: terminology and status-copy rules now exist in docs and are applied to AI Office / settlement
- completed: shared notice / empty-state pattern now reaches `AI Office`, `settlement`, and key `mypage` views
- completed: public profile support hero, wallet CTA, light theme, and surface tone are consistent
- completed: `settlement` follows a guided `Bridge -> Draft -> Preflight -> Execute -> Review` structure
- completed: `AI Office` has `Overview / Create / Inbox` separation with action cards and role-based navigation
- completed: `Manager Agent` and `Finance Agent` handoffs to settlement Draft are working
- completed: onboarding progress shell connects `NoUser -> UserOnly -> creatorReady`

## Phase 3（完了済み）

Sprint A-1 — WEEKLY_REPORT executor 実データ確認: **完了**
- `contentMetricSnapshot` と `contribution.aggregate` の実クエリを確認
- 0件時の graceful 出力（材料不足メッセージ）を検証済み

Sprint A-2 — 活動サマリーカード publishedCount 表示: **完了**
- `CreatorReadyWeeklySummarySection` に `publishedCount` prop を追加
- 「CF内 累計 / うち公開 N件」の2行表示

Sprint C-1 — useProjectSettlementDataFetch 抽出: **完了**
- loading / message / settlement / bridgeSteps / entries / recentExecutions / cctpJobs を `useProjectSettlementDataFetch.ts` に抽出
- `useProjectSettlementPanel` は pure composition layer になった

Sprint C-2 — lint 警告解消: **完了**
- lint 警告ゼロを確認（既に clean な状態だった）

Sprint D-1 — PROFILE_UPDATE_PROPOSAL AgentTask 追加: **完了**
- `lib/agentTaskParsers.ts` に TaskType 追加
- `lib/creator-ai/profileUpdateProposalTask.ts` executor 実装
- `lib/agentTaskExecutors.ts` TASK_DEFINITIONS に登録
- `lib/creator-ai/agentRoleRegistry.ts` MANAGER candidateTaskTypes に追加
- `components/mypage/aiOfficeTaskConfig.ts` Create UI カード追加
- `components/mypage/AgentTaskOutputViews.tsx` parser + card + renderer 追加
- `lib/uxCopy.ts` label / helper 追加
- `docs/specs/creator-ai-office/task-output-contracts.md` contract 追記

## Phase 4（完了済み）

Phase 4 の目的: consol.txt ビジョン（Creator OS）の中核機能を接続する。

Sprint 4-A — `DAILY_ACTION_PLAN` AgentTask 追加: **完了**
- `lib/creator-ai/dailyActionPlanTask.ts` executor 実装
- Manager Agent candidateTaskTypes に追加
- Create UI カード・output renderer・uxCopy 追加
- 承認待ち / 投稿状況 / 目標期限 / 支援者数 をもとに今日の優先行動を生成

Sprint 4-B — `ACTIVITY_RESTART_PROPOSAL` AgentTask 追加: **完了**
- `lib/creator-ai/activityRestartProposalTask.ts` executor 実装
- Manager Agent candidateTaskTypes に追加
- 最終投稿日 / 過去エンゲージメント / 支援状況 をもとに再起動ステップを生成

Sprint 4-C — `SUPPORT_STORY_DRAFT` AgentTask 追加: **完了**
- `lib/creator-ai/supportStoryDraftTask.ts` executor 実装
- Promotion Agent candidateTaskTypes に追加
- Project / Goal / Purpose / Contribution から why/what/progress の 3 セクション構成ストーリーを生成

Sprint 4-D — 公開プロフィール 活動実績バッジ追加: **完了**
- `lib/creatorActivityCredibility.ts` 集計サービス実装（schema 変更なし）
- `components/profile/CreatorActivityCredibilityBadge.tsx` 新規作成
- `/[username]/page.tsx` に活動実績セクションを追加（活動期間・投稿数・目標達成・累計支援者）

Sprint 4-E — `TRANSLATE` → posting compose handoff: **完了**
- `postingComposeHandoff.ts` に `buildTranslatePostingComposeHandoff` 追加、sourceTaskType に `"TRANSLATE"` を追加
- `TranslateOutputCard` に言語ごとの「compose に送る」ボタンを追加

## Phase 5（完了済み）

Phase 5 の目的: consol.txt ビジョン残差（毎日迷わない / ファンが支援の手応えを持てる / 新人でも始められる / 長期キャリア設計）を実装として反映する。

Sprint 5-A — `DAILY_ACTION_PLAN` 自動起票: **完了**
- `components/mypage/useDailyActionPlanAutoTrigger.ts` フックを作成
- `CreatorReadyHomeRoute` の mount 時に当日タスクが未存在の場合のみ自動起票
- sessionStorage で二重起票を防止

Sprint 5-B — `SUPPORTER_RESULT_REPORT` AgentTask 追加: **完了**
- `lib/creator-ai/supporterResultReportTask.ts` executor 実装
- FAN_RELATION Agent candidateTaskTypes に追加
- Create UI カード・output renderer（用途別棒グラフ形式）・uxCopy 追加

Sprint 5-C — 公開プロフィール 目標達成インパクト表示: **完了**
- `lib/goalAchievementImpact.ts` 集計サービス実装（schema 変更なし）
- `components/profile/GoalAchievementImpactCard.tsx` 新規作成
- `/[username]/page.tsx` に達成済みゴールがある場合のみ追加表示

Sprint 5-D — `CAREER_PLAN_DRAFT` AgentTask 追加: **完了**
- `lib/creator-ai/careerPlanDraftTask.ts` executor 実装（3ヶ月・6ヶ月マイルストーン）
- Manager Agent candidateTaskTypes に追加
- Create UI カード・output renderer（タイムライン形式）・uxCopy 追加

Sprint 5-E — 新人向け AI 初回ガイド: **完了**
- `CreatorReadyHomeRoute` に isNewCreator 判定を追加（Post.count === 0 && goalMissing）
- 「まずここから」バナーを AI 事務所パネル直前に表示
- ボタンクリックで AI Office Create（MANAGER role）に遷移

## Phase 6（完了）

Sprint 6-C — AI プロバイダー統合基盤: **完了**
- `lib/ai/types.ts` 共通インターフェース定義
- `lib/ai/geminiProvider.ts` Gemini 2.0 Flash Lite 実装（Priority 1 / 無料枠）
- `lib/ai/openaiProvider.ts` gpt-4.1-nano 実装（Priority 2）
- `lib/ai/anthropicProvider.ts` claude-haiku-4-5 実装（Priority 3）
- `lib/ai/index.ts` フォールバックチェーン付き統合クライアント（`resolveAiProvider` / `generateText` / `generateJson`）
- `ModelUnavailableError` でモデル廃止を検知し次プロバイダーへ自動フォールバック
- `.env.example` に `GEMINI_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` を追加

Sprint 6-A — GROWTH_OPPORTUNITY_ALERT AgentTask: **完了**
- `lib/creator-ai/growthOpportunityAlertTask.ts` executor 実装（7日間トレンド分析）
- Promotion Agent candidateTaskTypes に追加
- Create UI カード・output renderer（priority badge 形式）・uxCopy 追加

Sprint 6-B — ContentMetricSnapshot 入力 UI: **完了**
- `app/api/metrics/manual/route.ts` 手動入力 POST エンドポイント追加
- `components/mypage/MetricsInputCard.tsx` フォーム + 履歴ビュー新規作成
- `PostingAiOfficeSection` に MetricsInputCard を統合

Sprint 6-D — 残 executor → AI 接続: **完了**
- `DAILY_ACTION_PLAN` / `ACTIVITY_RESTART_PROPOSAL` / `CAREER_PLAN_DRAFT` executor に generateJson 接続
- 全タスクにルールベースフォールバック

Sprint 6-E — SUPPORTER_RESULT_REPORT → AI 接続: **完了**
- `supporterResultReportTask.ts` に generateJson を追加（温かみのある summary 文生成）

Sprint 6-F — 技術負債 / docs 整備: **完了**
- `docs/specs/creator-ai-office/task-output-contracts.md` に Phase 5〜6 新タスク契約を追記
- `docs/ai-providers.md` 新規作成（モデル変更方法・ModelUnavailableError 対応手順）
- TASKS.md / PROJECT_STATE.md を Phase 6 完了に更新

## Phase 7（主要項目完了）

Sprint 7-A — 全ドラフト → Posting Compose ハンドオフ拡張: **完了**
- `postingComposeHandoff.ts` の sourceTaskType に `SUPPORT_STORY_DRAFT` / `PROPOSE` を追加
- `buildSupportStoryPostingComposeHandoff` / `buildProposePostingComposeHandoff` 追加
- `SupportStoryDraftOutputCard` に "compose に送る" ボタン追加（projectId prop 拡張）
- `ProposeOutputCard` に各提案ごとの "compose に送る" ボタン追加（projectId prop 拡張）
- `task-output-contracts.md` の Posting Compose Handoff UI rules を更新

Sprint 7-B — 支援者向け Activity Feed 強化: **完了**
- `lib/goalAchievementImpact.ts` を複数ゴール対応に更新（`getAllGoalAchievementImpacts`）
- 各ゴールに `activityPostCount`（達成後の投稿数）を追加
- `GoalAchievementImpactCard.tsx` に `activityPostCount` 表示、`GoalAchievementImpactSection` を追加（最新ゴールを詳細表示、過去ゴールをコンパクトリスト表示）
- `lib/supporterResultReportSummary.ts` 新規作成（最新承認済み SUPPORTER_RESULT_REPORT summary を取得）
- `app/[username]/page.tsx` に「支援者へのご報告」（AI summary）と複数ゴール表示を追加
- `CreatorFeedSection` に `goalAchievedAt` prop を追加し、達成後の投稿に「目標達成後の活動」バッジを表示
- `ProfileClient` から `LazyFeedSection` に `goalAchievedAt` を渡すよう更新

Sprint 7-C — クリエイター発見ページ: **完了**
- `app/creators/page.tsx` 新規作成（サーバーコンポーネント）
- creatorType フィルターチップ（Link ベース、SSR フレンドリー）
- 各クリエイターカード：avatar / displayName / creatorType / 目標達成バッジ / 投稿数 / profile 抜粋
- 最大 60 名、`revalidate: 120`

## Sprint 8-O — Docs & State 同期（Phase 8 クローズ）（完了）

- 完了: `docs/specs/creator-ai-office/task-output-contracts.md` に MEETING_AGENDA_DRAFT / CONTACT_OUTREACH_DRAFT の契約を追記
- 完了: `PROJECT_STATE.md` を Phase 8 の成果（Opportunity CRM / Fan Relations / Creator Stage / 新 AgentTask 群 / 承認実績サマリー）を反映して更新
- 完了: `TASKS.md` に Phase 8 完了を記録し Phase 9 の候補をリストアップ

## Sprint 8-N — AI Office 承認実績サマリー（完了）

- 完了: `AiOfficeOverviewSection.tsx` の Status エリア下部に「今月の承認実績」バーを追加
  - 承認数 / 却下数 / 承認率 / 判断中央値を既存 `usefulness` prop から表示（新 API 不要）
  - `actionableCount > 0` の場合のみ表示

## Sprint 8-M — Meeting → MEETING_AGENDA_DRAFT ショートカット（完了）

- 完了: `CreatorReadyUpcomingPlannerSection.tsx` に `agendaCreateHref` prop を追加
  - MEETING ソースのアイテムに「アジェンダを作る →」リンクを表示
- 完了: `CreatorReadyHomeRoute.tsx` で `aiOfficeCreateAgendaHref` を生成して渡す
- 完了: `ManagerDeskCreatorDetailPreviewClient.tsx` の planner セクションの MEETING アイテムに「アジェンダを作る →」リンクを追加

## Sprint 8-L — Opportunity CRM + Wave 1 rename（完了）

- 完了: Manager Desk Opportunity CRM 追加
  - `lib/managerDesk/readModelTypes.ts` に `ManagerDeskOpportunityCrmData` / `ManagerDeskOpportunityStage` / `ManagerDeskOpportunityStatus` 型追加
  - `lib/managerDesk/readModel.ts` に `getManagerDeskOpportunityPipeline` 追加（IN_DISCUSSION / NEGOTIATING / WON / ONGOING をステージ別にグループ）
  - `app/api/manager-desk/opportunities/route.ts` — GET endpoint 追加
  - `components/managerDesk/useManagerDeskOpportunityCrm.ts` — client hook 追加
  - `components/managerDesk/ManagerDeskOpportunityCrmClient.tsx` — ステージ別案件リスト + 連絡文 CTA + Creator filter
  - `app/manager-desk/opportunities/page.tsx` — ページ追加
  - Dashboard に "Opportunity CRM" ナビリンク追加
- 完了: Wave 1 rename — `PostingAiOfficeSection.tsx` の "外部SNS連携なし" コピーを CF 内投稿向けの文言に修正

## Sprint 8-K — Manager Desk Creator Stage + CONTACT_OUTREACH_DRAFT（完了）

- 完了: Manager Desk Creator Detail に Creator Stage セクション追加
  - `lib/managerDesk/readModelTypes.ts` に `stage: CreatorStageResult | null` 追加
  - `lib/managerDesk/readModel.ts` で `getCreatorActivityCredibility` + `deriveCreatorStage` を並列実行
  - `ManagerDeskCreatorDetailPreviewClient.tsx` に stage ピル進行バー + maturity 4軸バー + nextMilestone を追加
- 完了: `CONTACT_OUTREACH_DRAFT` AgentTask 追加
  - `lib/creator-ai/contactOutreachDraftTask.ts` executor 実装（contactId/purpose/tone を受け取り、接点履歴・ノート・クリエイター情報から営業文面を生成）
  - MANAGER Agent candidateTaskTypes に追加
  - Create UI カード・output renderer（下書き本文 + 押さえるポイント + フォローアップ提案）・uxCopy 追加

## Sprint 8-J — Creator Fan Relations Overview（完了）

- 完了: `lib/operations/supporterOverviewTypes.ts` — `SupporterOverviewData` / `SupporterTopItem` 型定義
- 完了: `lib/operations/supporterOverview.ts` — `getSupporterOverview` サービス（累計 / 今月 / 直近30日 / top5 by 支援回数）
- 完了: `app/api/mypage/supporter-overview/route.ts` — GET endpoint
- 完了: `components/mypage/useCreatorReadySupporterOverview.ts` — client hook
- 完了: `components/mypage/CreatorReadySupporterOverviewSection.tsx` — UI（累計/今月/直近の3グリッド + top supporters + FAN_RELATION CTA）
- 完了: `CreatorReadyHomeRoute.tsx` に接続（GrowthReflection 後、AI Office パネル前）

## Sprint 8-I — AI Meeting Support + Stage Integration（完了）

- 完了: `MEETING_AGENDA_DRAFT` AgentTask 追加
  - `lib/creator-ai/meetingAgendaDraftTask.ts` executor 実装（meetingId / 直近ノート / 会議履歴から agenda / 事前確認 / 決定事項を生成）
  - MANAGER Agent candidateTaskTypes に追加
  - Create UI カード・output renderer（numbered agenda list）・uxCopy 追加
  - `AgentTaskOutputViews.tsx` に MeetingAgendaDraftOutputCard 追加
- 完了: `DAILY_ACTION_PLAN` を Creator Stage 対応に強化
  - `deriveCreatorStage` / `getCreatorActivityCredibility` をインポートして stage 情報を AI プロンプトに追加
  - context に `stage` / `stageLabel` を出力

## Phase 9（完了）

Sprint 9-A — Wave 2 rename: **完了**
- `postingManagedApi.ts` が `snsPostsApi.ts` + `snsAgentJobApi.ts` から直接インポートするよう変更（`snsApi.ts` 経由を廃止）
- `snsApi.ts` は backward-compat barrel として存続

Sprint 9-B — MEETING_AGENDA_DRAFT meetingId pre-fill: **完了**
- `aiOfficePanelUrlState.ts` に `openCreateTaskType` URL param を追加
- `AiOfficePanel.tsx` が `openCreateTaskType` で initial task type を初期化
- Creator Home planner の「アジェンダを作る」が `aiOfficeOpenCreateTaskType=MEETING_AGENDA_DRAFT` を渡すよう更新
- Manager Desk の meeting リンクも同様に更新

Sprint 9-C — Supporter CRM surface: **完了**
- `lib/operations/supporterCrmTypes.ts` — 型定義追加
- `lib/operations/supporterCrm.ts` — `getSupporterCrm`（groupBy amountDecimal + min/max confirmedAt）
- `app/api/mypage/supporter-crm/route.ts` — GET endpoint 追加
- `components/mypage/useCreatorReadySupporterCrm.ts` — client hook
- `components/mypage/CreatorReadySupporterCrmSection.tsx` — 支援者リスト（累計回数・通貨別金額・初回/最終日）
- Creator Home に SupporterOverviewSection の後に追加

Sprint 9-D — AI Office 採択ヒント: **完了**
- `AiOfficeOverviewSection.tsx` の担当一覧ロー: 活用率 < 30% かつ trackedReadyCount >= 2 の担当に採択ヒントを表示

## Phase 10（完了）

Sprint 10-A — Creator Home Stage maturity 詳細表示: **完了**
- `CreatorReadyWeeklySummarySection.tsx` の Stage セクションを拡張
- stageDescription（現ステージの説明）を追加表示
- maturity 4軸バー（output/audience/business/continuity）をクリエイター向けに日本語ラベルで追加
- nextMilestone を強調スタイル（→ テキスト）で表示

Sprint 10-B — `STAGE_GROWTH_PLAN` AgentTask: **完了**
- `lib/creator-ai/stageGrowthPlanTask.ts` executor 実装（活動実績 → stage/maturity 導出 → 最弱軸検出 → 成長ステップ生成）
- MANAGER Agent candidateTaskTypes に追加
- Create UI カード・output renderer（4軸バー + 成長ステップリスト）・uxCopy 追加
- `lib/agentTaskParsers.ts` / `agentTaskExecutors.ts` / `agentRoleRegistry.ts` に登録

Sprint 10-C — Supporter CRM フィルター/ソート: **完了**
- `CreatorReadySupporterCrmSection.tsx` に sort トグル追加（直近の支援順 / 支援回数が多い順）
- 3回以上支援した支援者に VIP バッジを表示
- vipCount をサマリーテキストに追加

## Phase 11（完了）

Sprint 11-A — `STAGE_GROWTH_PLAN` 月次 auto-trigger: **完了**
- `components/mypage/useStageGrowthPlanAutoTrigger.ts` 新規作成
- localStorage キー `cf:stage-growth-plan-triggered:{address}:{YYYY-MM}` で月1回のみ起票
- 当月の STAGE_GROWTH_PLAN が未存在の場合のみ POST
- `CreatorReadyHomeRoute.tsx` に接続

Sprint 11-B — Manager Desk Supporter CRM view: **完了**
- `app/api/manager-desk/creators/[creatorProfileId]/supporter-crm/route.ts` — GET endpoint 追加（`requireCreatorAccess` で manager/owner 双方を許可）
- `components/managerDesk/useManagerDeskSupporterCrm.ts` — client hook 追加
- `components/managerDesk/ManagerDeskSupporterCrmSection.tsx` — UI（VIP バッジ・全件表示トグル）
- Manager Desk Creator Detail に「支援者 CRM」セクションを追加

Sprint 11-C — Opportunity に最新ノート snippet 追加: **完了**
- `lib/managerDesk/readModelTypes.ts` に `ManagerDeskContactLatestNote` 型追加、`ManagerDeskContactPipelineItem` に `latestNote` フィールド追加
- `readModel.ts` に `fetchLatestNotesByContactId` helper 追加（Prisma `distinct` で contact ごとの最新ノートを一括取得）
- `getManagerDeskContactPipeline` / `getManagerDeskOpportunityPipeline` の両方に latestNote を付与
- `ManagerDeskOpportunityCrmClient.tsx` の `OpportunityCard` に最新ノートスニペット（タイトル + 100文字）を表示

## Phase 12（完了）

Sprint 12-A — Contact Pipeline に latestNote 表示: **完了**
- `ManagerDeskContactPipelineClient.tsx` の各 contact カードに最新ノートスニペット（タイトル + bodySnippet + 日時）を追加
- Opportunity CRM と同一パターン（データは Phase 11-C 時点で既に付与済み）

Sprint 12-B — Notes Surface から Contact へのリンク: **完了**
- `ManagerDeskNotesSurfaceClient.tsx` の note カードに `externalContactId` が存在する場合のみ「Contact Pipeline」リンクを追加
- `creatorProfileId` フィルタ付きで Contact Pipeline へジャンプ

Sprint 12-C — Creator Home に当月 STAGE_GROWTH_PLAN 結果を inline 表示: **完了**
- `CreatorReadyStageGrowthPlanSection.tsx` 新規作成（`AgentTaskOutput` で出力をレンダリング）
- `CreatorReadyHomeRoute.tsx` で `aiOfficeSummary.tasks` から当月 STAGE_GROWTH_PLAN を抽出し表示
- `CreatorReadySupporterCrmSection` の直後に配置

Sprint 12-D — 公開プロフィールに Creator Stage バッジ表示: **確認済み（実装済み）**
- `CreatorStageCard` が `app/[username]/page.tsx` で既にサーバーサイドレンダリングされていることを確認

## Phase 13（完了）

Sprint 13-A — 公開プロフィール Impact Numbers: **完了**
- `components/profile/PublicProfileImpactNumbers.tsx` 新規作成（投稿本数・支援者数・活動継続月数を3列表示）
- `CreatorActivityCredibility` を再利用（追加 fetch なし）

Sprint 13-B — 公開プロフィール Creator Voice Card: **完了**
- `components/profile/PublicProfileCreatorVoiceCard.tsx` 新規作成
- アクティブプロジェクトの `description` を引用スタイルで表示 + 進捗バー（OPEN ゴールのみ）
- 追加 fetch なし

Sprint 13-C — 公開プロフィール Recent Supporters（Living Funding Pulse）: **完了**
- `lib/publicProfileEnhancement.ts` 新規作成（`getRecentPublicContributors` — 最近の distinct 支援者アドレスを `unstable_cache` 付きで取得）
- `components/profile/PublicProfileRecentSupporters.tsx` 新規作成（最近 4 件のアドレス chip + 合計人数）
- `app/[username]/page.tsx` に 3 コンポーネントを ProfileClientSection 直後に配置

## Phase 14（完了）

Sprint 14-A — Opportunity CRM にノート作成導線: **完了**
- WON/ONGOING カードにインライン `ManagerNote` 作成フォームを追加
- 既存 `/api/manager-notes` POST を再利用（スキーマ変更なし）

Sprint 14-B — Contact Pipeline 一括ステータス更新: **完了**
- チェックボックス選択 + bulk action bar で複数 contact の `status` を一括変更
- 既存 `/api/external-contacts/{id}` PATCH を並列呼び出し（スキーマ変更なし）

Sprint 14-C — 公開プロフィール Activity Heatmap: **実装済み確認**
- `PublicProfileActivityHeatmap.tsx` が既に実装・統合済み

Sprint 14-D — 公開プロフィール Next Goal Reveal: **実装済み確認**
- `PublicProfileNextGoalReveal.tsx` が既に実装・統合済み

## Phase 15（完了）

Sprint 15-A — Contribution.message フィールド追加: **完了**
- Prisma `Contribution` モデルに `message String? @db.Text` 追加
- migration 追加（additive）
- `/api/contributions` POST に `message` フィールド追加・保存
- `ProfileWalletClient.tsx` の支援フォームに任意メッセージ入力を追加
- 公開プロフィールに `PublicProfileMicroTestimonials` コンポーネント追加

Sprint 15-B — Business Layer minimal: **完了**
- `Expense` モデル追加（creator / amount / category / date / note）
- `ExternalContact` に `contractStatus String?` / `contractStartAt DateTime?` 追加
- migration 追加（additive）
- Manager Desk Creator Detail に費用サマリーセクション追加
- Expense CRUD API 追加

## Phase 16（完了）

Sprint 16-A — AI Office 採択率改善ループ: **完了**
- `AgentTask` に `rejectReason String? @db.Text` フィールド追加、migration 追加
- `rejectWaitingTasks` executor が `params.note` を `rejectReason` として保存
- `serializeAgentTask` / `AgentTaskView` / `aiOfficeDashboardParsers` に `rejectReason` を伝播
- Inbox 却下フロー: `AgentTaskCard` に「却下の理由（任意）」インライン入力を実装済み確認
- 却下済みタスクの履歴カードに `rejectReason` を表示（薔薇色スニペット）
- Overview に「却下パターン分析」カード追加（RejectionPatternCard）

Sprint 16-B — Meeting Copilot phase 1: **完了**
- `upcomingMeetings` (SCHEDULED, 今日〜7日後) を readModel / readModelTypes に追加（スキーマ変更なし）
- Manager Desk Creator Detail に「ミーティングコパイロット」セクション追加
  - `MeetingCopilotCard`: 議事メモ / 決定事項 / 次のアクション の inline textarea + 「保存」「完了にして保存」ボタン
  - 「完了にして保存」後: コパイロットカードから消去し、フォローアップNote作成 CTA を自動表示
  - `onCompleted` コールバックで local state に completed ID を追跡（reload 不要）

## Phase 17（完了）

Sprint 17-A — Contact Pipeline 契約ステータス表示: **完了**
- `SerializedExternalContact` に `contractStatus: string | null` / `contractStartAt: string | null` 追加
- `serializeExternalContact` に対応フィールドを追加
- Contact Pipeline カードの "Contact Snapshot" パネルに契約バッジ + 開始日を表示

Sprint 17-B — Creator Home Expense 入力フォーム: **完了**
- `useCreatorReadyExpenses` フック新規作成（GET /api/expenses をフェッチ）
- `CreatorReadyExpenseInputSection` 新規作成（一覧 + inline 入力フォーム）
- `CreatorReadyHomeRoute` に接続（StageGrowthPlan 直後）

Sprint 17-C — AI Office Overview 履歴行からInboxタスクへジャンプ: **完了**
- `AiOfficeOverviewSection` に `onOpenTaskInInbox` prop 追加
- 「最近の作成履歴」各行を `<button>` に変更、クリックで Inbox + 該当タスクを開く
- `AiOfficePanel` で `setOpenLatestTaskType` + `setActiveView("INBOX")` に接続

## Phase 18（進行中）

Sprint 18-A — Expense Analytics: **完了**
- `CreatorReadyExpenseInputSection` に当月合計 + カテゴリ別集計バーを追加
- `buildMonthlySummary` で currency 別合計 + カテゴリ上位5件をバー表示
- 既存 `expenses` prop のみで計算（API・スキーマ変更なし）

Sprint 18-B — Contract Lifecycle UI: **完了**
- Contact Pipeline カードの契約ステータスをインライン input に変更（onBlur で PATCH）
- `isContractRenewalNeeded` で 12ヶ月以上前の contractStartAt を検出しアンバーアラート表示
- 既存 PATCH API を再利用（スキーマ変更なし）

Sprint 18-C — RevenueRecord モデル + API（承認済み）: **完了**
- `RevenueRecord` モデル追加（source / amountDecimal / currency / occurredAt / title / note）
- migration `20260327150000_add_revenue_record` 追加（additive）
- `app/api/revenue-records/route.ts` GET + POST 追加
- `useCreatorReadyRevenueRecords` フック新規作成
- `CreatorReadyRevenueSection` 新規作成（収入一覧 + inline 入力フォーム + 月次収支サマリー）
- `CreatorReadyHomeRoute` に接続（ExpenseInputSection の前）

## Phase 19（計画中）

Sprint 19-A — StageEvidence モデル（承認済み）: **完了**
- `StageEvidence` モデル追加（stageId / evidenceType / value / verifiedAt / recordedBy / notes）
- migration `20260327160000_add_stage_evidence` 追加（additive）
- `app/api/stage-evidence/route.ts` GET + POST 追加
- `useManagerDeskStageEvidence` フック + `ManagerDeskStageEvidenceSection` 新規作成
- Manager Desk Creator Detail の Creator Stage セクション直後に接続

Sprint 19-B — Public Profile Revenue Proof card: **完了**
- `getPublicRevenueProof` を `publicProfileEnhancement.ts` に追加（unstable_cache 付き）
- 通貨別総収益・最大単月収益・収益活動月数を集計
- `PublicProfileRevenueProofCard` 新規作成（RevenueRecord が存在する場合のみ表示）
- `app/[username]/page.tsx` の CreatorStageCard 直後に配置

## Phase 20（計画中）

Sprint 20-A — AI Daily Briefing v2（収支 + ステージシグナル統合）: **完了**
- `buildDailyActionPlanOutput` に今月/先月 RevenueRecord + Expense 集計クエリを追加
- 収支赤字アクション追加（`cashflow-alert`）
- AI プロンプトに今月収支・先月比・最弱成熟軸を追加
- output context に `weakestMaturityAxis / thisMonthRevenue / netCashflow / revenueTrendPct` を追加

Sprint 20-B — Contact Intelligence Alert AgentTask: **完了**
- `contactIntelligenceAlertTask.ts` executor 新規作成
  - 停滞日数・期限超過・温度感・次アクション未設定を分析して ContactRiskItem リストを生成
  - AI で全体サマリーを付加
- `CONTACT_INTELLIGENCE_ALERT` を TaskType / ALLOWED_TASK_TYPES / MANAGER candidateTaskTypes / executor / uxCopy / aiOfficeTaskConfig / AgentTaskOutputViews に登録
- 出力カード: 接点総数・要対応数・要確認数のグリッド + リスク接点リスト（insight・recommendation 付き）

## Phase 21（計画中）

Sprint 21-A — Community Trust Surface: **完了**
- `getPublicSupporterTrustSummary` を `publicProfileEnhancement.ts` に追加（unstable_cache 付き）
- 連続支援月数（`computeRecentStreak`）+ `loyal` / `recurring` バッジを Contribution 履歴から計算
- `PublicProfileSupporterTrustCard` 新規作成（継続・VIP 別カウント + アドレスチップ一覧）
- `app/[username]/page.tsx` の SupporterWall 直後に配置

Sprint 21-B — Supporter Relationship Depth: **完了**
- `SupporterCrmItem` に `consecutiveSupportMonths` / `trustScore` フィールド追加
- `getSupporterCrm` で並列 `findMany` を追加して連続月数・信頼スコア（count + consecutive×2）を計算
- `CreatorReadySupporterCrmSection` に「継続」（emerald）/ VIP（amber）バッジ + 連続月数表示
- 「信頼度順」ソートボタンを追加（trustScore 降順）

## Phase 22（完了）

Sprint 22-A — x402 Service Catalog groundwork: **完了**
- `X402ServiceSurfaceId` に `DAILY_BRIEFING_API` / `CONTACT_INTELLIGENCE_API` / `MANAGER_OPERATIONS_API` / `GROWTH_ANALYTICS_API` / `FAN_RELATIONS_API` を追加
- `X402ReadinessPhase` に `PHASE_3` を追加（Phase 20 以降タスクの課金準備フェーズ）
- 5サーフェスすべてに `readinessPhase: "PHASE_3"` + 対応 taskTypes を定義
- `getX402SurfaceForTaskType(taskType)` ヘルパーを追加

Sprint 22-B — Ecosystem Role skeleton: **完了**
- `CreatorProfile.ecosystemRole String?` フィールド追加（スキーマ変更）
- migration `20260327170000_add_ecosystem_role` 追加（additive, nullable）
- `creatorTaxonomy.ts` に `ECOSYSTEM_ROLE_OPTIONS` / `ECOSYSTEM_ROLE_LABELS` / `isEcosystemRole` 追加
- Creator Discovery ページに `ecosystemRole` フィルターチップ行を追加（creatorType と独立して絞り込み可能）
- CreatorCard にロールバッジ（violet 系）を追加

## Phase 23（完了）

Sprint 23-A — ecosystemRole 自己選択フルスタック: **完了**
- `types/creator.ts` に `ecosystemRole?: EcosystemRole | null` 追加
- `lib/serializers/creator.ts` に `serializeCreatorProfile` / `parseCreatorProfile` の ecosystemRole 変換を追加
- `app/api/creator/route.ts` PATCH に `parseEcosystemRoleOrThrow` を追加、DB 更新・シリアライズに接続
- `useMyPageProfileState` / `CreatorReadyWorkspaceContext` / `AccountPageClient` / `useAccountPageActions` / `profileApi.ts` に ecosystemRole を伝播
- `CreatorProfileEditPublicPageSection.tsx` に ecosystemRole select UI を追加

Sprint 23-B — Profile Completeness in Daily Briefing: **完了**
- `buildDailyActionPlanOutput` に `creatorProfileSnapshot`（profileText / ecosystemRole）クエリを追加
- 紹介文が空 or 20文字未満、または ecosystemRole 未設定の場合にプロフィール充実アクションを生成
- context に `missingProfileFields` を出力

## Phase 24（完了確認）

Sprint 24-A — `STAGE_GROWTH_PLAN` AgentTask: **実装済み確認**（executor / registry / UI 全て実装済み）
Sprint 24-B — `GROWTH_OPPORTUNITY_ALERT` AgentTask: **実装済み確認**（executor / registry / UI 全て実装済み）

## Phase 25（完了）

Sprint 25-A — `ProjectMember` スキーマ追加（承認済み）: **完了**
- `ProjectMember` モデル追加（projectId / creatorProfileId / walletAddress / displayName / role / sharePercent / note / status）
- `Project.projectMembers` / `CreatorProfile.projectMembers` 逆リレーション追加
- migration `20260327180000_add_project_member` 追加（additive）
- `npx prisma generate` で型を再生成

Sprint 25-B — Manager Desk ProjectMembers セクション: **完了**
- `app/api/project-members/route.ts` GET（一覧）+ POST（追加）追加
- `useManagerDeskProjectMembers.ts` フック新規作成
- `ManagerDeskProjectMembersSection.tsx` 新規作成（ロールバッジ・シェア% 表示 + インライン追加フォーム）
- Manager Desk Creator Detail の StageEvidence セクション直後に接続

## Phase 26（完了）

Sprint 26-A — 公開プロフィールに ecosystemRole / creatorType バッジ表示: **完了**
- `ProfileHero.tsx` に `creatorType` / `ecosystemRole` props を追加
- `creatorTaxonomy.ts` の CREATOR_TYPE_LABELS / ECOSYSTEM_ROLE_LABELS を使って表示名+バッジを表示
- `ProfileClient.tsx` から `creator.creatorType` / `creator.ecosystemRole` を ProfileHero に渡す
- スキーマ・API 変更なし

Sprint 26-B — 公開プロフィール チームメンバーセクション: **完了**
- `getPublicTeamMembers` を `publicProfileEnhancement.ts` に追加（unstable_cache 付き）
- `ProjectMember.status = "ACTIVE"` でプロジェクト紐付きメンバーを最大 20 件取得
- `PublicProfileTeamSection.tsx` 新規作成（ロールバッジ・シェア% 表示）
- `app/[username]/page.tsx` の SupporterTrustCard 直後に配置（メンバーが存在する場合のみ）

Sprint 26-C — `DISTRIBUTION_PLAN_DRAFT` executor が ProjectMember.sharePercent を参照: **完了**
- `DistributionPlanDraftContext` に optional `projectMembers?: DistributionPlanDraftMember[]` 追加
- `buildRowsFromMemberShares` ヘルパー追加（walletAddress と sharePercent を持つメンバーを bridgedTotalAtomic で按分）
- ソース優先度: existing_entries > saved_plan > member_share_template > bridged_total > blank
- `distributionPlanDraftTask.ts` の `buildDistributionPlanDraftTaskOutput` に `projectMembers` 引数を追加
- `agentTaskExecutors.ts` の `DISTRIBUTION_PLAN_DRAFT` executor で `prisma.projectMember.findMany` を追加して渡す
- スキーマ変更なし（すべて additive な引数追加）

## Phase 27（完了）

Sprint 27-UX — 訪問者向けパブリックプロフィール UX 強化: **完了**
- BottomNav 訪問者向け分離（`useAccount` でオーナー判定 / 未接続3タブ・接続済4タブ・オーナー5タブ）
- スティッキー「応援する」CTA（50pxスクロール後に固定バー出現、テーマカラー適用）
- セクション順序再設計（Creator Voice → 支援者 → 実績 の優先順位で再配置）
- ProfileHero カバーバナー拡大（h-20→h-40/h-48、avatar 58→76px）
- ImpactNumbers を Hero インライン統合（`PublicProfileImpactNumbersInline` → `impactContent` スロット経由）
- スクロールアンカーナビ（`PublicProfileAnchorNav`：応援する/投稿/支援者/実績 の sticky 水平タブ）
- Creator Discovery カード強化（テーマカラーバナー・支援者数・バナー重なりアバター）

Sprint 27-A — 月次収支レポート自動起票: **完了**
- `useMonthlyCashflowReportAutoTrigger.ts` 新規作成（3日以降・月1回・FINANCE agent ロール）
- `CreatorReadyHomeRoute` に接続

Sprint 27-B — Creator Home 収支ヘルスカード: **完了**
- `CreatorReadyCashflowHealthCard.tsx` 新規作成（当月収入/支出/収支 グリッド + 先月比 + AI分析リンク）
- Revenue/Expense セクション直後に配置

Sprint 27-C — Creator Home 月次収支レポート inline 表示: **完了**
- `CreatorReadyCashflowReportSection.tsx` 新規作成（StageGrowthPlanSection と同パターン）
- 当月の MONTHLY_CASHFLOW_REPORT（WAITING_APPROVAL/APPROVED）を inline 表示
- CashflowHealthCard 直後に配置

## Ready Queue

- [Manager Core Schema Proposal v0.1](/Users/shounokazuaki/cf/docs/specs/manager-desk/schema-proposal.md)
- [Creator Home first slice の完了メモ](/Users/shounokazuaki/cf/docs/tasks/todo/2026-03-creator-home-first-slice.md)
- [Manager Desk first slice の issue 分解](/Users/shounokazuaki/cf/docs/tasks/todo/2026-03-manager-desk-first-slice.md)
- [AI operational assistance on structured context](/Users/shounokazuaki/cf/docs/tasks/todo/2026-03-ai-operational-assistance-structured-context.md)
- [Manager Desk follow-up slices](/Users/shounokazuaki/cf/docs/tasks/todo/2026-03-manager-desk-follow-up-slices.md)
- [Creator Home deferred sections](/Users/shounokazuaki/cf/docs/tasks/todo/2026-03-creator-home-deferred-sections.md)
- [Meeting / Planner / follow-up minimum contract](/Users/shounokazuaki/cf/docs/tasks/todo/2026-03-meeting-planner-minimum.md)
