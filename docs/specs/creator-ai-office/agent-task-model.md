# Agent Task Model

## 目的

`AgentTask` を、AI事務所機能の中核データモデルとして扱う。

## 現時点の task type

| Task Type | 担当ロール | 入力主材料 | 出力 | metrics依存 |
|---|---|---|---|---|
| `MANAGER_NEXT_ACTIONS` | MANAGER | projectSummary, settlement | suggestedActions, projectSnapshot | なし |
| `DISTRIBUTION_PLAN_DRAFT` | FINANCE | projectSummary, settlement | draftPayload (配分比率と金額) | なし |
| `ANALYZE` | MANAGER / FINANCE | contentMetricSnapshot | keyInsights, nextActions, metrics | あり（0件でも可） |
| `PROPOSE` | PROMOTION | contentMetricSnapshot | proposals, metricsHint | 任意 |
| `TRANSLATE` | PROMOTION | text, from, to | translations | なし |
| `WEEKLY_REPORT` | MANAGER / FINANCE | contentMetricSnapshot, contribution集計 | highlights, actionItems, metricsSummary, supportSummary | あり（0件でも可） |
| `ANNOUNCEMENT_DRAFT` | PROMOTION | creatorProfile, project, contribution集計 | subject, body, callToAction | 任意 |
| `SUPPORTER_MESSAGE_DRAFT` | FAN_RELATION | creatorProfile, project, contribution集計 | subject, body, closing | 任意 |

## 将来追加候補

- `PROFILE_UPDATE_PROPOSAL` — プロフィール更新提案（MANAGER role）

## 期待する責務

`AgentTask` は次を持つ。

- 何を依頼したか
- 何を根拠にしたか
- いまどの状態か
- 誰が承認したか
- 最終出力が何か
- 履歴がどう変化したか

## 標準状態

- `QUEUED`
- `RUNNING`
- `WAITING_APPROVAL`
- `DONE`
- `FAILED`

将来必要なら追加:

- `CANCELED`
- `REJECTED`

## 標準入力

共通 input に含めたいもの:

- `creatorProfileId`
- `projectId`
- `requestedBy`
- `context`
- `constraints`
- `sourceRefs`

## 標準出力

出力は task type ごとの schema を持つが、最低限これを揃える。

- `summary`
- `basedOn`
- `nextActions`
- `artifacts`

## 監査ログ

最低限の action:

- `CREATED`
- `STARTED`
- `WAITING_APPROVAL`
- `APPROVED`
- `REJECTED`
- `DONE`
- `FAILED`

## 実装ファイル構成

```
app/api/agent/tasks/route.ts        — GET/POST/PATCH ハンドラ（task type 分岐なし）
lib/agentTaskExecutors.ts           — TASK_DEFINITIONS registry（type → validator+executor）
lib/agentTaskParsers.ts             — output parsing helpers
lib/agentTaskAudit.ts               — 監査ログ記録
lib/creator-ai/agentRoleRegistry.ts — role → 許可 task type / boundary 定義
lib/creator-ai/*Task.ts             — 個別 executor 実装
```

## 実装方針

- route handler に task type の分岐を増やしすぎない
- `TASK_DEFINITIONS` registry に `{ validator, executor }` を登録するパターンを維持する
- parser / executor / presenter を分ける
- task type 追加時の変更パターンを固定する（下記テンプレート）

## 新 task type 追加テンプレート

1. `AgentTaskType` enum に追加（Prisma schema、要承認）
2. `agentRoleRegistry.ts` で許可 role に追加
3. input parser を `lib/creator-ai/<name>Task.ts` に実装
4. output builder を同ファイルに実装
5. `TASK_DEFINITIONS` registry に登録（`lib/agentTaskExecutors.ts`）
6. output contract を `docs/specs/creator-ai-office/task-output-contracts.md` に追記
7. AI Office Create UI に起票カードを追加（`aiOfficeTaskConfig.ts`）
8. Inbox の output renderer に追加（`aiOfficeOutputRenderer.ts`）
9. spec・domain-model を更新
10. manual check runbook に検証ステップを追加

## metrics の扱い方針

- `ANALYZE` と `WEEKLY_REPORT` は metrics が主材料
- `ANNOUNCEMENT_DRAFT` と `SUPPORTER_MESSAGE_DRAFT` は metrics なしでも成立させる
- metrics が 0 件でも task は失敗ではなく「材料不足」として graceful に返す
- UI は空データを失敗扱いにしない（`docs/specs/metrics/metrics-pipeline.md` 参照）
