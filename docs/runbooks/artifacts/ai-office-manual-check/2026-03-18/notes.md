# AI Office Manual Check Notes

- 実施日: 2026-03-18
- 確認者:
- 対象 creator:
- 実施セット: `minimum`
- 保存先: `docs/runbooks/artifacts/ai-office-manual-check/2026-03-18/`
- 事前スモーク確認:
  - `npm run manual-check:ai-office:smoke -- --base-url http://127.0.0.1:3000 --username <username>`
- 取得したスクリーンショット:
  - `01-settings-ai-office-entry.png`
  - `02-create-manager-task.png`
  - `03-manager-task-created.png`
  - `04-manager-task-detail.png`
- 確認した task:
  - `MANAGER_NEXT_ACTIONS`
- 期待どおりだった点:
- 違和感があった文言や UI:
- エラーコード:
- 一言評価:
- 次に直したい点:

## Minimum Checklist

- [ ] `/<username>/mypage#ai-office-phase1` で settings の `AI事務所（Phase1）` 入口が見える
- [ ] panel 見出しは `AI事務所（Role-Based Phase1）` になっている
- [ ] `下書きを作る` で `Manager Agent` が選べる
- [ ] `Manager Agent の次アクションを整理する` を作成できる
- [ ] `承認待ち` または `最近作った内容` で detail を開ける
- [ ] role chip で絞り込める
- [ ] role を選んだ `Create / Inbox` の URL をリロードしても文脈が維持される
- [ ] `最近使った role 導線` と `最近コピーした role link` が必要に応じて見える

## Memo

- `Finance Agent` と `配分と精算 -> Draft` の確認は full セットで回す
- `DISTRIBUTION_PLAN_DRAFT` は対象 currency の project / summary / settlement 文脈があるときに確認する
