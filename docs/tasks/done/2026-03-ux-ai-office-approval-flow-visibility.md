# Task

Phase 2 UX: `AI Office` の承認待ち導線をさらに強くする

## Goal

`承認待ち` が `Inbox` を開いたときだけ見える状態ではなく、`Overview / Create / Inbox` のどこにいても次に確認すべきものとして認識できるようにする。

## Scope

- `Overview` から `Inbox` へ移る導線を強化する
- `Create` で新しい下書きを増やす前に承認待ちへ気づけるようにする
- `Inbox` で最短の処理手順を見せる

## Non-Goals

- 承認フロー API の変更
- 完全な guided wizard 化

## Files Likely Affected

- `components/mypage/AiOfficePanel.tsx`
- `components/mypage/AiOfficeOverviewSection.tsx`
- `components/mypage/AiOfficeCreateSection.tsx`
- `components/mypage/AiOfficeInboxSection.tsx`
- `components/mypage/AiOfficeFeedback.tsx`

## Acceptance Criteria

- `Overview` と `Create` にいても承認待ち件数へ気づける
- `Inbox` で一括操作前の最短手順が読み取れる
- 既存の承認 / 却下フローを壊さない

## Validation

- `eslint`
- `npm run typecheck`
- `npm run build`

## Result

- `AiOfficePanel` に global approval notice を追加し、`Overview / Create` から直接 `Inbox` へ移れるようにした
- `AiOfficeCreateSection` に承認待ちの差し込み案内を追加した
- `AiOfficeInboxSection` に選択状態に応じた guidance notice を追加し、最短手順を見せるようにした
