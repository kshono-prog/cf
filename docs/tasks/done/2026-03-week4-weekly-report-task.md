# Task

`WEEKLY_REPORT` task の初版追加

## Goal

新しい `AgentTask` を現在の registry / validator / schema / executor 基盤で追加し、拡張性を実地で確認する。

## Scope

- `WEEKLY_REPORT` task type を追加する
- input validator を追加する
- output schema を追加する
- executor を追加する
- API から起票できるようにする
- 可能なら UI で最低限表示する

## Non-Goals

- 自動投稿
- PDF 出力
- 外部送信

## Files Likely Affected

- `lib/agentTaskParsers.ts`
- `lib/agentTaskExecutors.ts`
- `lib/agentTasks.ts`
- `app/api/agent/tasks/route.ts`
- `components/mypage/AiOfficePanel.tsx`

## Acceptance Criteria

- `WEEKLY_REPORT` を起票できる
- validator / schema / executor が揃っている
- 既存 task type を壊していない

## Risks

- output schema の粒度が曖昧なまま増える
- UI 側の表示が task type ごとに散らかる

## Validation

- `npm run lint`
- `npx tsc --noEmit`
- task 作成の手動確認

## Result

- `WEEKLY_REPORT` task type を registry に追加した
- validator / output schema / executor を task definition に揃えた
- mypage の `AI Office` から起票できるようにした
- task type ごとの output 表示に `WEEKLY_REPORT` の描画を追加した
- `npx eslint lib/agentTaskParsers.ts lib/agentTaskExecutors.ts components/mypage/AiOfficePanel.tsx app/api/agent/tasks/route.ts` を通した
- `npx tsc --noEmit` を通した
- `npm run build` を通した
