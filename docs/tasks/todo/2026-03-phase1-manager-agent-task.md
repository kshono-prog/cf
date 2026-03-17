# Task

Phase 1A: `Manager Agent` を AI Office の保存可能な task として追加する

## Goal

現在の next action suggestion を一時的な UI 表示だけで終わらせず、`AgentTask` として保存・承認・履歴参照できるようにする。

## Scope

- `Manager Agent` 用の task contract を定義する
- parser / executor / output renderer を追加する
- summary から next actions を task output に変換する
- AI Office から起票または低リスクな内部起票ができるようにする
- docs と tests を更新する

## Non-Goals

- 自動実行
- 新しい資金移動ロジック
- x402 決済実装

## Files Likely Affected

- `lib/agentTaskParsers.ts`
- `lib/agentTaskExecutors.ts`
- `lib/agentTasks.ts`
- `components/mypage/AgentTaskOutputViews.tsx`
- `components/mypage/AiOfficePanel.tsx`
- `lib/creator-ai/nextActionSuggestions.ts`

## Acceptance Criteria

- `Manager Agent` の recommendation task を作成できる
- task output に suggested next actions と evidence が含まれる
- AI Office inbox / history で既存 task type と同様に見える

## Risks

- 既存 task model に recommendation 型を足すことで renderer が複雑化する
- suggestion と task output が二重管理になる可能性がある

## Validation

- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- AI Office で create / inbox / history を手動確認
