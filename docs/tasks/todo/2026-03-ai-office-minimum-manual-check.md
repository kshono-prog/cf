# Task

AI Office: minimum manual check を実画面で完了する

## Goal

`AI Office` の minimum manual check を実画面で 1 周回し、`notes.md` と screenshot を artifact に残す。

## Scope

- [`docs/runbooks/ai-office-manual-check.md`](/Users/shounokazuaki/cf/docs/runbooks/ai-office-manual-check.md) の `最短確認` を実施する
- [`docs/runbooks/artifacts/ai-office-manual-check/2026-03-18/links.md`](/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/2026-03-18/links.md) を使って deep link を開く
- `01` から `04` の minimum screenshot を保存する
- [`docs/runbooks/artifacts/ai-office-manual-check/2026-03-18/notes.md`](/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/2026-03-18/notes.md) の checklist とメモを更新する
- 必要なら [`docs/runbooks/artifacts/ai-office-manual-check/2026-03-18/status.md`](/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/2026-03-18/status.md) を更新して進捗を確認する

## Non-Goals

- full manual check の task 全体を回すこと
- UI 改修や copy 修正
- `Finance Agent` や settlement handoff の詳細確認

## Files Likely Affected

- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/2026-03-18/notes.md`
- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/2026-03-18/status.md`
- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/2026-03-18/01-settings-ai-office-entry.png`
- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/2026-03-18/02-create-manager-task.png`
- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/2026-03-18/03-manager-task-created.png`
- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/2026-03-18/04-manager-task-detail.png`

## Acceptance Criteria

- minimum screenshot 4 枚が artifact に存在する
- `notes.md` の `Minimum Checklist` が実施内容に合わせて更新されている
- `Manager Agent` の作成から detail 表示まで、人が迷わず辿れるかのメモが残っている
- `manual-check:ai-office:status` が screenshot と checklist を正しく集計する

## Risks

- 実画面確認なので wallet 状態や seed data によって見え方がぶれる
- screenshot があっても `notes.md` の checklist が更新されないと進捗が読みづらい

## Validation

- `npm run manual-check:ai-office:minimum -- --base-url http://127.0.0.1:3001 --username <username>`
- `npm run manual-check:ai-office:status -- --date <YYYY-MM-DD>`
- 実画面で `Manager Agent` を作成し、detail が開くこと

