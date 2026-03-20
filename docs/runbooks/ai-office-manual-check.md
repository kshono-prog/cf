# AI Office Manual Check

## 目的

`AiOfficePanel` と主要 `AgentTask` の手動確認を、短時間で再現できる形にする。
実画面キャプチャを残し、あとから UI の差分と文言の変化を追える状態にする。

## 対象

- `DISTRIBUTION_PLAN_DRAFT`
- `MANAGER_NEXT_ACTIONS`
- `TRANSLATE`
- `WEEKLY_REPORT`
- `ANNOUNCEMENT_DRAFT`
- `SUPPORTER_MESSAGE_DRAFT`

## 前提

- ウォレット接続済み
- 対象 creator に `walletAddress` がある
- `mypage` に入れる
- 可能なら project が1つ以上ある
- `DISTRIBUTION_PLAN_DRAFT` と `配分と精算 -> Draft` の確認では、対象 currency に project があり、summary と settlement panel を開ける状態だと望ましい
- 外部SNS連携は不要
- metrics を使う確認では `Creator Founding` 内の投稿が1件以上あると望ましい

## キャプチャ保存ルール

- 保存先の目安は `docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/`
- 1回の確認で `minimum` と `full` のどちらを実施したかメモする
- 同じ画面を撮り直した場合は末尾に `-v2`, `-v3` を付ける
- スクリーンショットには URL、active tab、主要見出しが入るようにする

## 違和感メモの残し方

- `minimum` では 1 から 3 件、`full` では 3 から 5 件の高信号な違和感に絞る
- 1 件ごとに次の形式で `notes.md` に残す

```md
- Screen:
- State:
- Observation:
- Why it matters:
- Expected:
- Severity: low / medium / high
```

- その場で大きく直し始めず、まずは `copy / CTA / notice / approval flow / handoff` に分類する
- `wallet / bridge / distribution` の仕様変更が必要そうなら、所感だけ残して別 task に切る

## 最小キャプチャセット

1. `01-settings-ai-office-entry.png`
   `AI事務所` 見出し、`概要 / 下書きを作る / 承認待ち` が見えている
2. `02-create-manager-task.png`
   `下書きを作る` タブ、`2. 役割から選ぶ`、`Manager Agent`、`Manager Agent の次アクションを整理する`、`この内容で作成` が見えている
3. `03-manager-task-created.png`
   `承認待ち` 件数または `最近作った内容` に task が増えた状態が見えている
4. `04-manager-task-detail.png`
   task detail の `summary / suggested actions / evidence` が見えている
5. `05-approval-queue.png`
   `承認待ち` タブで対象 task が見えている
6. `06-approval-result.png`
   承認または却下後の status 変化が見えている
7. `07-inbox-role-filter.png`
   `承認待ち` タブで role chip による絞り込みが見えている

## フルキャプチャセット

- `08-translate-detail.png`
  `TRANSLATE` task の結果を開いた状態
- `09-weekly-report-detail.png`
  `WEEKLY_REPORT` task の結果を開いた状態
- `10-announcement-detail.png`
  `ANNOUNCEMENT_DRAFT` task の結果を開いた状態
- `11-supporter-message-detail.png`
  `SUPPORTER_MESSAGE_DRAFT` task の結果を開いた状態
- `12-posting-metrics-before.png`
  `投稿・AI事務所` 側で投稿数や指標更新前の状態が見えている
- `13-posting-metrics-after.png`
  `Creator Founding の投稿指標を更新` 後の状態が見えている
- `14-settlement-plan-draft-json.png`
  `配分と精算 -> Draft` で `AI 下書き (JSON)` と `行に反映` が見えている
- `15-settlement-plan-draft-applied.png`
  AI 下書きを行へ反映した後の draft rows が見えている
- `16-finance-task-detail.png`
  `DISTRIBUTION_PLAN_DRAFT` task の preview と `settlement Draft を開く` が見えている

## 事前準備

0. 必要なら artifact と deep link を先に作る
   - `npm run manual-check:ai-office:prepare -- --base-url http://127.0.0.1:3000 --username <username>`
   - `docs/runbooks/artifacts/ai-office-manual-check/<YYYY-MM-DD>/links.md` が生成される
   - `prepare` と `smoke` をまとめて流す場合は `npm run manual-check:ai-office:minimum -- --base-url http://127.0.0.1:3000 --username <username>`
   - `minimum` は `notes.md` の `事前スモーク確認` と `Machine-Checked Preflight` も更新する
   - 途中経過を見たいときは `npm run manual-check:ai-office:status -- --date <YYYY-MM-DD>` で `status.md` を更新する
