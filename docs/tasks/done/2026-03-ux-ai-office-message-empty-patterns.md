# Task

Phase 2 UX: `AI Office` の success / empty / error 表示パターンを揃える

## Goal

`Overview / Create / Inbox` をまたいで、状態メッセージと empty state の見え方を統一し、初見でも意味が読み取りやすい UI にする。

## Scope

- `AI Office` の status message を共通 notice component に揃える
- `Overview / Create / Inbox` の empty state を共通 card pattern に揃える
- success / error / info のトーンを message copy から判定できるようにする

## Non-Goals

- settlement への横展開
- AI Office の全面リデザイン

## Files Likely Affected

- `components/mypage/AiOfficePanel.tsx`
- `components/mypage/AiOfficeOverviewSection.tsx`
- `components/mypage/AiOfficeCreateSection.tsx`
- `components/mypage/AiOfficeInboxSection.tsx`
- `components/mypage/AiOfficeFeedback.tsx`
- `lib/uxCopy.ts`

## Acceptance Criteria

- `Overview / Create / Inbox` の top-level message が同じ notice pattern で表示される
- empty state が section ごとにバラバラな box style にならない
- message copy から `success / error / info` が判別できる

## Validation

- `eslint`
- `npm run typecheck`
- `npm run build`

## Result

- `components/mypage/AiOfficeFeedback.tsx` を追加し、notice と empty state の共通 UI を定義した
- `lib/uxCopy.ts` に `getAiOfficeMessageState()` を追加して、message copy を `success / error / info` 付きで扱えるようにした
- `Overview / Create / Inbox` の empty state を同じ card pattern に置き換えた
