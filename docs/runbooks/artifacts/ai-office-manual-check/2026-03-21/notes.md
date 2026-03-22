# AI Office Manual Check Notes

- 実施日: 2026-03-21
- 確認者: Codex
- 対象 creator: `kazu`
- 実施セット: `minimum`
- 保存先: `docs/runbooks/artifacts/ai-office-manual-check/2026-03-21/`
- 事前スモーク確認:
  - 実行済み: `npm run manual-check:ai-office:smoke -- --base-url http://127.0.0.1:3002 --username kazu`
  - 結果: `mypage / supporters / support-page / advanced` の 4 route が 200 で応答し、SSR loading shell と route marker を確認
  - 補足: 既存の `http://127.0.0.1:3001` は local server 状態の影響で 500 を返したため、この記録は `3002` の clean dev server を基準にした
- 取得したスクリーンショット:
  - 今回は未取得
  - `01-settings-ai-office-entry.png`
  - `02-create-manager-task.png`
  - `03-manager-task-created.png`
  - `04-manager-task-detail.png`
- 確認した task:
  - 今回は hydrated UI の実操作までは未実施
  - code review と local route smoke を使って minimum finding を絞った
- 期待どおりだった点:
  - `manual-check:ai-office:minimum` の artifact 作成と事前スモークはそのまま再利用できた
  - `mypage / supporters / support-page / advanced` の 4 route は local dev で安定して応答した
  - `Overview / Create / Inbox` の3ビューと承認待ち件数の source は code path 上で追える状態だった
- 違和感があった文言や UI:
  - `Create` 画面では承認待ち案内が 2 から 3 箇所で重複する。panel 上部の全体 notice、Create 内の全体 notice、選択 role の notice が同時に見えるため、どこから処理すべきか迷いやすい
  - `Create` の `1. 投稿の状況を確認する` は全 task 共通の最初の step になっており、`Manager / Finance` 系でも投稿前提の流れに見えやすい
  - settings section の `提案を確認する` CTA は AI Office Inbox ではなく `/supporters` へ飛ぶため、AI Office 内で承認待ちを確認したい意図と少しずれる
- エラーコード:
  - 今回の最終確認ではなし
- 一言評価:
  - minimum の shortlist は作れる状態。最優先は `Create` の承認待ち notice 重複を減らして、次の行動を 1 つに見せること
- 次に直したい点:
  - `done`: `Create` 画面の重複した承認待ち notice を減らす
  - `done`: `AIアシスタント / AI事務所` の呼称を product docs と UI で揃える
  - `done`: settings の `提案を確認する` CTA を AI Office Inbox へ寄せる
  - `done`: 投稿系以外の task で `投稿の状況を確認する` step の見せ方を調整する

## Shortlisted Findings

1. `Create` 画面で承認待ち案内が多重表示される
   - Severity: `medium`
   - Action: `done`
   - Why: panel 上部の全体 notice と role 単位 notice がすでにあるため、Create 内の全体 notice が重なると行動が分散する
2. `AIアシスタント` と `AI事務所` の呼称が docs / UI で揺れている
   - Severity: `medium`
   - Action: `done`
   - Why: runbook と実画面で用語が一致しないと manual check と改善議論がぶれやすい
3. `Create` の step 1 が全 task に対して投稿前提に見える
   - Severity: `low`
   - Action: `done`
   - Why: `Manager / Finance` task でも投稿の有無が最初に来るため、AI Office の使い始めで遠回りに感じやすい
4. settings の `提案を確認する` CTA が AI Office Inbox ではなく `/supporters` へ遷移する
   - Severity: `low`
   - Action: `done`
   - Why: section の文脈では AI Office 内で承認待ちを開く期待が強い

## Minimum Checklist

- [ ] `/<username>/mypage#ai-office-phase1` で settings の `AI事務所` 入口が見える
- [ ] panel 見出しは `AI事務所` になっている
- [ ] `下書きを作る` で `Manager Agent` が選べる
- [ ] `Manager Agent の次アクションを整理する` を作成できる
- [ ] `承認待ち` または `最近作った内容` で detail を開ける
- [ ] role chip で絞り込める
- [ ] role を選んだ `Create / Inbox` の URL をリロードしても文脈が維持される
- [ ] `最近使った role 導線` と `最近コピーした role link` が必要に応じて見える

## Machine-Checked Preflight

- [x] `npm run manual-check:ai-office:smoke -- --base-url http://127.0.0.1:3002 --username kazu`
- [x] `/<username>/mypage`
- [x] `/<username>/mypage/supporters`
- [x] `/<username>/mypage/support-page`
- [x] `/<username>/mypage/advanced`
- [x] local dev の route readiness が通る
- [ ] hydrated UI の tab / task detail / screenshot は未確認

## Memo

- `links.md` を横に置いて、deep link とスクリーンショット名を見ながら確認する
- `Finance Agent` と `配分と精算 -> Draft` の確認は full セットで回す