1. `npm run dev` を起動する
2. 対象 creator の [`/[username]/mypage`] を開く
3. 設定画面の [`AI事務所`](/Users/shounokazuaki/cf/components/mypage/SettingsPageClient.tsx) セクション、または [`/[username]/mypage/supporters`] を開く
4. 画面上部の `概要 / 下書きを作る / 承認待ち` のうち、まず `下書きを作る` を開く
5. `2. 役割から選ぶ` で `Manager Agent` を選ぶ
6. `MANAGER_NEXT_ACTIONS` は投稿がなくても確認できる
7. 告知文案や週次レポートの精度も見たい場合は、先に Creator Founding 内で1件投稿してから、`下書きを作る` タブの `Creator Founding の投稿指標を更新` または `概要` タブの `内部指標を更新する` を押す

任意の事前スモーク確認:

- `npm run manual-check:ai-office:smoke -- --base-url http://127.0.0.1:3000 --username <username>`
- この確認では `mypage / supporters / support-page / advanced` が 200 を返し、SSR の loading shell と `initialWorkspaceView` が route ごとに正しいかを見る
- `manual-check:ai-office:prepare` で作られる `links.md` を横に置くと、`minimum` の deep link とスクリーンショット順を追いやすい
- `manual-check:ai-office:minimum` は `prepare -> smoke -> 開始URLの出力` までを 1 回で行う
- `manual-check:ai-office:status` は `notes.md` の checklist と screenshot 置き場を見て、残作業を `status.md` にまとめる

補足:

- settings 画面の section title と panel 見出しは `AI事務所`
- top-level tab のユーザー向けラベルは `概要 / 下書きを作る / 承認待ち`
- 承認待ち件数の主な確認場所は `概要` の notice と `承認待ち` タブであり、ヘッダー右上の重複バッジには依存しない
- 投稿を増やしたい場合は `/<username>/mypage/support-page#posting-compose` を開く
- AI事務所だけ確認したい場合は `/<username>/mypage#ai-office-phase1` でよい
- task の detail は `承認待ち` または `最近作った内容` から開く

再訪や共有に使いやすい deep link 例:

- `Manager Agent の Create`:
  - `/<username>/mypage?aiOfficeView=CREATE#ai-office-phase1`
- `Promotion Agent の Create`:
  - `/<username>/mypage?aiOfficeView=CREATE&aiOfficeRole=PROMOTION#ai-office-phase1`
- `Finance Agent の Create`:
  - `/<username>/mypage?aiOfficeView=CREATE&aiOfficeRole=FINANCE#ai-office-phase1`
- `Finance Agent の Inbox`:
  - `/<username>/mypage?aiOfficeView=INBOX&aiOfficeRole=FINANCE&aiOfficeInboxRole=FINANCE#ai-office-phase1`
- `Fan Relation Agent の Inbox`:
  - `/<username>/mypage?aiOfficeView=INBOX&aiOfficeRole=FAN_RELATION&aiOfficeInboxRole=FAN_RELATION#ai-office-phase1`

## 最短確認

1. `/[username]/mypage#ai-office-phase1` を開く
2. `AI事務所` の中で `下書きを作る` を開く
3. `Manager Agent` を選び、task が `Manager Agent の次アクションを整理する` になっていることを確認する
4. `公開前に承認する` をオンのまま `この内容で作成` を押す
5. `承認待ち` に件数が増えるか、`概要` の `最近作った内容` に task が増えることを確認する
6. 必要なら `承認待ち` で role chip を切り替え、対象 role だけに絞れることを確認する
7. `下書きを作る` に戻り、選択中 role に承認待ちがある場合は、その role の `承認待ちを見る` 導線が出ることを確認する
8. role で絞った `承認待ち` または role を選んだ `下書きを作る` の URL をリロードし、同じ tab / role のまま再開できることを確認する
9. `概要` または `承認待ち` に `最近使った role 導線` が出て、`最終利用` と必要なら `承認待ち` 件数が見えることを確認する
10. `保留が長い` または `承認待ち` がある role の shortcut が先頭寄りに出て、必要なら `先に確認` と分かることを確認する
11. その shortcut から、同じ role の `承認待ち` と `下書きを作る` の両方へ移動できることを確認する
12. その shortcut に `Inbox リンクをコピー` と `Create リンクをコピー` の両方が出ることを確認する
13. いずれかの link をコピーすると、`最近コピーした role link` が `概要` または `承認待ち` に出て、同じ文脈を開き直したり再コピーしたりできることを確認する
14. `01-settings-ai-office-entry.png` から `04-manager-task-detail.png` までを保存する

