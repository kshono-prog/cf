# Manager Note / External Contact / Action Log のデータモデル定義 v0.1

以下は、**最小構成で最大効果**を出すための初期データモデル定義です。
前提は次の通りです。

- まずは **Creator・Manager・AI Office** の運営を回す
- Marketplace 化しすぎない
- でも将来、Venue / Media / Organizer / Brand / Collaborator に拡張できる形にする
- `any` 的な曖昧さを避け、状態遷移と責任主体を明確にする

実装前提の Prisma-ready proposal は
[`Manager Core Schema Proposal`](/Users/shounokazuaki/cf/docs/specs/manager-desk/schema-proposal.md)
を参照してください。
現行 repo には generic `User` model がないため、phase 1 では actor identity を wallet address ベースへ寄せています。

## 1. 設計方針

### 1-1. 今回の3モデルの役割

#### ManagerNote

人間の Manager が得た、**現場文脈・温度感・交渉論点・非構造情報**を残すためのモデル。

#### ExternalContact

会場、主催者、メディア、企業、協力者など、**対外接点そのもの**を管理するモデル。

#### ActionLog

Creator / Manager / AI Office の行動を時系列で残す、**監査・振り返り・信頼蓄積の基盤**。

### 1-2. モデル分離の理由

この3つは似て見えますが、混ぜると壊れます。

- Note は「人間の所感・観測」
- Contact は「関係先の現在状態」
- Log は「起きた事実」

この区別を守ることで、

- Manager の現場知が残る
- CRM 的な接点管理ができる
- 後から AI が文脈を参照できる
- 信頼や進捗の根拠が残る

ようになります。

## 2. 列挙型定義

まずは Prisma / TypeScript で共有しやすい enum を先に固めます。

### 2-1. ManagerNoteType

```ts
type ManagerNoteType =
  | "GENERAL"
  | "VENUE_SCOUT"
  | "SALES_MEETING"
  | "NEGOTIATION"
  | "CREATOR_STATUS"
  | "EVENT_OPERATION"
  | "RISK"
  | "FOLLOW_UP";
```

意味:

- `GENERAL`: 一般メモ
- `VENUE_SCOUT`: 会場下見
- `SALES_MEETING`: 営業面談
- `NEGOTIATION`: 条件交渉
- `CREATOR_STATUS`: Creator の状態観察
- `EVENT_OPERATION`: 当日運営や段取り
- `RISK`: リスクや懸念
- `FOLLOW_UP`: 次回確認用

### 2-2. NoteVisibility

```ts
type NoteVisibility =
  | "MANAGER_ONLY"
  | "INTERNAL_TEAM"
  | "SHAREABLE_WITH_CREATOR";
```

意味:

- `MANAGER_ONLY`: Manager のみ
- `INTERNAL_TEAM`: 内部運営チームまで
- `SHAREABLE_WITH_CREATOR`: Creator に共有可能

最初は `MANAGER_ONLY` と `SHAREABLE_WITH_CREATOR` だけでもよいです。

### 2-3. ExternalContactType

```ts
type ExternalContactType =
  | "VENUE"
  | "ORGANIZER"
  | "MEDIA"
  | "BRAND"
  | "COMPANY"
  | "COLLABORATOR"
  | "AGENCY"
  | "SPONSOR"
  | "OTHER";
```

### 2-4. ExternalContactStatus

```ts
type ExternalContactStatus =
  | "NEW"
  | "CONTACTED"
  | "REPLIED"
  | "MEETING_SCHEDULED"
  | "IN_DISCUSSION"
  | "NEGOTIATING"
  | "ON_HOLD"
  | "WON"
  | "LOST"
  | "ONGOING";
```

意味:

- `NEW`: 登録のみ
- `CONTACTED`: 接触済
- `REPLIED`: 返信あり
- `MEETING_SCHEDULED`: 面談予定
- `IN_DISCUSSION`: 話進行中
- `NEGOTIATING`: 条件交渉中
- `ON_HOLD`: 保留
- `WON`: 成立
- `LOST`: 不成立
- `ONGOING`: 継続関係あり

