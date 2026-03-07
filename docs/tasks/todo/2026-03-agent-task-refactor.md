# Task

AgentTask 基盤の責務整理と拡張しやすい分割準備

## Goal

`app/api/agent/tasks/route.ts` に集中している task type 分岐を、今後の AI事務所化に耐える形へ寄せる。

## Scope

- 現状の task type と状態を棚卸しする
- parser / output builder / status handling の責務分割方針を決める
- route の分割候補を決める
- spec と decision を同期する

## Non-Goals

- すべての task type 実装を作り直す
- 自動実行まで入れる

## Files Likely Affected

- `app/api/agent/tasks/route.ts`
- `lib/translation.ts`
- `docs/specs/creator-ai-office/agent-task-model.md`

## Acceptance Criteria

- 現在の task type が明文化されている
- 拡張時テンプレートが docs にある
- 次の分割タスクが切れる

## Risks

- 既存 task の互換性を壊す可能性
- route handler の整理だけで終わり、実益が薄くなる可能性

## Validation

- `npm run lint`
- `npx tsc --noEmit`
- task 作成 / 一覧取得 / 更新の既存挙動確認

