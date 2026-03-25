# Manager Desk 要件定義 v0.1

関連仕様:

- [`docs/specs/manager-desk/data-models.md`](/Users/shounokazuaki/cf/docs/specs/manager-desk/data-models.md)

## 目的

Manager Desk は、**人間の Manager が少人数でも複数の Creator を継続的に支えられるようにするための運営ハブ**です。

Creator Founding における Creator Home が「本人の活動拠点」だとすると、Manager Desk は「伴走・運営・対外調整・進行管理の拠点」です。

この画面は、単なる一覧管理画面ではなく、次のことを実現するためのものです。

- どの Creator に、今なにが起きているかが分かる
- 何を優先して対応すべきかが分かる
- AI Office が整理した情報をすぐ実務に使える
- 現場で得た情報を Manager Note として残せる
- 会場、主催者、メディア、営業先などの対外接点を管理できる
- 会議、次アクション、進捗、信頼、リスクを一つの場所で扱える

## 1. Manager Desk の位置づけ

### 1-1. プロダクト内での役割

Creator Founding の中で、Manager Desk は以下の役割を持つ。

- Creator Home: 本人が使う運営画面
- Manager Desk: Manager が使う運営画面
- AI Office: 両者を支える整理・提案レイヤー

つまり、Manager Desk は
**「Creator のための事務所機能を、人間 Manager の視点で束ねる画面」**
です。

### 1-2. 既存構造との関係

現状の mypage は、`AccountPageClient` を中心に Project / Goal / Summary / Profile を統合管理する構造になっており、Creator 向け運営ハブの土台として適しています。

Manager Desk はこれと対になる形で、

- Creator ごとの状況を横断的に見る
- 現場・営業・会議・接触履歴を扱う
- Manager Note / External Contact / Action Log を集約する

という、**Manager 視点の業務画面**として新設するのが自然です。

## 2. 解決すべき課題

Manager Desk は、次の課題を解決することを目的とする。

### 2-1. 属人的な記憶に依存している

- どの Creator がどこで止まっているか分からなくなる
- 先方の温度感や現場の空気が口頭メモで消える
- 次のアクションが人の頭の中にしかない

### 2-2. 少人数で複数 Creator を見るのが難しい

- 優先順位が分かりにくい
- 緊急度が高いものが埋もれる
- 期限や会議や対外接点が散らばる

### 2-3. AI の提案が現実につながらない

- AI が案を出しても誰が動くか分からない
- Manager が見ない / 使えない
- 現場文脈が AI に入っていない

### 2-4. 実行と責任の境界が曖昧

- Creator がやること
- Manager がやること
- AI Office が整理すること

が混ざる

Manager Desk はこれらを、**一覧性・優先順位・履歴・実行責任**の観点から整理する。

## 3. ユーザー

### 主ユーザー

- 人間の Manager
- 運営担当
- 少人数の事務所担当
- Creator を支援する内部メンバー

### 将来拡張ユーザー

- 小規模チームの代表
- プロジェクトマネージャー
- エージェンシー担当
- 複数 Creator を支える事業者

## 4. Manager Desk の中核ユースケース

### 4-1. 朝、Desk を開いて今日やることを把握する

- 今日確認すべき Creator
- 期限が近い案件
- 返信待ち / 要返信先
- AI が抽出した注意項目
- 現場確認が必要なもの
- 今日の会議

### 4-2. Creator ごとの状況を見る

- 今の Project 状況
- Goal の進捗
- 最新の会議
- 最新の Manager Note
- リスク
- 次アクション
- AI Office からの提案

### 4-3. 対外先の状況を見る

- どの会場 / 主催 / メディア / 企業に接触したか
- 返信は来ているか
- 温度感はどうか
- 次にいつ何をするか

### 4-4. 現場対応後に記録を残す

- 会場下見メモ
- 営業先の反応
- 当日の懸念点
- 交渉論点
- AI 用に文脈化したノート

### 4-5. 会議を回す

- 会議前にアジェンダ確認
- 会議後に決定事項確認
- タスク化
- 次回予定設定

## 5. 機能要件

### 5-1. ダッシュボード機能

#### 要件

Manager Desk のトップでは、担当 Creator 全体を俯瞰し、優先順位が分かること。

#### 表示項目

- 担当 Creator 一覧
- 各 Creator の現在ステータス
- Project 状況
- Goal 達成率
- 直近アクション日
- 期限が近い項目数
- 未完了タスク数
- 要返信件数
- 要現場対応件数
- リスクフラグ
- AI 優先対応提案

