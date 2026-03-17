# AI Office Manual Check

## 目的

`AiOfficePanel` と主要 `AgentTask` の手動確認を、短時間で再現できる形にする。

## 対象

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
- metrics を使う確認では `SNS connection` と `metrics snapshot` があると望ましい

## 事前準備

1. `npm run dev` を起動する
2. 対象 creator の [`/[username]/mypage`] を開く
3. `AI事務所（Phase1）` セクションが表示されることを確認する
4. 必要なら `metrics収集` を1回実行する

## チェック 1: MANAGER_NEXT_ACTIONS

1. task type を `MANAGER_NEXT_ACTIONS` に切り替える
2. `AIタスク作成` を押す
3. project がある場合は、現在の summary に沿った next action が出るか確認する

期待結果:

- エラーにならない
- `Latest AI Tasks` に `MANAGER_NEXT_ACTIONS` が追加される
- task を開くと `summary / suggested actions / evidence` が structured view で表示される

確認してほしい点:

- support-page に出ている AI Suggestions と大きく矛盾していないか
- evidence の `progress / goal / plan / bridge / result` が current state とズレていないか
- project が未選択のときも task 作成自体は失敗せず、安全な fallback になるか

## チェック 2: TRANSLATE

1. task type を `TRANSLATE` に切り替える
2. `Task Input` に短い日本語または英語を入れる
3. 翻訳先言語を選ぶ
4. `AIタスク作成` を押す

期待結果:

- エラーにならない
- `Latest AI Tasks` に `TRANSLATE` が追加される
- task を開くと翻訳結果が structured view で表示される

確認してほしい点:

- 翻訳結果が読みやすいか
- task input の見せ方が自然か

## チェック 3: WEEKLY_REPORT

1. task type を `WEEKLY_REPORT` に切り替える
2. `reporting window days` を確認する
3. `AIタスク作成` を押す

期待結果:

- エラーにならない
- `Latest AI Tasks` に `WEEKLY_REPORT` が追加される
- `summary / period / metrics / support / highlights / action items` が表示される

確認してほしい点:

- metrics がある場合、要約が実感とズレていないか
- metrics が少ない場合、空状態の文面が不自然でないか
- 支援状況がある project で support summary が違和感ないか

## チェック 4: ANNOUNCEMENT_DRAFT

1. task type を `ANNOUNCEMENT_DRAFT` に切り替える
2. `channel / tone / reporting window days` を確認する
3. `include metrics summary / include support summary` を必要に応じて切り替える
4. `AIタスク作成` を押す

期待結果:

- エラーにならない
- `Latest AI Tasks` に `ANNOUNCEMENT_DRAFT` が追加される
- `headline / body / CTA / supporting points` が表示される

確認してほしい点:

- 告知文が「公開向け」または「支援者向け」として自然か
- 口調がプロダクトの想定に合うか
- 支援や metrics を本文に入れたときに過不足がないか

## チェック 5: SUPPORTER_MESSAGE_DRAFT

1. task type を `SUPPORTER_MESSAGE_DRAFT` に切り替える
2. `purpose / tone / reporting window days` を確認する
3. `include support summary` を確認し、必要なら `include metrics summary` を切り替える
4. `AIタスク作成` を押す

期待結果:

- エラーにならない
- `Latest AI Tasks` に `SUPPORTER_MESSAGE_DRAFT` が追加される
- `subject / body / closing / supporting points` が表示される

確認してほしい点:

- `THANK_YOU` と `REENGAGEMENT` で文面の意図が変わっているか
- 支援者向けメッセージとして押しつけがましくないか
- 支援実績が少ない場合でも不自然な文にならないか

## チェック 6: 承認フロー

1. `承認必要` をオンにして task を1件作る
2. `Latest AI Tasks` で `WAITING_APPROVAL` になることを確認する
3. 単体承認と単体却下を試す
4. 可能なら複数件選択して一括承認を試す

期待結果:

- status が更新される
- 承認/却下後に audit log が増える
- 却下時は note が必須になる

## 返してほしい内容

- どの task で確認したか
- 期待どおりだった点
- 違和感があった文言や UI
- エラーコードが出た場合はその文字列
- 「この task は使えそう / 使いにくい」の一言評価
