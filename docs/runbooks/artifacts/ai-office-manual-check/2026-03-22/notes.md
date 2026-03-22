# AI Office Manual Check Notes

- 実施日: 2026-03-22
- 確認者:
- 対象 creator: `kazu`
- 実施セット: `minimum`
- 保存先: `docs/runbooks/artifacts/ai-office-manual-check/2026-03-22/`
- 事前スモーク確認:
  - 未実行
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

### Phase 2 ナビゲーション（2-mode workspace）
- [ ] `/<username>/mypage` で `今日の作業` ビュー（daily-work）が表示される
- [ ] `/<username>/mypage/daily-work` で同じ daily-work ビューが表示される
- [ ] `/<username>/mypage/settings` で `設定・準備` ビューが表示される
- [ ] ヘッダーの `今日の作業` / `設定・準備` ボタンで切り替えができる

### AI事務所 パネル（daily-work ビュー内）
- [ ] AI事務所パネルが daily-work ビューのトップ付近に見える
- [ ] `下書きを作る` で `Manager Agent` が選べる
- [ ] `Manager Agent の次アクションを整理する` を作成できる
- [ ] `承認待ち` または `最近作った内容` で detail を開ける
- [ ] role chip で絞り込める

### 活動サマリー（daily-work ビュー内）
- [ ] `活動サマリー` カードが AI事務所パネルの下に表示される
- [ ] `支援進捗` に avgProgressPct% が表示される
- [ ] `投稿数` に postCount または `—` が表示される

### 後方互換
- [ ] `/<username>/mypage/supporters` にアクセスして daily-work ビューに遷移する
- [ ] `/<username>/mypage/advanced` にアクセスして settings ビューに遷移する

## Machine-Checked Preflight

- [ ] `npm run manual-check:ai-office:smoke -- --base-url http://127.0.0.1:3000 --username kazu`
- [ ] `/<username>/mypage` (daily-work initial view)
- [ ] `/<username>/mypage/daily-work`
- [ ] `/<username>/mypage/settings`
- [ ] `/<username>/mypage/supporters` (compat redirect)
- [ ] `/<username>/mypage/advanced` (compat redirect)
- [ ] local dev の route readiness が通る
- [ ] hydrated UI の task detail / screenshot は未確認

## Memo

- `links.md` を横に置いて、deep link とスクリーンショット名を見ながら確認する
- `Finance Agent` と `配分と精算 -> Draft` の確認は full セットで回す