#### 必須要件

- 一覧で緊急度順に並べ替えできる
- 「今日見るべき Creator」が分かる
- 止まっている Creator が分かる
- 連絡漏れ / フォロー漏れが分かる

#### UX方針

一覧画面は “表” であってもよいが、冷たい管理表ではなく
**優先順位が直感で分かるカード + テーブルのハイブリッド** が望ましい。

### 5-2. Creator 概況ビュー

#### 要件

各 Creator ごとに、Manager が必要な状況をまとめて見られること。

#### 表示項目

- Creator 基本情報
- 現在の Stage / 信頼概要
- 最新 Project
- Goal 進捗
- 次の会議
- 次の期限
- 最新投稿 / 活動
- 最新 Manager Note
- 重要な External Contact
- 現在の論点
- AI Office からの要約

#### 必須要件

- 1画面で「今何が起きているか」が把握できる
- 会議と対外先と進捗が分断されない
- Creator Home との対応関係が分かる

### 5-3. Manager Assignment 管理

#### 要件

誰がどの Creator を担当するかを明示的に管理できること。

#### 必要項目

- `creatorId`
- `managerUserId`
- `roleType`
- `assignedAt`
- `status`

#### 必須要件

- 1人の Manager が複数 Creator を担当できる
- Creator ごとに主担当が分かる
- 将来は副担当も持てる
- 担当変更履歴を残せる

### 5-4. Manager Note 機能

#### 要件

Manager が、AI では拾えない現場情報・対外温度感・懸念点を残せること。

#### 想定メモ種別

- 会場下見
- 営業先面談
- 主催者との会話
- リスクメモ
- Creator 状態メモ
- 当日運営メモ
- 交渉メモ
- 非公開の所感

#### 1件あたりの必須項目

- `noteId`
- `creatorId`
- `authoredByManagerId`
- `noteType`
- `title`
- `body`
- `visibility`
- `createdAt`
- `updatedAt`

#### 推奨項目

- `relatedProjectId`
- `relatedContactId`
- `urgency`
- `nextActionSuggestion`
- `aiSummary`
- `aiTags`

#### 必須要件

- テキストで高速に記録できる
- 後から検索できる
- AI Office が要約可能
- Creator には見せない非公開メモと、共有可能メモを分けられる

#### 重要な境界

Manager Note は、**Manager 専用の現場文脈の資産** であり、
AI Office は参照・要約してよいが、無断公開してはならない。

### 5-5. External Contact 管理

#### 要件

会場、主催者、メディア、企業、案件提供者などの対外接点を管理できること。

#### Contact 種別

- Venue
- Organizer
- Media
- Brand / Company
- Opportunity Provider
- Collaborator
- Other

#### 必要項目

- `contactId`
- `creatorId` または `organizationScope`
- `contactType`
- `organizationName`
- `personName`
- `role`
- `channel`
- `lastContactAt`
- `contactStatus`
- `temperature`
- `nextAction`
- `notes`

#### `contactStatus` 例

- 未接触
- 接触済
- 返信待ち
- 商談中
- 条件確認中
- 保留
- 成約
- 失注
- 継続関係

#### `temperature` 例

- 低い
- 普通
- 高い
- 不明

#### 必須要件

- Creator 単位で見られる
- Contact 単位でも見られる
- 次アクション日が設定できる
- 最終接触が見える
- フォロー漏れが検知できる

#### UX方針

巨大CRMにしない。
まずは **最小限の営業 / 関係管理が回る軽量CRM** を目指す。

### 5-6. Action Log 機能

#### 要件

Creator / Manager / AI Office のアクション履歴を時系列で確認できること。

#### ログ対象例

- Goal 更新
- Project 更新
- Meeting 実施
- Note 追加
- Contact 更新
- 提案受理
- タスク完了
- 応募
- 営業接触
- 現場確認
- 投稿公開
- 支援者対応

#### 必須要件

- 時系列で見られる
- Actor が分かる
- Creator / Manager / AI Office を区別できる
- 重要ログはハイライトされる

#### 目的

- 誰が何を進めたか分かる
- 振り返りしやすい
- 信頼蓄積の根拠になる
- AI Office の提案精度が上がる

### 5-7. 会議管理機能

#### 要件

Manager が Creator との会議を準備・記録・次回アクション化できること。

#### 必要項目

