# Task

Phase 1 UX: NoUser / UserOnly の導線を checklist ベースに整理する

## Goal

`ユーザー登録` と `クリエイター申請` を別画面の断片ではなく、1本の導線として理解できるようにする。

## Scope

- `NoUser` に登録理由と次に開く画面の説明を追加する
- `UserOnly` を `現在地 / 次にやること / 申請` の順へ並び替える
- `CreatorApplyCard` の前後文脈を強くする
- empty / success / warning 文言の見直しを行う

## Non-Goals

- creatorReady の全 section 改修
- backend の申請ロジック変更

## Files Likely Affected

- `components/mypage/NoUserMyPageView.tsx`
- `components/mypage/UserOnlyMyPageView.tsx`
- `components/mypage/UserRegistrationForm.tsx`
- `components/mypage/UserUpdateForm.tsx`
- `components/mypage/CreatorApplyCard.tsx`

## Acceptance Criteria

- 初見で `登録 -> 更新 -> 申請` の順が理解できる
- `UserOnly` に primary CTA が明確にある
- 申請前に必要な準備がわかる

## Risks

- 説明を増やしすぎてフォームが重くなる
- 申請導線の主張が強すぎて更新導線が埋もれる

## Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `NoUser -> UserOnly -> creator apply` の手動確認

## Result

- `NoUser` を `登録理由 -> Step 2 フォーム` の順に整理した
- `UserOnly` を `現在地 -> 登録情報更新 -> クリエイター申請` の順に整理した
- `UserRegistrationForm` / `UserUpdateForm` / `CreatorApplyCard` の文言を次アクション中心に見直した
- `npm run build` を通した
