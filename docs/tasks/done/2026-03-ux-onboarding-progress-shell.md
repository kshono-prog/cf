# Task

Phase 1 UX: onboarding progress shell を導入する

## Goal

`NoUser -> UserOnly -> creatorReady` の流れを step と次アクションで見せる共通 shell を作る。

## Scope

- onboarding step の定義を決める
- `NoUserMyPageView` と `UserOnlyMyPageView` に共通 progress 表示を入れる
- current step / next step / 完了条件の表示パターンを決める
- creatorReady 到達時の完了表現を決める

## Non-Goals

- creatorReady 全体の再設計
- フォーム項目の全面変更

## Files Likely Affected

- `components/mypage/NoUserMyPageView.tsx`
- `components/mypage/UserOnlyMyPageView.tsx`
- `components/mypage/MyPageShell.tsx`
- `components/mypage/*`（新規 onboarding progress component を含む）

## Acceptance Criteria

- `NoUser` と `UserOnly` に同じ onboarding step 文脈が出る
- 今どの段階かが一目でわかる
- 次に何をすると先へ進むかが表示される

## Risks

- 見た目だけ stepper になり、行動の意味が伝わらない
- creatorReady 到達後の文脈につながらない

## Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `NoUser -> UserOnly` の手動確認

## Result

- `components/mypage/MyPageOnboardingProgress.tsx` を追加し、共通の onboarding step 表示を導入した
- `NoUserMyPageView` と `UserOnlyMyPageView` の先頭に現在地と次アクションを追加した
- `npm run build` を通した
