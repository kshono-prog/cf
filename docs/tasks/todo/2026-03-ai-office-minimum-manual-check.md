# Task

AI Office: minimum manual check を実画面で完了する

## Goal

`AI Office` の minimum manual check を実画面で 1 周回し、`notes.md` と screenshot を artifact に残す。

## Scope

- [`docs/runbooks/ai-office-manual-check.md`](/Users/shounokazuaki/cf/docs/runbooks/ai-office-manual-check.md) の `最短確認` を実施する
- `docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/links.md` を使って deep link を開く
- local dev では生成された deep link の `?manualCheck=1` をそのまま使う
- task detail が見つけにくい場合は `aiOfficeOpenLatestTaskType=MANAGER_NEXT_ACTIONS` 付き deep link で最新 Manager task を直接開いてよい
- `01` から `04` の minimum screenshot を保存する
- `docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/notes.md` の checklist とメモを更新する
- 必要なら `docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/status.md` を更新して進捗を確認する
- 現在の UI ラベル `ホーム / 作成 / 受信トレイ` と panel 見出し `AIアシスタント` に沿って screenshot と notes を残す

## Non-Goals

- full manual check の task 全体を回すこと
- UI 改修や copy 修正
- `Finance Agent` や settlement handoff の詳細確認

## Files Likely Affected

- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/notes.md`
- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/status.md`
- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/01-settings-ai-office-entry.png`
- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/02-create-manager-task.png`
- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/03-manager-task-created.png`
- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/04-manager-task-detail.png`

## Acceptance Criteria

- minimum screenshot 4 枚が artifact に存在する
- `notes.md` の `Minimum Checklist` が実施内容に合わせて更新されている
- `Manager Agent` の作成から detail 表示まで、人が迷わず辿れるかのメモが残っている
- friction があれば `Observation / Why it matters / Expected / Severity` の形式で 1 から 3 件に絞って残っている
- `manual-check:ai-office:status` が screenshot と checklist を正しく集計する

## Risks

- 実画面確認なので wallet 状態や seed data によって見え方がぶれる
- screenshot があっても `notes.md` の checklist が更新されないと進捗が読みづらい

## Validation

- `npm run manual-check:ai-office:minimum -- --base-url http://127.0.0.1:3001 --username <username>`
- `npm run manual-check:ai-office:status -- --date <YYYY-MM-DD>`
- 実画面で `ホーム -> 作成 -> Manager Agent` を辿り、必要なら `Manager Agent Detail` deep link も使って detail が開くこと
