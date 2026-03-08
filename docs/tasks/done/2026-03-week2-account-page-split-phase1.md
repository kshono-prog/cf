# Task

AccountPageClient 分割 Phase 1

## Goal

`AccountPageClient` の責務を大きな機能単位に分け、今後の AI 開発で安全に編集できる構造にする。

## Scope

- state を機能単位で分類する
- profile / project / settlement / ai office の境界を明文化する
- 最初の切り出し単位を1つ実装する

## Non-Goals

- 全セクションの完全分割
- UI デザイン変更

## Files Likely Affected

- `app/[username]/mypage/AccountPageClient.tsx`
- `components/mypage/*`
- `lib/mypage/*`

## Acceptance Criteria

- 分割境界が説明できる
- 少なくとも1領域が切り出される
- 現状より責務が軽くなる

## Risks

- state 依存が多く、分割単位を誤ると逆に複雑化する
- 手動確認範囲が広い

## Validation

- `npm run lint`
- `npx tsc --noEmit`
- mypage の主要導線確認

## Result

- `creatorReady` 表示を `components/mypage/CreatorReadyAccountView.tsx` に切り出した
- `summary / currency / goal` 系の型を `lib/mypage/accountPageTypes.ts` に共通化した
- `AccountPageClient` は状態管理と API 呼び出しの責務へ少し寄った
- 既存の未使用 state / handler warning は Week 3 で解消する前提で残した
