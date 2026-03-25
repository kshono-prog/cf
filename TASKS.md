# Tasks

## Current Focus

- **Direction Sync 完了**: Vision / Constitution / Roadmap / responsibility boundaries / Creator Home / Manager Desk / data models の文書化が揃った
- **Next Build Phase**: 人間中心の運営OSの土台を実装へ移す — Creator Home first slice / manager core models / Manager Desk dashboard
- **Planning Baseline**: 短期・中期・長期の実行計画は [Execution Plan](/Users/shounokazuaki/cf/docs/roadmap/execution-plan.md) を基準にする

## Recommended Next Execution Order

1. Creator Home first slice の issue 分解
2. `ManagerAssignment / ManagerNote / ExternalContact / ActionLog` の Prisma schema proposal
3. Manager Desk dashboard / creator detail の read model 設計
4. `Meeting / Planner / follow-up` 最小導線
5. AI Daily Briefing / note summarization / task extraction の structured-data 接続

## Active Tracks

Track 8-A — Creator Home first slice
- `Hero / Daily Briefing`
- `Project Progress` card 化
- `AI Manager` cards
- `Today / This Week`
- `Settings / Edit` collapse

Track 8-B — Manager core models and contracts
- `ManagerAssignment`
- `ManagerNote`
- `ExternalContact`
- `ActionLog`
- approval-needed Prisma change proposal

Track 8-C — Manager Desk first slice
- Dashboard
- Creator Detail
- shared read model for manager-side overview

Track 8-D — Meeting / Planner / follow-up minimum
- meeting contract
- next action handling
- shared timeline inputs

Track 8-E — AI operational assistance on structured context
- Daily Briefing
- Manager Note summarization
- follow-up extraction
- missing-items detection

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

## Ready Queue

- Creator Home first slice issue breakdown
- manager core schema draft
- Manager Desk dashboard read model
