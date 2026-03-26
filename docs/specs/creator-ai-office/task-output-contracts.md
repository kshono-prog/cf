# Task Output Contracts

## 目的

`AgentTask` の task type ごとの input / output / metrics 依存を固定し、UI と executor の判断基準を揃える。

## 共通 input

すべての task は最低限次を持つ。

- `source`
- `requestedAt`

必要に応じて次を追加する。

- `reportingWindowDays`
- `tone`
- `channel`
- `purpose`
- `includeMetricsSummary`
- `includeSupportSummary`

## 共通 output

すべての task は最低限次を持つ。

- `summary`
- `basedOn`

task type によって、本文系・分析系・補助項目を追加する。

## Task Contracts

### `MANAGER_NEXT_ACTIONS`

input:

- `source`
- `requestedAt`

output:

- `summary`
- `suggestedActions[]`
- `evidence`
- `projectSnapshot`
- `basedOn`

metrics 依存:

- なし
- ただし `Project / Goal / Summary / Distribution` の summary view を利用する

fallback:

- `projectId` がない、または summary が取得できない場合でも task 自体は失敗させない
- その場合は `suggestedActions` を空にし、summary 不足を伝える文面を返す

### `DISTRIBUTION_PLAN_DRAFT`

input:

- `source`
- `requestedAt`

output:

- `summary`
- `draftPayload`
- `projectSnapshot`
- `basedOn`

metrics 依存:

- なし
- `Project / Goal / Summary / Settlement / Distribution Entries` を利用する

fallback:

- `projectId` や summary / settlement が不足しても task 自体は失敗させない
- その場合は `draftPayload` なしで、安全な fallback summary を返す

### `TRANSLATE`

input:

- `text`
- `from`
- `to`

output:

- `summary`
- `translations[]`
- `basedOn`

metrics 依存:

- なし

fallback:

- input 不正時は validator で reject する

### `WEEKLY_REPORT`

input:

- `reportingWindowDays`

output:

- `summary`
- `reportingPeriod`
- `highlights[]`
- `actionItems[]`
- `metricsSummary`
- `supportSummary`
- `basedOn`

metrics 依存:

- `ContentMetricSnapshot`
- `Contribution` 集計

fallback:

- metrics がない状態も正常
- その場合は `metrics が不足している` 前提の summary / action を返す

### `ANNOUNCEMENT_DRAFT`

input:

- `channel`
- `tone`
- `reportingWindowDays`
- `includeMetricsSummary`
- `includeSupportSummary`

output:

- `summary`
- `headline`
- `channel`
- `body`
- `callToAction`
- `supportingPoints[]`
- `basedOn`

metrics 依存:

- `ContentMetricSnapshot` を任意利用
- `Contribution` を任意利用
- `Project.title / Project.description`

fallback:

- metrics なしでも生成する
- 支援データなしでも告知文として成立させる

### `SUPPORTER_MESSAGE_DRAFT`

input:

- `purpose`
- `tone`
- `reportingWindowDays`
- `includeMetricsSummary`
- `includeSupportSummary`

output:

- `summary`
- `audience`
- `purpose`
- `subject`
- `body`
- `closing`
- `supportingPoints[]`
- `basedOn`

metrics 依存:

- `Contribution` を優先利用
- `ContentMetricSnapshot` は任意利用
- `Project.title`

fallback:

- 支援件数が少ないときもメッセージが破綻しない
- `REENGAGEMENT` では依頼口調に寄りすぎない

## UI Rules

- task type ごとに必要な input だけ表示する
- 情報整理系 task は作成後すぐに確認できる
- 下書き系 task は review を挟むかどうかを creator が選べる
- output は `taskType -> renderer` で表示する
- structured view に失敗した場合だけ raw JSON fallback を出す

## Structured Advisory Payloads

### Posting Compose Handoff Payload

`ANNOUNCEMENT_DRAFT` は local handoff で `posting compose` に渡せる。

payload:

- `sourceTaskType`
- `projectId`
- `channel`
- `summary`
- `payloadText`
- `createdAt`

UI rules:

- handoff は `support-page#posting-compose` に移動し、textarea と project select の初期値に使う
- 自動保存や自動公開はしない
- `ANNOUNCEMENT_DRAFT` — `posting compose を開く` と `本文をコピー` を出す
- `SUPPORT_STORY_DRAFT` — `compose に送る` と `ストーリーをコピー` を出す
- `PROPOSE` — 各提案に `compose に送る` ボタンを出す
- `SUPPORTER_MESSAGE_DRAFT` は支援者向け文面のため、public posting compose には直接 handoff しない（copy のみ）
- `SUPPORTER_MESSAGE_DRAFT` の copy は `TASK_OUTPUT_COPIED` を audit に残す
- `PROPOSE / TRANSLATE / ANNOUNCEMENT_DRAFT / SUPPORT_STORY_DRAFT` で `posting compose` を開いたら `TASK_POSTING_COMPOSE_OPENED` を audit に残す

### Distribution Plan Draft Payload

