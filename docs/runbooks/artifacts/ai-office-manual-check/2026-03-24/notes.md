# AI Office Manual Check Notes

- 実施日: 2026-03-24
- 確認者:
- 対象 creator: `kazu`
- 実施セット: `minimum`
- 保存先: `docs/runbooks/artifacts/ai-office-manual-check/2026-03-24/`
- 事前スモーク確認:
  - 実行済み: `npm run manual-check:ai-office:smoke -- --base-url http://127.0.0.1:3001 --username kazu`
  - 結果: `mypage / daily-work / settings / supporters / advanced` の 5 route が 200 で応答し、SSR loading shell と route marker を確認
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

### ワークスペース導線
- [ ] `/<username>/mypage` で `ホーム` が初期表示される
- [ ] `/<username>/mypage/daily-work` で同じ `ホーム` を開ける
- [ ] `/<username>/mypage/settings` で `設定` を開ける
- [ ] ヘッダーの `ホーム / 設定` でビューを切り替えられる

### AIアシスタント
- [ ] `ホーム` の上部付近に `AIアシスタント` パネルが見える
- [ ] `作成` で `Manager Agent` が選べる
- [ ] `Manager Agent の次アクションを整理する` を作成できる
- [ ] `ホーム` の最近の作成履歴または `受信トレイ` で detail を開ける
- [ ] `受信トレイ` の role chip で絞り込める
- [ ] role を選んだ `作成 / 受信トレイ` の URL をリロードしても文脈が維持される
- [ ] `最近使った role 導線` と `最近コピーした role link` が必要に応じて見える

### 後方互換
- [ ] `/<username>/mypage/supporters` で `ホーム` に入れる
- [ ] `/<username>/mypage/advanced` で `設定` に入れる

## Machine-Checked Preflight

- [x] `npm run manual-check:ai-office:smoke -- --base-url http://127.0.0.1:3001 --username kazu`
- [x] `/<username>/mypage` (home initial view)
- [x] `/<username>/mypage/daily-work`
- [x] `/<username>/mypage/settings`
- [x] `/<username>/mypage/supporters` (compat redirect)
- [x] `/<username>/mypage/advanced` (compat redirect)
- [x] local dev の route readiness が通る
- [ ] hydrated UI の task detail / screenshot は未確認

## Memo

- `links.md` を横に置いて、deep link とスクリーンショット名を見ながら確認する
- `Finance Agent` と `配分と精算 -> Draft` の確認は full セットで回す