### 2-5. ContactTemperature

```ts
type ContactTemperature =
  | "UNKNOWN"
  | "COLD"
  | "NEUTRAL"
  | "WARM"
  | "HOT";
```

これは厳密な数値化より、現場感を残すための軽量評価です。

### 2-6. ActionActorType

```ts
type ActionActorType =
  | "CREATOR"
  | "MANAGER"
  | "AI_OFFICE"
  | "SYSTEM";
```

### 2-7. ActionLogType

```ts
type ActionLogType =
  | "PROJECT_CREATED"
  | "PROJECT_UPDATED"
  | "GOAL_UPDATED"
  | "GOAL_ACHIEVED"
  | "MEETING_CREATED"
  | "MEETING_COMPLETED"
  | "MANAGER_NOTE_CREATED"
  | "MANAGER_NOTE_UPDATED"
  | "CONTACT_CREATED"
  | "CONTACT_UPDATED"
  | "CONTACT_ACTIVITY_RECORDED"
  | "TASK_CREATED"
  | "TASK_COMPLETED"
  | "AI_SUGGESTION_CREATED"
  | "AI_SUGGESTION_ACCEPTED"
  | "AI_SUGGESTION_REJECTED"
  | "DRAFT_CREATED"
  | "DRAFT_UPDATED"
  | "OPPORTUNITY_LINKED"
  | "STATUS_CHANGED"
  | "OTHER";
```

## 3. ManagerNote モデル定義

### 3-1. 目的

ManagerNote は、**人間が見て感じたこと**を残すためのモデルです。
AI が推論しやすいように補助フィールドは持たせるが、中心はあくまで人間メモです。

### 3-2. 必須フィールド

```ts
type ManagerNote = {
  id: string;
  creatorProfileId: string;
  authoredByManagerUserId: string;

  noteType: ManagerNoteType;
  visibility: NoteVisibility;

  title: string;
  body: string;

  createdAt: string;
  updatedAt: string;
};
```

### 3-3. 推奨フィールド

```ts
type ManagerNoteExtended = ManagerNote & {
  projectId: string | null;
  externalContactId: string | null;
  relatedMeetingId: string | null;

  urgencyScore: number | null;
  followUpNeeded: boolean;
  followUpDueAt: string | null;

  aiSummary: string | null;
  aiTags: string[];
};
```

### 3-4. 各フィールドの意味

#### `creatorProfileId`

どの Creator に紐づくメモか。必須。

#### `authoredByManagerUserId`

誰が書いたか。監査性のため必須。

#### `noteType`

後で一覧や検索、AI 要約、種別別ビューに使う。

#### `visibility`

共有範囲。重要。

#### `title`

一覧性のため短い要約タイトル。

#### `body`

本文。現場知の本体。

#### `projectId`

どの Project 文脈か。将来かなり効きます。

#### `externalContactId`

どの相手先に関するメモか。

#### `relatedMeetingId`

会議の流れの中で作られたメモなら紐付ける。

#### `urgencyScore`

緊急度。ダッシュボードで効きます。

#### `followUpNeeded`, `followUpDueAt`

メモが単なる記録ではなく、次の行動につながるようにする。

#### `aiSummary`, `aiTags`

生成カラム。人間入力ではなく非同期更新でもよい。

### 3-5. Prisma 例

```prisma
enum ManagerNoteType {
  GENERAL
  VENUE_SCOUT
  SALES_MEETING
  NEGOTIATION
  CREATOR_STATUS
  EVENT_OPERATION
  RISK
  FOLLOW_UP
}

enum NoteVisibility {
  MANAGER_ONLY
  INTERNAL_TEAM
  SHAREABLE_WITH_CREATOR
}

model ManagerNote {
  id                      String           @id @default(cuid())
  creatorProfileId        String
  authoredByManagerUserId String

  projectId               String?
  externalContactId       String?
  relatedMeetingId        String?

  noteType                ManagerNoteType
  visibility              NoteVisibility

  title                   String
  body                    String           @db.Text

  urgencyScore            Int?
  followUpNeeded          Boolean          @default(false)
  followUpDueAt           DateTime?

  aiSummary               String?          @db.Text
  aiTags                  String[]         @default([])

  createdAt               DateTime         @default(now())
  updatedAt               DateTime         @updatedAt

  @@index([creatorProfileId, createdAt])
  @@index([authoredByManagerUserId, createdAt])
  @@index([externalContactId])
  @@index([projectId])
  @@index([relatedMeetingId])
}
```