Phase 1B の settlement draft builder と `DISTRIBUTION_PLAN_DRAFT` task は、同じ reviewable advisory payload を共有する。

payload:

- `version`
- `projectId`
- `projectTitle`
- `projectStatus`
- `currency`
- `generatedAt`
- `source`
- `summary`
- `rows[]`
- `notes[]`

UI rules:

- payload は JSON textarea で確認・編集できる
- `DISTRIBUTION_PLAN_DRAFT` task output では preview と `Draft step` への handoff に使う
- local handoff には `sourceTaskId` を含め、どの task の提案かを `Draft step` 側で辿れるようにする
- `行に反映` は `rows[]` を既存の draft editor に流し込むだけで、自動保存しない
- 実際に `rows[]` が `Draft step` に反映された時点で `TASK_SETTLEMENT_DRAFT_APPLIED` を audit に残す
- bridge / distribution execute には接続しない
- token は現在の settlement currency に揃える

### `PROFILE_UPDATE_PROPOSAL`

input:

- `source`
- `requestedAt`

output:

- `summary`
- `profileSnapshot` — displayName / hasProfileText / hasAvatar / hasExternalUrl / hasCreatorType / socialLinkCount
- `proposals[]` — field / priority (high|medium|low) / reason / suggestionNote
- `nextActions[]`
- `missingFields[]`
- `basedOn`

metrics 依存:

- なし
- `CreatorProfile` と `CreatorSocialLink` のみを参照する

fallback:

- プロフィールが取得できない場合は空の proposals を返す
- 全フィールド揃っている場合は「改善提案なし」として返す

UI rules:

- copy-only — public posting compose には直接 handoff しない
- 提案は priority badge 付きカードで表示する
- profileSnapshot は「揃っている / 未設定」のチップで視覚化する

### `DAILY_ACTION_PLAN`

input:

- `source`
- `requestedAt`

output:

- `summary`
- `actions[]` — id / title / reason / priority (high|medium|low) / category
- `generatedAt`
- `context` — daysSinceLastPost / pendingApprovals / recentContributionCount
- `basedOn`

metrics 依存:

- `Post` 最終投稿日
- `AgentTask` 承認待ちカウント
- `Contribution` 直近 7 日集計
- `Goal` 期限確認

fallback:

- 全 context が 0 件でも action を最低 2 件生成する
- デフォルト提案 (propose-next) で補完する

UI rules:

- priority badge 付きカードで表示する
- approval category は赤、posting は amber

### `ACTIVITY_RESTART_PROPOSAL`

input:

- `source`
- `requestedAt`

output:

- `summary`
- `inactivityContext` — daysSinceLastPost / inactivityNote
- `successPatterns[]`
- `restartSteps[]` — step / title / description / effort (low|medium|high)
- `supportContext` — recentContributionCount / recentTotal
- `basedOn`

metrics 依存:

- `Post` 最終投稿日・過去エンゲージメント
- `Contribution` 直近 30 日集計
- `Goal` 達成状況

fallback:

- 過去投稿がない場合も最低 2 ステップを生成する

### `SUPPORT_STORY_DRAFT`

input:

- `source`
- `requestedAt`

output:

- `summary`
- `storyText` — full narrative text
- `sections` — why / what / progress
- `context` — creatorLabel / projectLabel / currency / confirmedAmount / targetAmount / progressPct / contributionCount / purposes[]
- `basedOn`

metrics 依存:

- `Project.description`
- `Purpose[]`
- `Goal` 達成状況
- `Contribution` 集計

fallback:

- Project がない場合は汎用文面を生成する

UI rules:

- 3 セクション (why/what/progress) を個別に表示する
- storyText 全体を posting compose に handoff できる（`SUPPORT_STORY_DRAFT` sourceTaskType）
- ストーリーのコピーボタンも提供する

### `SUPPORTER_RESULT_REPORT`

input:

- `source`
- `requestedAt`

output:

- `summary`
- `goalLabel`
- `achievedAt`
- `currency`
- `totalAmount`
- `purposeBreakdown[]` — purposeLabel / confirmedAmount / contributionCount
- `distributionNote`
- `activityAfterNote`
- `basedOn`

metrics 依存:

- `Project.title / Project.currency`
- `Goal` 達成状況
- `Purpose[]` と `Contribution` の purposeId 別集計
- `DistributionRun` 件数
- `Post` 件数（Goal 達成後）

fallback:

- `projectId` が指定されていない場合は「プロジェクト未指定」の summary を返す
- AI 生成不可時はルールベースの summary にフォールバックする

UI rules:

- 用途別棒グラフ形式で purposeBreakdown を表示する
- goalLabel / achievedAt / totalAmount をカードヘッダーに表示する

### `CAREER_PLAN_DRAFT`

input:

- `source`
- `requestedAt`

output:

- `summary`
- `currentPhase` — 活動初期 / 活動継続期 / 成長期 / 定着期
- `milestones_3mo[]`
- `milestones_6mo[]`
- `focusAreas[]`
- `weeklyPace`
- `context` — publishedPostCount90Days / weeklyPostRate / achievedGoalCount / recentContributionCount / recentContributionTotal / totalViews / totalInteractions / topPlatform
- `basedOn`

