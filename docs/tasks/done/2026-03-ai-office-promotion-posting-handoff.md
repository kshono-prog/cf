# Task

AI Office: Promotion / Fan Relation output を posting compose に handoff する

## Goal

`Finance Agent -> settlement Draft` と同じ考え方で、`Promotion Agent` の output を approval-only で posting compose に渡せるようにし、`Fan Relation Agent` は copy-only の境界を明示する。

## Scope

- `ANNOUNCEMENT_DRAFT` を posting compose に渡す handoff を設計する
- `SUPPORTER_MESSAGE_DRAFT` の handoff 可否と UI 境界を決める
- advisory payload の shape と local handoff の保存方法を決める
- support-page の posting composer で payload を受け取る導線を追加する

## Non-Goals

- 自動投稿
- 投稿の自動公開
- 外部SNS投稿

## Files Likely Affected

- `/Users/shounokazuaki/cf/components/mypage/AgentTaskOutputViews.tsx`
- `/Users/shounokazuaki/cf/components/mypage/CreatorReadySupportPageRoute.tsx`
- `/Users/shounokazuaki/cf/components/mypage/PostComposerCard.tsx`
- `/Users/shounokazuaki/cf/docs/specs/creator-ai-office/task-output-contracts.md`
- `/Users/shounokazuaki/cf/docs/runbooks/ai-office-manual-check.md`

## Acceptance Criteria

- `ANNOUNCEMENT_DRAFT` から posting compose を開き、下書き payload を確認できる
- 自動保存や自動公開は行われない
- support-page の既存 posting 導線を壊さない
- `SUPPORTER_MESSAGE_DRAFT` は public posting compose へは直接 handoff せず、copy-only で境界を保つ

## Risks

- `Fan Relation Agent` の文面をそのまま public posting に流すと用途がぶれる可能性がある
- compose handoff が複数 role に広がると payload shape が散らばりやすい

## Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- handoff 後も posting compose の通常入力が壊れていないこと