- `meetingId`
- `creatorId`
- `managerId`
- `meetingType`
- `scheduledAt`
- `agenda`
- `notes`
- `decisions`
- `nextActions`
- `nextMeetingSuggestion`
- `aiSummary`

#### `meetingType` 例

- 週次活動会議
- リリース前確認
- 営業進捗会議
- イベント準備会議
- 振り返り会議
- 緊急対応会議

#### 必須要件

- 事前アジェンダが作れる
- 会議後に決定事項を残せる
- タスク化できる
- 次回会議の候補を持てる
- AI Office が要約補助できる

### 5-8. タスク / フォローアップ管理

#### 要件

Manager が Creator ごとの次アクションを明確に持てること。

#### 必要項目

- `taskId`
- `creatorId`
- `assignedTo`
- `sourceType`
- `title`
- `description`
- `dueAt`
- `status`
- `priority`
- `relatedMeetingId`
- `relatedContactId`

#### 必須要件

- Creator タスクと Manager タスクを分ける
- AI提案由来のタスクを識別できる
- 期限が見える
- 完了 / 保留 / 再設定ができる

#### UX方針

ToDoアプリではなく、
**事務所のフォローアップ機構**として実装する。

### 5-9. AI Office 補助表示

#### 要件

Manager Desk は AI Office の補助情報を自然に使えること。

#### AI表示内容

- 今日の優先対応 Creator
- 停滞案件の検知
- フォロー漏れアラート
- 会議の論点整理
- Contact 温度感の要約
- Manager Note の要点整理
- 次アクション候補
- Missing Items 検知

#### 必須要件

- AIの提案は押しつけではなく「候補」として出す
- 提案理由が見える
- 採用 / 保留 / 却下ができる
- AIだけで確定しない

## 6. 非機能要件

### 6-1. 一覧性

Manager は 10秒以内に「今日どこを見るべきか」を把握できること。

### 6-2. 入力容易性

Manager Note や Contact 更新は、外出先や現場でも短時間で記録できること。

### 6-3. 検索性

Creator 名、会場名、主催者名、メモ内容、接触状況で検索できること。

### 6-4. 権限制御

Manager 専用の非公開情報と、Creator に共有できる情報を分けること。

### 6-5. 監査性

重要な更新は履歴に残ること。
誰が、いつ、何を変えたか追えること。

## 7. 画面構成案

Manager Desk は最初、以下の4画面で十分です。

### 7-1. Dashboard

- 担当 Creator 一覧
- 優先対応
- 緊急項目
- 今日の会議
- フォロー漏れ
- AI要約

### 7-2. Creator Detail

- Creator 概況
- Project / Goal
- 会議
- Note
- Contact
- タスク
- AIサマリー

### 7-3. Contact Pipeline

- 対外先一覧
- ステータス
- 次アクション
- Creator 紐付け
- 温度感

### 7-4. Notes / Activity Timeline

- Manager Note 一覧
- Action Log
- 会議ログ
- 検索 / フィルタ

## 8. データモデル最小案

最初に必要なエンティティはこの程度でよいです。

- ManagerAssignment
- ManagerNote
- ExternalContact
- ExternalContactActivity
- Meeting
- ActivityTask
- ActionLog

すべてを最初から Marketplace モデルにしない。
まずは Manager 業務が回る最小構成を優先する。

詳細な初期データモデル定義は次を参照する。

- [`docs/specs/manager-desk/data-models.md`](/Users/shounokazuaki/cf/docs/specs/manager-desk/data-models.md)

## 9. 成功指標

Manager Desk の成功は、次で測る。

### 定量

- 1人の Manager が担当できる Creator 数
- フォロー漏れ件数の減少
- Contact 追跡率
- 会議後タスク化率
- 次アクション設定率
- 期限超過件数の減少

### 定性

- Manager が「頭の中で回していた業務を外に出せる」
- Creator ごとの状況把握が楽になる
- AI提案が現実に使える
- 現場情報が蓄積資産になる

## 10. 実装優先順位

### 最優先

1. Dashboard
2. ManagerAssignment
3. ManagerNote
4. Creator Detail 基本表示

### 次点

5. ExternalContact
6. Meeting
7. Task / Follow-up

### その次

8. AI要約
9. Contact Pipeline
10. Missing Items 検知
11. Trust / Stage 連携

## 11. 一文要約

**Manager Desk は、Manager が複数の Creator を少ない負荷で支えられるように、進捗・会議・対外接点・現場メモ・次アクションを一元化し、AI Office の整理能力を実務へ接続するための運営ハブである。**