## 4. ExternalContact モデル定義

### 4-1. 目的

ExternalContact は、**対外接点の現在地**を持つモデルです。
Note のような所感ではなく、「誰と、どの状態にあるか」を持ちます。

### 4-2. 必須フィールド

```ts
type ExternalContact = {
  id: string;

  creatorProfileId: string | null;
  ownerManagerUserId: string | null;

  contactType: ExternalContactType;

  organizationName: string;
  personName: string | null;
  roleTitle: string | null;

  email: string | null;
  phone: string | null;
  websiteUrl: string | null;
  socialUrl: string | null;

  status: ExternalContactStatus;
  temperature: ContactTemperature;

  lastContactAt: string | null;
  nextAction: string | null;
  nextActionDueAt: string | null;

  notes: string | null;

  createdAt: string;
  updatedAt: string;
};
```

### 4-3. 推奨フィールド

```ts
type ExternalContactExtended = ExternalContact & {
  projectId: string | null;

  locationText: string | null;
  tags: string[];

  sourceType: "MANUAL" | "IMPORTED" | "AI_SUGGESTED";
  sourceRef: string | null;

  relationshipStrengthScore: number | null;
  lastOutcome: string | null;

  isArchived: boolean;
};
```

### 4-4. 各フィールドの意味

#### `creatorProfileId`

特定 Creator 専属の接点なら埋める。
共通接点運用も将来ありうるので nullable 設計でもよいです。

#### `ownerManagerUserId`

誰が主に見ている接点か。

#### `organizationName`

組織名や会場名。必須。

#### `personName`

窓口担当者名。

#### `roleTitle`

編集者、店長、イベント担当など。

#### `status`

接触進行の主軸。CRM の中心。

#### `temperature`

温度感。主観だが大事。

#### `lastContactAt`

接点の鮮度管理に必須。

#### `nextAction`, `nextActionDueAt`

営業・関係構築を止めないために必須。

#### `notes`

Contact 自体の短いメモ。
長文は ManagerNote に逃がす。

#### `relationshipStrengthScore`

継続関係の強さを軽く持たせてもよい。

### 4-5. Prisma 例

```prisma
enum ExternalContactType {
  VENUE
  ORGANIZER
  MEDIA
  BRAND
  COMPANY
  COLLABORATOR
  AGENCY
  SPONSOR
  OTHER
}

enum ExternalContactStatus {
  NEW
  CONTACTED
  REPLIED
  MEETING_SCHEDULED
  IN_DISCUSSION
  NEGOTIATING
  ON_HOLD
  WON
  LOST
  ONGOING
}

enum ContactTemperature {
  UNKNOWN
  COLD
  NEUTRAL
  WARM
  HOT
}

model ExternalContact {
  id                        String                @id @default(cuid())

  creatorProfileId          String?
  ownerManagerUserId        String?

  projectId                 String?

  contactType               ExternalContactType

  organizationName          String
  personName                String?
  roleTitle                 String?

  email                     String?
  phone                     String?
  websiteUrl                String?
  socialUrl                 String?
  locationText              String?

  status                    ExternalContactStatus @default(NEW)
  temperature               ContactTemperature    @default(UNKNOWN)

  lastContactAt             DateTime?
  nextAction                String?
  nextActionDueAt           DateTime?

  notes                     String?               @db.Text
  tags                      String[]              @default([])

  sourceType                String                @default("MANUAL")
  sourceRef                 String?

  relationshipStrengthScore Int?
  lastOutcome               String?               @db.Text

  isArchived                Boolean               @default(false)

  createdAt                 DateTime              @default(now())
  updatedAt                 DateTime              @updatedAt

  @@index([creatorProfileId, status])
  @@index([ownerManagerUserId, status])
  @@index([projectId])
  @@index([contactType, status])
  @@index([nextActionDueAt])
  @@index([organizationName])
}
```

