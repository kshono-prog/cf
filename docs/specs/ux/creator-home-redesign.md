# Creator Home 再設計案 v0.1

以下は、現在の `mypage` をベースに、**設定画面中心の構造から「AI事務所ホーム」中心の構造へ再設計する案**です。
現状の `AccountPageClient` は、Profile / Project / Goal / Summary を一か所に集約しており、運営ハブの土台として非常に良い状態です。
一方で、現在は「編集フォーム」と「運営」が同じ重さで並んでおり、体験としてはまだ**設定画面寄り**です。`CreatorProfileSection` と `CreatorProfileEditForm` は `extraSections` による差し込みが可能なので、構造自体は再設計に耐えます。

## 1. 再設計の目的

Creator Home の目的は、Creator がログインして最初に見たときに、**「今どこにいて、今日なにを進めるべきか」がすぐ分かること**です。

現状の課題は次です。

- Profile / Goal / Project 編集の比重が高い
- 「状態確認」より「入力」が前に出ている
- AI事務所の中核となる日次運営導線がまだ弱い
- Manager との接続面がない
- 会議 / 予定 / 次アクションがホームの中心にない
- Summary はあるが、意味づけが薄い

したがって、再設計の方向は、

> **編集中心 → 運営中心**
> **フォーム中心 → 状態 / 提案 / 行動中心**
> **単独管理 → Creator・Manager・AI Office の共同運営起点**

に切り替えることです。

## 2. Creator Home の新しい役割

Creator Home は、今後このプロダクトにおいて次の役割を持ちます。

### 2-1. 今日の仕事場

最初に開くと、

- 今のProject
- 今週の目標
- 今日の優先事項
- 次の会議
- 注意点

が見える

### 2-2. AI事務所の入口

AI Office が、

- 今日のブリーフィング
- 停滞の指摘
- 次アクション
- 不足項目

を提案する

### 2-3. Manager との接続点

- Manager からの最新メモ
- 次回確認事項
- 対外先の進行状況

を見られる

### 2-4. 設定ではなく運営を前に出す

Profile / Goal / Project 設定は残すが、後段に折りたたむ

## 3. 情報設計の原則

### 原則1

**ホームで最初に見るのは「入力欄」ではなく「現状」**

### 原則2

**数値は意味とセットで出す**

例:

- 進捗 68%
- あと 32,000 JPYC
- 今やるべきこと: 告知投稿 / 会場確認 / 会議設定

### 原則3

**AIはチャットではなく、まず運営提案として見せる**

### 原則4

**設定は後ろ、行動は前**

Profile 編集や Goal 保存は重要だが、常時前面に出さない

### 原則5

**1画面で “状態 → 判断 → 行動” がつながる**

- 状態確認
- 提案理解
- ボタンで次へ進む

## 4. 新しい画面構成

Creator Home は次の順で構成するのが最適です。

### 4-1. Hero / Daily Briefing セクション

#### 目的

Creator が開いた瞬間に、**今日の状況と優先順位**を理解する

#### 表示要素

- Creator 名 / アイコン
- 現在の主Project名
- Goal進捗
- 今週の注力テーマ
- AI Office からの一言
- 今日の最優先 3項目

#### 例

- 新曲制作 Project
- 進捗 68%
- あと 32,000 JPYC
- 今週は「告知強化」と「イベント準備」
- 今日やること:

  1. 投稿を1本作る
  2. 会場確認メモを見る
  3. 金曜の会議を確定する

#### CTA

- 今日の計画を見る
- 会議を開く
- 投稿下書きを作る

#### 実装方針

現行の `summary` と `progress` 情報を活用して組めます。`Summary / Actions` にある status / progress / achievedAt などは、この Hero の材料になります。

### 4-2. Project Progress セクション

#### 目的

Project / Goal / Summary を「設定項目」ではなく「運営状況」として見せる

#### 表示要素

- Project title
- status
- Goal target
- confirmed amount
- progress bar
- achieved / not achieved
- 次の段階（未達 / 達成待ち / 分配準備 など）

#### 補足表示

- なぜこのステータスか
- 次に必要なこと
- Manager / AI が見るべき注意点

#### 例

- Goal 未達
- 次に必要: 告知の追加
- Goal 達成済
- 次に必要: 分配プラン確認

#### 実装方針

現行の Goal 保存 / Summary更新 / Achieve / Distribution 保存機能は残しつつ、
ホームでは「編集UI」ではなく「進捗カード」として見せる。保存や詳細操作は後段に逃がす。

### 4-3. AI Manager セクション

#### 目的

AI Office の主たる価値を、チャットではなく**運営カード**として見せる

#### 表示要素

- 提案カード 3件程度
- 各提案の理由
- 1提案 = 1行動

#### 提案例

- 最近 5 日投稿が止まっています。短文の近況共有をおすすめします
- Goal 進捗は 68% です。今週は告知よりイベント導線強化が効きます
- 会場候補に対する現地確認が未記録です。Manager に確認を依頼しましょう

#### 各カードのアクション

- 採用
- 後で
- 下書きを作る
- 会議に持ち込む

#### 実装方針

最初は DB 保存済みの `AgentSuggestion` がなくても、`summary`, `goal`, `progress`, `lastBridgeRuns`, `lastDistributionRuns`, `ManagerNote`, `ExternalContact` などから生成する簡易カードで始められます。

### 4-4. Today / This Week タスクセクション

#### 目的

「考える」で止めず、「進める」に変える

#### 表示要素

- 今日のタスク
- 今週のタスク
- 担当別（Creator / Manager / Shared）

#### 表示例

##### Creator

