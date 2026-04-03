# UXP-1: Public Surface の認証導線と文言を揃える

**Surface**: public profile / notifications / feed
**Status**: 完了（2026-04-03）
**依存**: UXA-1, UXA-2

---

## Goal

公開面で「接続済みだが未認証」の状態が generic error に見えないようにし、
必要なときだけアプリ認証を案内する。

---

## Scope

- notifications で未認証時に専用 guide を表示
- community / feed で「初回の操作時だけ認証が必要」と分かる補助文を追加
- auth failure / signature cancel を generic error ではなく意味のある文言に寄せる

---

## Non-Goals

- 投稿 / フォロー / 返信の権限仕様変更
- public layout の大規模 redesign
- contribution / settlement 導線の挙動変更

---

## Files Likely Affected

```
components/social/NotificationsPageClient.tsx
components/profile/CreatorCommunityCard.tsx
components/feed/CreatorFeedSection.tsx
lib/communityUiState.ts
```

---

## Acceptance Criteria

- [x] notifications 未認証時に generic error ではなく認証導線が出る
- [x] public feed / community で「必要なときだけ認証」が伝わる
- [x] 署名キャンセル時の文言が以前より意味の分かるものになる

---

## Risks

- viewer の登録状態と auth 状態を混同すると案内文が不正確になる
- public surface に auth copy を入れすぎると supporter 導線を邪魔する

---

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

手動確認:

- notifications で接続済み・未認証の表示
- public profile でフォロー前の案内文
- feed の like / reply 操作前後の notice
