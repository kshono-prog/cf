# AI Office Manual Check Notes

- 実施日: 2026-03-18
- 確認者: Codex
- 対象 creator: `kazu`
- 実施セット: `minimum`
- 保存先: `docs/runbooks/artifacts/ai-office-manual-check/2026-03-18/`
- 事前スモーク確認:
  - 実行済み: `npm run manual-check:ai-office:smoke -- --base-url http://127.0.0.1:3001 --username kazu`
  - 結果: `mypage / supporters / support-page / advanced` の 4 route が 200 で応答し、SSR loading shell と route marker を確認
- 取得したスクリーンショット:
  - 今回は未取得
  - `01-settings-ai-office-entry.png`
  - `02-create-manager-task.png`
  - `03-manager-task-created.png`
  - `04-manager-task-detail.png`
- 確認した task:
  - 今回は task 実行そのものではなく、manual-check 前提の route / SSR smoke を確認
- 期待どおりだった点:
  - `AI Office` manual-check の対象 route が local dev で 500 にならず開ける状態まで戻せた
  - `mypage / supporters / support-page / advanced` の 4 route で smoke が通った
  - `manual-check:ai-office:smoke` を runbook の事前確認として再利用できる状態になった
- 違和感があった文言や UI:
  - SSR smoke では hydrated UI 文言までは確認できないため、`Role-Based Phase1` の tab 文言や task detail の見え方は未確認
- エラーコード:
  - 今回の最終 smoke 実行ではなし
  - 途中で解消した既知不具合: dev で `app/favicon.ico` が原因の `500 Internal Server Error`
- 一言評価:
  - `manual-check` の事前確認としては使えそう。実画面キャプチャと hydrated UI 確認はまだ人手が必要
- 次に直したい点:
  - `minimum` セットの実画面キャプチャを取得する
  - `MANAGER_NEXT_ACTIONS` の作成から detail 表示までを実操作で 1 周確認する

## Minimum Checklist

- [ ] `/<username>/mypage#ai-office-phase1` で settings の `AI事務所（Phase1）` 入口が見える
- [ ] panel 見出しは `AI事務所（Role-Based Phase1）` になっている
- [ ] `下書きを作る` で `Manager Agent` が選べる
- [ ] `Manager Agent の次アクションを整理する` を作成できる
- [ ] `承認待ち` または `最近作った内容` で detail を開ける
- [ ] role chip で絞り込める
- [ ] role を選んだ `Create / Inbox` の URL をリロードしても文脈が維持される
- [ ] `最近使った role 導線` と `最近コピーした role link` が必要に応じて見える

## Machine-Checked Preflight

- [x] `npm run manual-check:ai-office:smoke -- --base-url http://127.0.0.1:3001 --username kazu`
- [x] `/<username>/mypage`
- [x] `/<username>/mypage/supporters`
- [x] `/<username>/mypage/support-page`
- [x] `/<username>/mypage/advanced`
- [x] local dev の route readiness が通る
- [ ] hydrated UI の tab / task detail / screenshot は未確認

## Memo

- `Finance Agent` と `配分と精算 -> Draft` の確認は full セットで回す
- `DISTRIBUTION_PLAN_DRAFT` は対象 currency の project / summary / settlement 文脈があるときに確認する
- local dev の smoke は SSR route-readiness 確認まで。`minimum` の完了には実画面操作とキャプチャ取得が必要