- プロフィール文を更新
- X投稿 1本
- オーディション候補確認

##### Manager

- 会場へフォロー連絡
- 先方返信待ちを確認
- 次回会議を設定

##### Shared

- 金曜18時 ミーティング
- イベント予算の方向性確認

#### 実装方針

まずは `ActivityTask` がなくても、簡易的には

- Goal 未保存
- Summary 未更新
- 会議未設定
- Note follow-up
- ExternalContact.nextAction

などから生成可能です。将来は専用タスクモデルへ。

### 4-5. Manager Feed セクション

#### 目的

Creator が Manager の動きを把握できるようにする

#### 表示要素

- 最新の共有可能 Manager Note
- 次の確認事項
- 対外先の進行状況
- 会場 / 主催 / メディアに関する短いアップデート

#### 例

- 下北沢会場の下見完了。搬入導線に注意
- 主催者から前向き返信あり。詳細条件は次回会議で確認
- 金曜の営業先への再連絡予定

#### 実装方針

`ManagerNote.visibility = SHAREABLE_WITH_CREATOR` のみ表示。
ここが入ると、Creator Home が「一人の管理画面」から「事務所との共同運営画面」に変わります。

### 4-6. Planner / Upcoming セクション

#### 目的

次の会議・期限・行動を時間軸で見せる

#### 表示要素

- 次の会議
- 次の締切
- 次の営業フォロー
- 次のイベント準備
- 次の投稿予定

#### 表示形式

- 直近3件の時系列カード
- 「今週」「来週」で分けてもよい

#### 実装方針

最初は Meeting / Task / ExternalContact.nextActionDueAt の混合タイムラインでよいです。

### 4-7. Quick Actions セクション

#### 目的

ホームから迷わず実行へ飛べるようにする

#### ボタン例

- 投稿下書きを作る
- 会議を始める
- Goal 詳細を編集
- Project 詳細を見る
- Manager メモを確認
- 会場 / 主催者一覧を見る

#### 実装方針

チャットを開かせるより、**仕事起点**でアクションを置く。

### 4-8. Growth / Reflection セクション

#### 目的

成長と継続を可視化する

#### 表示要素

- 今月の進捗
- 継続日数
- 完了タスク数
- 支援の伸び
- AI / Manager の短い振り返りコメント

#### 例

- 今月は投稿を4本継続
- 会議を2回実施
- Goal は 20% 進捗改善
- 次は「支援の使い道説明」を整えると良い

#### 実装方針

最初は高度な分析でなくてよい。
Action Log を蓄積していけば将来強くなる。

### 4-9. Settings / Edit セクション（折りたたみ）

#### 目的

編集機能を残しつつ、ホームの主役にしない

#### 中に入れるもの

- Profile 編集
- Project 作成
- Goal 保存
- Summary 詳細操作
- Distribution 関連
- ガス支援
- 各種設定

#### 実装方針

現行の `CreatorProfileSection` と `CreatorProfileEditForm` はここへ移すのが自然です。`extraSections` を活かして、設定群としてまとめ直せます。

## 5. 新しいレイアウト案

### 上から順

1. Daily Briefing Hero
2. Project Progress
3. AI Manager
4. Today / This Week
5. Manager Feed
6. Upcoming / Planner
7. Quick Actions
8. Growth / Reflection
9. Settings / Edit（折りたたみ）

## 6. 現行 UI からの移行方針

現行の `AccountPageClient` は、以下を持っています。

- Gas Support
- リンク
- Creator Profile 編集
- Project 作成
- Goal 保存
- Summary / Actions

これを以下に組み替えるのが最適です。

### 現行 → 新構造

#### `GasSupportCard`

→ Settings または上部補助カードへ

#### `リンク`

→ Hero 下のサブ情報へ

#### `CreatorProfileSection`

→ Settings / Edit へ

#### `ProjectCreateCard`

→ 初回未作成時のみ目立たせる。通常は Settings へ

#### `Goal` 保存 UI

→ Progress 詳細 / Settings へ

#### `Summary / Actions`

→ Home ではカード化
→ 実行詳細は Settings / Detail に退避

## 7. 画面状態の分岐

Creator Home は Creator の状態によって見せ方を変える必要があります。

### 7-1. noUser

現状どおり、まず登録フロー

### 7-2. userOnly

現状どおり Creator 申請へ進めるが、
文脈としては「Creator Home 以前の onboarding」

### 7-3. creatorReady かつ Project 未作成

Hero の下で
「まず最初の Project を作りましょう」
を最優先表示

### 7-4. creatorReady かつ Project あり

通常の Creator Home

## 8. UI トーン

Creator Home は、SaaS 管理画面にしすぎない方が良いです。

### 望ましいトーン

- 白ベース
- 余白多め
- 情報は多いが圧迫しない
- カード中心
- 緊急度だけ視認性を上げる
- AI はサイバー感ではなく秘書 / 参謀感

### 避けたいもの

- フォームだらけ
- いきなりタブだらけ
- 過剰な数値ダッシュボード
- 「AIが勝手に全部やる」印象

## 9. 実装優先順位

### 最優先

1. Hero / Daily Briefing
2. Project Progress カード化
3. AI Manager カード
4. Today / This Week
5. Settings 折りたたみ化

### 次点

6. Manager Feed
7. Upcoming / Planner
8. Growth / Reflection

### その後

9. AI Suggestion 保存
10. Meeting / Task / Contact 連携強化

## 10. 一文要約

**Creator Home は、Creator が「今の状態・今日の優先事項・AIとManagerからの支援・次の行動」を一目で把握し、設定ではなく運営を前に進めるための AI事務所ホームである。**