## 5. ActionLog モデル定義

### 5-1. 目的

ActionLog は、**起きた事実**を時系列で残すモデルです。
監査、振り返り、信頼蓄積、AI 文脈参照に使います。

Note や Contact の派生イベントも、必要ならここに書きます。

### 5-2. 必須フィールド

```ts
type ActionLog = {
  id: string;

  creatorProfileId: string | null;
  projectId: string | null;

  actorType: ActionActorType;
  actorUserId: string | null;

  actionType: ActionLogType;
  title: string;

  occurredAt: string;
  createdAt: string;
};
```

### 5-3. 推奨フィールド

```ts
type ActionLogExtended = ActionLog & {
  targetEntityType:
    | "PROJECT"
    | "GOAL"
    | "MEETING"
    | "MANAGER_NOTE"
    | "EXTERNAL_CONTACT"
    | "TASK"
    | "DRAFT"
    | "OPPORTUNITY"
    | "OTHER"
    | null;

  targetEntityId: string | null;

  summary: string | null;
  metadataJson: unknown | null;

  visibility: "INTERNAL" | "CREATOR_VISIBLE" | "SYSTEM_ONLY";
};
```

### 5-4. 各フィールドの意味

#### `creatorProfileId`

誰の文脈で起きたか。

#### `projectId`

Project 単位の時系列に使う。

#### `actorType`

Creator / Manager / AI Office / System を区別する。非常に重要。

#### `actorUserId`

人間 actor の場合は ID を持つ。
AI / SYSTEM では null 許容でもよい。

#### `actionType`

集計・検索・信頼根拠に使う中心キー。

#### `title`

一覧で読む短文。

#### `occurredAt`

実際の発生時刻。
`createdAt` と分けることで後記録にも対応できます。

#### `targetEntityType`, `targetEntityId`

どのオブジェクトに対するログか追えるようにします。

#### `summary`

短い説明。

#### `metadataJson`

柔軟性のために残すが、重要項目は JSON に逃がしすぎない。

#### `visibility`

Creator に見せるログかどうかを分けられる。

### 5-5. Prisma 例

```prisma
enum ActionActorType {
  CREATOR
  MANAGER
  AI_OFFICE
  SYSTEM
}

enum ActionLogType {
  PROJECT_CREATED
  PROJECT_UPDATED
  GOAL_UPDATED
  GOAL_ACHIEVED
  MEETING_CREATED
  MEETING_COMPLETED
  MANAGER_NOTE_CREATED
  MANAGER_NOTE_UPDATED
  CONTACT_CREATED
  CONTACT_UPDATED
  CONTACT_ACTIVITY_RECORDED
  TASK_CREATED
  TASK_COMPLETED
  AI_SUGGESTION_CREATED
  AI_SUGGESTION_ACCEPTED
  AI_SUGGESTION_REJECTED
  DRAFT_CREATED
  DRAFT_UPDATED
  OPPORTUNITY_LINKED
  STATUS_CHANGED
  OTHER
}

model ActionLog {
  id               String          @id @default(cuid())

  creatorProfileId String?
  projectId        String?

  actorType        ActionActorType
  actorUserId      String?

  actionType       ActionLogType
  title            String

  targetEntityType String?
  targetEntityId   String?

  summary          String?         @db.Text
  metadataJson     Json?

  visibility       String          @default("INTERNAL")

  occurredAt       DateTime
  createdAt        DateTime        @default(now())

  @@index([creatorProfileId, occurredAt])
  @@index([projectId, occurredAt])
  @@index([actorType, occurredAt])
  @@index([actionType, occurredAt])
  @@index([targetEntityType, targetEntityId])
}
```

## 6. 3モデルの関係性

### 6-1. 基本関係