ここまでできれば、Phase 1A の基本動作は確認できています。

## チェック 7: Distribution Plan Draft

この確認は、対象 currency に project があり、`配分と精算` の `Step 2. Draft` を開ける前提で行う。

1. `/<username>/mypage/advanced` を開く
2. `配分と精算` から対象 currency の `Step 2. Draft` を開く
3. `AI 下書き (JSON)` の `AI 下書きを作る` を押す
4. JSON が生成されたら、必要なら `memo` や `amountAtomic` を軽く編集する
5. `行に反映` を押す
6. 既存の配分 row editor に内容が反映されることを確認する
7. 必要なら `14-settlement-plan-draft-json.png` と `15-settlement-plan-draft-applied.png` を保存する

期待結果:

- JSON 生成だけでは保存や実行は行われない
- `行に反映` のあとで初めて draft row editor が更新される
- 反映後も creator は各 row を手動編集できる
- 既存の `配分下書きを保存` ボタンの owner / wallet 前提は変わらない

## チェック 8: Finance Agent -> Distribution Plan Draft

この確認は、対象 currency の project / summary / settlement 文脈があり、`DISTRIBUTION_PLAN_DRAFT` が fallback ではなく payload を返せる前提で行う。

1. `下書きを作る` を開き、`Finance Agent` を選ぶ
2. task type が `配分 plan 下書きを作る` になっていることを確認する
3. `この内容で作成` を押す
4. `承認待ち` または `最近作った内容` から task を開く
5. `summary / rows preview / notes / settlement Draft を開く` が見えることを確認する
6. `settlement Draft を開く` を押す
7. `/<username>/mypage/advanced#settlement-plan-<currency>` に移動し、`AI 下書き (JSON)` に内容が自動で入ることを確認する
8. 必要なら `16-finance-task-detail.png` と `14-settlement-plan-draft-json.png` を保存する

期待結果:

- `DISTRIBUTION_PLAN_DRAFT` task は structured view で表示される
- AI Office から advanced へ移動しても、自動保存や自動実行は起きない
- `AI 下書き (JSON)` に advisory payload が入り、creator が内容を確認してから `行に反映` できる

## チェック 1: MANAGER_NEXT_ACTIONS

1. `下書きを作る` を開き、`Manager Agent` を選ぶ
2. `Manager Agent の次アクションを整理する` が選択されていることを確認する
3. `この内容で作成` を押す
4. `承認待ち` または `最近作った内容` から task を開く
5. project がある場合は、現在の summary に沿った next action が出るか確認する
6. `02-create-manager-task.png` `03-manager-task-created.png` `04-manager-task-detail.png` を保存する

期待結果:

- エラーにならない
- `承認待ち` または `最近作った内容` に task が追加される
- task を開くと `summary / suggested actions / evidence` が structured view で表示される

確認してほしい点:

- support-page に出ている AI Suggestions と大きく矛盾していないか
- evidence の `progress / goal / plan / bridge / result` が current state とズレていないか
- project が未選択のときも task 作成自体は失敗せず、安全な fallback になるか

## チェック 2: TRANSLATE

1. `下書きを作る` を開き、`Promotion Agent` を選ぶ
2. task type を `翻訳案を作る` に切り替える
3. `入力` に短い日本語または英語を入れる
4. 翻訳先言語を選ぶ
5. `この内容で作成` を押す
6. 結果を開き、必要なら `08-translate-detail.png` を保存する

期待結果:

- エラーにならない
- `承認待ち` または `最近作った内容` に `TRANSLATE` task が追加される
- task を開くと翻訳結果が structured view で表示される

確認してほしい点:

- 翻訳結果が読みやすいか
- task input の見せ方が自然か

## チェック 3: WEEKLY_REPORT

1. `下書きを作る` を開き、`Manager Agent` または `Fan Relation Agent` を選ぶ
2. task type を `週次レポート案を作る` に切り替える
3. `reporting window days` を確認する
4. `この内容で作成` を押す
5. 結果を開き、必要なら `09-weekly-report-detail.png` を保存する

期待結果:

- エラーにならない
- `承認待ち` または `最近作った内容` に `WEEKLY_REPORT` task が追加される
- `summary / period / metrics / support / highlights / action items` が表示される

