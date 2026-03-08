# Task

Phase 1 UX: creatorReady の入口を日常作業ベースに整理する

## Goal

`creatorReady` の最上部を、実装都合の section ではなく `今日やること` が見える入口へ寄せる。

## Scope

- `creatorReady` 画面の first view で見せる内容を定義する
- `リンク / ガス代支援 / プロフィール編集` の現在の並び順を見直す
- `AI Office inbox` や `project/goal health` を入口候補として整理する
- `accordion を残す部分` と `top dashboard に出す部分` を分ける

## Non-Goals

- AI Office 全面リデザイン
- settlement stepper 化

## Files Likely Affected

- `components/mypage/CreatorReadyAccountView.tsx`
- `components/mypage/CreatorProjectManagementSection.tsx`
- `components/mypage/CreatorPublicLinkSection.tsx`
- `components/mypage/AiOfficeManagementSection.tsx`

## Acceptance Criteria

- creatorReady の first view の役割が決まっている
- user が最初に見るべき 3 要素が決まっている
- 次 task で UI 実装に着手できる構造案がある

## Risks

- section を増やしすぎて逆に複雑になる
- advanced 管理機能を top に残してしまう

## Validation

- docs / component 差分レビュー
- 既存 creatorReady 導線との比較確認

## Result

- `components/mypage/CreatorReadyWorkspaceOverview.tsx` を追加し、first view に `今日やること / project health / quick shortcuts` を配置した
- `CreatorReadyAccountView` の section 順を `日々の運営ワークスペース -> 公開ページとリンク -> ガス代支援` に見直した
- advanced な設定は accordion に残しつつ、first view を daily-work entry として使える形に寄せた
- `npm run build` を通した