- `ManagerNote` は `creatorProfileId` に必ず紐づく
- `ManagerNote` は任意で `externalContactId` を持てる
- `ExternalContact` は任意で `creatorProfileId` / `projectId` に紐づく
- `ActionLog` は広く全体イベントを記録する

### 6-2. 推奨フロー

#### 例1: 会場下見

1. `ExternalContact` に会場登録
2. Manager が下見して `ManagerNote` を作成
3. `ActionLog` に `MANAGER_NOTE_CREATED` を記録
4. `ExternalContact.lastContactAt` と `status` を更新
5. `ActionLog` に `CONTACT_UPDATED` を記録

#### 例2: 営業進行

1. `ExternalContact.status = CONTACTED`
2. Manager が面談メモを `ManagerNote`
3. AI が `aiSummary` を生成
4. 次アクション設定
5. `ActionLog` で追跡

## 7. 最初に実装するなら必須な制約

### 7-1. ManagerNote は削除より論理アーカイブ推奨

監査性のため、完全削除は避けたいです。

追加推奨:

```prisma
isArchived Boolean @default(false)
archivedAt DateTime?
```

### 7-2. ExternalContact は重複検知が必要

同じ会場 / 同じ企業が重複しやすいので、

- `organizationName`
- `personName`
- `creatorProfileId`

の近似重複検知を UI 側で持つと良いです。

### 7-3. ActionLog は直接編集しない

ActionLog は監査ログ寄りなので、原則 append-only に近づけるべきです。
訂正が必要なら補正ログを追加する方が安全です。

## 8. API 入出力の最小形

### 8-1. ManagerNote 作成

`POST /api/manager-notes`

```json
{
  "creatorProfileId": "cp_123",
  "authoredByManagerUserId": "user_mgr_1",
  "noteType": "VENUE_SCOUT",
  "visibility": "MANAGER_ONLY",
  "title": "渋谷会場の下見",
  "body": "音響は良いが搬入導線が狭い。平日夜の集客は厳しめ。",
  "projectId": "proj_123",
  "externalContactId": "contact_123",
  "urgencyScore": 3,
  "followUpNeeded": true,
  "followUpDueAt": "2026-03-28T12:00:00.000Z"
}
```

### 8-2. ExternalContact 作成

`POST /api/external-contacts`

```json
{
  "creatorProfileId": "cp_123",
  "ownerManagerUserId": "user_mgr_1",
  "contactType": "VENUE",
  "organizationName": "下北沢サンプルホール",
  "personName": "山田",
  "roleTitle": "ブッキング担当",
  "email": "example@example.com",
  "status": "NEW",
  "temperature": "UNKNOWN",
  "nextAction": "初回問い合わせ送信",
  "nextActionDueAt": "2026-03-27T09:00:00.000Z"
}
```

### 8-3. ActionLog 追加

原則はドメイン操作に応じて内部で書く方が安全です。
API 直叩きより、各更新処理内で append する運用を推奨します。

## 9. 最小版で追加したい補助モデル

厳密には今回の3つに加えて、将来かなり効く補助モデルが1つあります。

### ExternalContactActivity

接触単位の履歴です。
`ExternalContact` だけでも始められますが、営業・面談が増えると欲しくなります。

例:

```prisma
model ExternalContactActivity {
  id                String   @id @default(cuid())
  externalContactId String

  activityType      String
  happenedAt        DateTime

  title             String
  body              String?  @db.Text

  authoredByUserId  String?
  createdAt         DateTime @default(now())

  @@index([externalContactId, happenedAt])
}
```

最小版では `ActionLog` と `ManagerNote` で代替可能なので、初期は後回しでもよいです。

## 10. 結論

最小構成で最大効果を狙うなら、この3モデルの役割はこうです。

### ManagerNote

**人間の現場知を残す箱**

### ExternalContact

**対外関係の現在地を持つ箱**

### ActionLog

**起きた事実を積み上げる箱**

この3つを分けて設計すると、

- Manager Desk が機能する
- AI Office が文脈を扱いやすい
- Creator / Manager / AI Office の責任境界が保てる
- Trust / CRM / Meeting / Opportunity に自然拡張できる
