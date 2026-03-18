# Task

AI Office: usefulness metrics を成果寄りに拡張する

## Goal

`承認された / 却下された / 保留が長い` だけでなく、`そのあと実際に使われたか` まで見えるようにして、AI Office の価値をより実務寄りに測れるようにする。

## Scope

- `Finance Agent` の draft が `行に反映` まで進んだかを計測する設計を決める
- `Promotion Agent` の draft が posting compose へ handoff されたかを計測する設計を決める
- usefulness summary の event 名と read model を整理する
- schema を増やさずに済むかを先に検討する

## Non-Goals

- metrics を見て自動で task order を変えること
- bridge / distribution 実行結果との直接連動
- x402 や billable API の導入

## Files Likely Affected

- `/Users/shounokazuaki/cf/lib/aiOfficeDashboard.ts`
- `/Users/shounokazuaki/cf/lib/agentTaskAudit.ts`
- `/Users/shounokazuaki/cf/components/mypage/AiOfficeOverviewSection.tsx`
- `/Users/shounokazuaki/cf/docs/specs/creator-ai-office/overview.md`
- `/Users/shounokazuaki/cf/docs/specs/creator-ai-office/task-output-contracts.md`

## Acceptance Criteria

- `follow-through` をどう定義するかが role ごとに文書化されている
- 既存 usefulness summary を壊さずに拡張できる設計がある
- schema 変更が必要なら、その影響と rollback が明示されている

## Risks

- 追いたい成果を増やしすぎると event 設計が散らばる
- UI handoff と実作業完了を混同すると、誤った指標になりやすい

## Validation

- docs / design review
- 実装に入る場合は `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`

