# Task

AI Office: full manual check を実画面で完了する

## Goal

`AI Office` の full manual check を実画面で回し、`Finance / Promotion / Fan Relation / approval flow / posting metrics` の違和感を artifact に残す。

## Scope

- `TRANSLATE`
- `WEEKLY_REPORT`
- `ANNOUNCEMENT_DRAFT`
- `SUPPORTER_MESSAGE_DRAFT`
- `DISTRIBUTION_PLAN_DRAFT`
- `posting metrics`
- `approval flow`
- full screenshot の取得と `notes.md` メモ更新

## Non-Goals

- その場で UI 修正まで入れること
- x402 や automation の追加
- bridge / distribution 実行仕様の変更

## Files Likely Affected

- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/notes.md`
- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/status.md`
- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/08-translate-detail.png`
- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/09-weekly-report-detail.png`
- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/10-announcement-detail.png`
- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/11-supporter-message-detail.png`
- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/12-posting-metrics-before.png`
- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/13-posting-metrics-after.png`
- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/14-settlement-plan-draft-json.png`
- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/15-settlement-plan-draft-applied.png`
- `/Users/shounokazuaki/cf/docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/16-finance-task-detail.png`

## Acceptance Criteria

- full manual check の対象 task について screenshot と簡易所感が残っている
- `Finance Agent -> settlement Draft` の handoff が実画面で確認できている
- `posting metrics` 更新導線の文言差とわかりやすさがメモに残っている
- approval flow の role chip / reload / bulk action に違和感があれば具体例つきで残っている

## Risks

- project / summary / settlement 文脈が足りないと `DISTRIBUTION_PLAN_DRAFT` が fallback になる
- posting data が少ないと `WEEKLY_REPORT` や告知文案の体感差が出にくい

## Validation

- `npm run manual-check:ai-office:minimum -- --base-url http://127.0.0.1:3001 --username <username>`
- 実画面で full セットを 1 周
- `notes.md` と screenshot の見比べ

