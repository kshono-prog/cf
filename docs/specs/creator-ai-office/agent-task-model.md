# Agent Task Model

## 目的

`AgentTask` を、AI事務所機能の中核データモデルとして扱う。

## 現時点の task type

- `MANAGER_NEXT_ACTIONS`
- `DISTRIBUTION_PLAN_DRAFT`
- `ANALYZE`
- `PROPOSE`
- `TRANSLATE`
- `WEEKLY_REPORT`
- `ANNOUNCEMENT_DRAFT`
- `SUPPORTER_MESSAGE_DRAFT`

## 将来追加候補

- `PROFILE_UPDATE_PROPOSAL`

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

## 実装方針

- route handler に task type の分岐を増やしすぎない
- parser / executor / presenter を分ける
- task type 追加時の変更パターンを固定する

## 追加時テンプレート

1. task type 定義
2. input parser
3. output builder
4. audit action
5. API route 接続
6. UI 起票導線
7. 履歴表示
8. spec 更新
