# Task

Phase 2 UX: shared feedback pattern を `settlement` と `mypage` に広げる

## Goal

`AI Office` で揃えた notice / empty state の見え方を `settlement` と `mypage` にも広げ、画面ごとに message の見え方が変わりすぎないようにする。

## Scope

- generic な feedback component を追加する
- `settlement` の top-level message / empty state を共通 pattern に揃える
- `mypage` の主要 view (`NoUser`, `UserOnly`, `creatorReady`, `loading`, `unconnected`) の error / info 表示を共通 pattern に揃える

## Non-Goals

- `settlement` の guided stepper 化
- `mypage` 全面リデザイン

## Files Likely Affected

- `components/mypage/WorkspaceFeedback.tsx`
- `components/mypage/ProjectSettlementPanel.tsx`
- `components/mypage/ProjectSettlementExecutionLogsSection.tsx`
- `components/mypage/ProjectSettlementCctpSection.tsx`
- `components/mypage/ProjectSettlementManualResultSection.tsx`
- `components/mypage/NoUserMyPageView.tsx`
- `components/mypage/UserOnlyMyPageView.tsx`
- `components/mypage/CreatorReadyAccountView.tsx`

## Acceptance Criteria

- `settlement` の message / empty state が `AI Office` と近い見え方になる
- `mypage` の主要 error box が同じ notice pattern になる
- 今後 `Gas support` や他画面へも広げられる generic component 名になっている

## Validation

- `eslint`
- `npm run typecheck`
- `npm run build`

## Result

- `components/mypage/WorkspaceFeedback.tsx` を追加し、generic な notice / empty-state component を定義した
- `settlement` の top-level message と主要 empty state を共通 pattern に寄せた
- `mypage` の主要 view で error / info 表示を同じ notice pattern に揃えた