metrics 依存:

- `Post` 過去 90 日集計（公開件数・週次ペース）
- `Goal` 達成件数
- `Contribution` 過去 90 日集計
- `ContentMetricSnapshot` 過去 90 日（platform 別 views / interactions）

fallback:

- metrics が少ない場合もフェーズ判定はゼロ件データで実行し、AI または rule-based でマイルストーンを生成する

UI rules:

- 現在フェーズをバッジで表示する
- 3ヶ月・6ヶ月マイルストーンをタイムライン形式で表示する

### `GROWTH_OPPORTUNITY_ALERT`

input:

- `source`
- `requestedAt`

output:

- `summary`
- `opportunities[]` — type / title / insight / action / priority (high|medium|low)
- `metricsContext` — hasData / recentWindowDays / platforms[]
- `basedOn`

metrics 依存:

- `ContentMetricSnapshot` 直近 7 日（recent）と 7〜14 日前（previous）を比較
- platform 別 interaction rate の週次変化率（≥15% 成長 = growing）

fallback:

- データが 0 件の場合は「指標データなし」の opportunity を 1 件生成する

UI rules:

- priority badge 付きカードで opportunities を表示する
- insight / action を視覚的に分離する

### `MEETING_AGENDA_DRAFT`

input:

- `source`
- `requestedAt`
- `meetingId` (optional) — 特定会議の ID。省略時は直近ノート・会議履歴から生成する
- `purpose` (optional) — 会議の目的メモ

output:

- `summary` — この会議アジェンダの概要一文
- `agenda[]` — `{ id, title, durationMinutes, notes }` の配列
- `preReadItems[]` — 事前確認推奨事項のリスト
- `decisionsNeeded[]` — この会議で決めるべき事項のリスト
- `context` — `{ meetingId, meetingTitle, recentNoteCount, recentMeetingCount }`
- `basedOn`

metrics 依存:

- `ManagerNote` 直近 14 日 / 最大 5 件
- 直近完了 `Meeting` 最大 3 件
- 会議 `meetingId` が指定された場合はその会議の title / agenda / decisions を参照

fallback:

- meetingId なし・ノートなしでも汎用アジェンダを生成する

UI rules:

- 番号付きカードでアジェンダ項目を表示する（`{n}. title — Xmin`）
- preReadItems / decisionsNeeded は独立リストで表示する

### `CONTACT_OUTREACH_DRAFT`

input:

- `source`
- `requestedAt`
- `contactId` (optional) — 連絡先 ExternalContact の ID
- `purpose` (optional) — 連絡目的を一文で
- `tone` (optional) — `"formal"` | `"professional"` | `"friendly"`（default: `"professional"`）

output:

- `summary` — この連絡の目的を一文で
- `draftMessage` — 実際のメッセージ本文（300 文字程度）
- `tone` — 使用したトーン
- `keyPoints[]` — 押さえるべきポイントのリスト
- `followUpSuggestion` — 返信がない場合のフォローアップ提案
- `context` — `{ contactId, contactLabel, purpose, recentNoteCount }`
- `basedOn`

metrics 依存:

- `ExternalContact` の status / temperature / contactType / notes
- `ManagerNote` 直近 30 日 / 最大 3 件（contactId が指定された場合はその接点に絞る）
- `CreatorProfile` の displayName / creatorType / profileText

fallback:

- contactId なしでも汎用連絡文を生成する
- AI 失敗時はルールベースの下書き + keyPoints を返す

UI rules:

- 下書き本文を `<pre>` 相当のブロックで表示する
- keyPoints をリスト表示する
- followUpSuggestion を補足カードで表示する

## Posting Compose Handoff の sourceTaskType

`TRANSLATE` も `ANNOUNCEMENT_DRAFT` と同様に `sourceTaskType: "TRANSLATE"` で compose handoff できる。
翻訳案ごとに「compose に送る」ボタンを提供し、言語を指定して posting compose に事前入力する。

`SUPPORT_STORY_DRAFT` は storyText 全体を compose のひな形として handoff できる。
`PROPOSE` は各提案テキストを compose のひな形として handoff できる。

handoff できる sourceTaskType:

- `"ANNOUNCEMENT_DRAFT"` — headline + body + callToAction を結合したテキスト
- `"TRANSLATE"` — 指定言語の翻訳テキスト
- `"SUPPORT_STORY_DRAFT"` — storyText 全体
- `"PROPOSE"` — 提案テキスト 1 件

## 今後の追加ルール

新しい task type を追加するときは次を同時に更新する。

1. `lib/agentTaskParsers.ts`
2. `lib/agentTaskExecutors.ts`
3. `components/mypage/AgentTaskOutputViews.tsx`
4. `components/mypage/AiOfficePanel.tsx`
5. `components/mypage/aiOfficeTaskConfig.ts`
6. この spec
