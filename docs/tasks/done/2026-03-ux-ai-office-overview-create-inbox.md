# Task

Phase 2 UX: `AI Office` を `Overview / Create / Inbox` に分ける

## Goal

`AI Office` を 1 画面に詰め込んだ operator UI ではなく、`状況確認 / 作成 / 承認待ち確認` の3役に分けて理解しやすくする。

## Scope

- `AiOfficePanel` の top-level 構造を `Overview / Create / Inbox` に分ける
- overview に `承認待ち / 連携SNS / 最近の指標` の first view を作る
- create に `SNS 連携 / 指標更新 / task 作成` を集める
- inbox に `承認メモ / filter / bulk actions / task list` を集める

## Non-Goals

- task type を action card UI に置き換えること
- AI Office の完全リデザイン

## Files Likely Affected

- `components/mypage/AiOfficePanel.tsx`
- `components/mypage/AiOfficeOverviewSection.tsx`
- `components/mypage/AiOfficeCreateSection.tsx`
- `components/mypage/AiOfficeInboxSection.tsx`

## Acceptance Criteria

- first view で `状況 / 作成 / Inbox` の3役が分かる
- `AI Office` の top-level に mixed responsibilities が残らない
- 既存の作成 / 承認 / 却下フローを壊していない

## Validation

- `eslint`
- `npm run typecheck`
- `npm run build`

## Result

- `AiOfficePanel` を orchestration layer に寄せて、表示責務を `Overview / Create / Inbox` の3 section に分けた
- `components/mypage/AiOfficeOverviewSection.tsx` で `承認待ち / 連携SNS / 最近の指標` の first view を追加した
- `components/mypage/AiOfficeCreateSection.tsx` に `SNS 連携 / 指標更新 / task 作成` を集約した
- `components/mypage/AiOfficeInboxSection.tsx` に `承認メモ / filter / bulk actions / task list` を集約した
