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
- output は `taskType -> renderer` で表示する
- structured view に失敗した場合だけ raw JSON fallback を出す

## 今後の追加ルール

新しい task type を追加するときは次を同時に更新する。

1. `lib/agentTaskParsers.ts`
2. `lib/agentTaskExecutors.ts`
3. `components/mypage/AgentTaskOutputViews.tsx`
4. `components/mypage/AiOfficePanel.tsx`
5. `components/mypage/aiOfficeTaskConfig.ts`
6. この spec
