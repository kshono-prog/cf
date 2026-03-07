# Task

AccountPageClient の責務分割

## Goal

`app/[username]/mypage/AccountPageClient.tsx` を機能ごとの単位に分け、AI が安全に編集できる構造へ寄せる。

## Scope

- 状態管理のまとまりを洗い出す
- profile / project / ai office / settlement の境界を定義する
- hook または subcomponent の切り出し方針を決める

## Non-Goals

- UI デザインの全面変更
- すべての state 最適化

## Files Likely Affected

- `app/[username]/mypage/AccountPageClient.tsx`
- `components/mypage/*`
- `lib/mypage/*`

## Acceptance Criteria

- 分割方針が明文化されている
- 最初の分割単位が1つ以上着手可能
- 既存機能の責務境界が説明できる

## Risks

- 画面が大きく、分割中に回帰しやすい
- API 依存が複数セクションに跨っている

## Validation

- `npm run lint`
- `npx tsc --noEmit`
- mypage の主要導線の手動確認