確認してほしい点:

- metrics がある場合、要約が実感とズレていないか
- metrics が少ない場合、空状態の文面が不自然でないか
- 支援状況がある project で support summary が違和感ないか

## チェック 4: ANNOUNCEMENT_DRAFT

1. `下書きを作る` を開き、`Promotion Agent` を選ぶ
2. task type を `告知文案を作る` に切り替える
3. `channel / tone / reporting window days` を確認する
4. `include metrics summary / include support summary` を必要に応じて切り替える
5. `この内容で作成` を押す
6. 結果を開き、必要なら `10-announcement-detail.png` を保存する
7. `posting compose を開く` を押し、`/<username>/mypage/support-page#posting-compose` に移動することを確認する
8. posting composer の本文に AI 下書きが入り、自動保存や自動投稿は起きていないことを確認する

期待結果:

- エラーにならない
- `承認待ち` または `最近作った内容` に `ANNOUNCEMENT_DRAFT` task が追加される
- `headline / body / CTA / supporting points` が表示される
- `posting compose を開く` で public posting の下書きとして確認できる

確認してほしい点:

- 告知文が「公開向け」または「支援者向け」として自然か
- 口調がプロダクトの想定に合うか
- 支援や metrics を本文に入れたときに過不足がないか

## チェック 5: SUPPORTER_MESSAGE_DRAFT

1. `下書きを作る` を開き、`Fan Relation Agent` を選ぶ
2. task type を `支援者メッセージ案を作る` に切り替える
3. `purpose / tone / reporting window days` を確認する
4. `include support summary` を確認し、必要なら `include metrics summary` を切り替える
5. `この内容で作成` を押す
6. 結果を開き、必要なら `11-supporter-message-detail.png` を保存する
7. `posting compose` へ直接渡すボタンがないこと、代わりに copy 境界が示されることを確認する

期待結果:

- エラーにならない
- `承認待ち` または `最近作った内容` に `SUPPORTER_MESSAGE_DRAFT` task が追加される
- `subject / body / closing / supporting points` が表示される
- public posting compose には直接 handoff せず、支援者向け文面として境界が保たれる

確認してほしい点:

- `THANK_YOU` と `REENGAGEMENT` で文面の意図が変わっているか
- 支援者向けメッセージとして押しつけがましくないか
- 支援実績が少ない場合でも不自然な文にならないか

## チェック 6: 承認フロー

1. `公開前に承認する` をオンにして task を1件作る
2. `承認待ち` タブで `WAITING_APPROVAL` になることを確認する
3. 単体承認と単体却下を試す
4. 可能なら複数件選択して一括承認を試す
5. `05-approval-queue.png` と `06-approval-result.png` を保存する
6. role chip を1つ選び、該当 role の task だけが見えることを確認し、必要なら `07-inbox-role-filter.png` を保存する
7. その状態でリロードし、同じ role chip が維持されることを確認する

期待結果:

- status が更新される
- 承認/却下後に audit log が増える
- 却下時は note が必須になる
- role chip を切り替えると、承認待ちと履歴が role 単位で絞り込まれる
- role を絞った状態で承認待ちがなければ、その role の `下書きを作る` に戻れる
- role を絞った `Inbox` や role を選んだ `Create` をリロードしても、tab / role 文脈が維持される

## 投稿指標確認

1. `/<username>/mypage/support-page#posting-compose` を開く
2. `投稿・AI事務所` セクションの投稿 composer か既存投稿一覧を確認する
3. まだ投稿がない場合は 1 件作る
4. `AI事務所` に戻り、`下書きを作る` タブなら `Creator Founding の投稿指標を更新`、`概要` タブなら `内部指標を更新する` を押す
5. `12-posting-metrics-before.png` と `13-posting-metrics-after.png` を保存する

期待結果:

- 投稿がなくても task 作成は失敗しない
- 投稿がある場合、告知文案や週次レポートの根拠が増える
- metrics 更新後に success message が出る

## 記録テンプレート

- 実施日:
- 確認者:
- 対象 creator:
- 実施セット: `minimum` または `full`
- 保存先:
- 取得したスクリーンショット:
- 確認した task:
- UI 上の違和感:
- 文言上の違和感:
- エラーコード:
- 次に直したい点:

## 返してほしい内容

- どの task で確認したか
- 期待どおりだった点
- 違和感があった文言や UI
- エラーコードが出た場合はその文字列
- 「この task は使えそう / 使いにくい」の一言評価
