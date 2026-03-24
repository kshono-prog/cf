# AI Office Manual Check Notes

- 実施日: 2026-03-24
- 確認者: Codex (headless assist)
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
- `?manualCheck=1` で creatorReady の local bootstrap が効き、`AIアシスタント` パネルまで hydrated state を出せるようになった
- `aiOfficeView=CREATE&aiOfficeRole=MANAGER` の deep link で、`作成` と `Manager Agent` を first paint から合わせられるようになった
- 違和感があった文言や UI:
- headless Chrome の capture では browser chrome が入らないため、runbook 理想形の「URL / active tab が見える screenshot」にはまだ届かない
- `Manager Agent の次アクションを整理する` の作成自体は local API seed で補助しており、実 click での end-to-end は引き続き人手で 1 周見たい
- エラーコード:
- 一言評価: local manual check の下地は整い、hydrated home / create / inbox-detail の状態確認までは進められた
- 次に直したい点: 実ブラウザ window を安定制御して、URL bar 付き screenshot と click-based create を 1 周で残せるようにする

## Minimum Checklist

### ワークスペース導線
- [x] `/<username>/mypage` で `ホーム` が初期表示される
- [ ] `/<username>/mypage/daily-work` で同じ `ホーム` を開ける
- [ ] `/<username>/mypage/settings` で `設定` を開ける
- [ ] ヘッダーの `ホーム / 設定` でビューを切り替えられる

### AIアシスタント
- [x] `ホーム` の上部付近に `AIアシスタント` パネルが見える
- [x] `作成` で `Manager Agent` が選べる
- [ ] `Manager Agent の次アクションを整理する` を作成できる
- [ ] `ホーム` の最近の作成履歴または `受信トレイ` で detail を開ける
- [ ] `受信トレイ` の role chip で絞り込める
- [x] role を選んだ `作成 / 受信トレイ` の URL をリロードしても文脈が維持される
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
- [x] hydrated UI の home / create / inbox-detail screenshot を headless Chrome で取得

## Memo

- `links.md` を横に置いて、deep link とスクリーンショット名を見ながら確認する
- `Finance Agent` と `配分と精算 -> Draft` の確認は full セットで回す
- `MANAGER_NEXT_ACTIONS` は `x-cf-dev-owner-address` header 付き local API seed で 1 件作成してから detail deep link を開いた
- `aiOfficeView / aiOfficeRole / aiOfficeInboxRole / aiOfficeOpenLatestTaskType` は server 初期値でも反映するように更新した
