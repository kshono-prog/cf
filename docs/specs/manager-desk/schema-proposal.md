# Manager Core Schema Proposal v0.1

## Status

phase 1 approved and implemented on 2026-03-26.

## Purpose

この文書は、[`Manager Desk データモデル定義`](/Users/shounokazuaki/cf/docs/specs/manager-desk/data-models.md) を、
**現在の Creator Founding の Prisma schema と認証構造に合わせて実装可能な形**に落とすための proposal です。

対象は次の 4 モデルです。

- `ManagerAssignment`
- `ManagerNote`
- `ExternalContact`
- `ActionLog`

この文書は承認用 proposal として作成し、その後 phase 1 実装の参照基準として使う。

## Current Constraints

### 1. generic `User` model がない

現行 schema には共通の `User` / `Member` テーブルがありません。
人の識別は、主に次の 2 系統です。

- `CreatorProfile`
- wallet address / owner session

### 2. actor identity は wallet address ベース

現在の owner auth は wallet address を主軸にしており、
`managerUserId` のような参照先はまだ存在しません。

### 3. 既存の主要 relation key は `BigInt`

既存 schema では次が `BigInt` です。

- `CreatorProfile.id`
- `Project.id`
- `Goal.id`

したがって新モデルも、これらへ紐づく foreign key は `BigInt` に合わせる必要があります。

### 4. 高リスク領域とは分離する

今回の追加は Manager / CRM / activity memory の基盤です。
bridge / distribution / fund movement の挙動は変更しません。

## Phase 1 Identity Strategy

### 結論

phase 1 では、人間 actor の identity は **normalized wallet address** を正とします。

つまり、abstract spec に出てくる `...UserId` は、
現在の実装 proposal では次のように置き換えます。

- `authoredByManagerUserId` -> `authoredByManagerWalletAddress`
- `ownerManagerUserId` -> `ownerManagerWalletAddress`
- `actorUserId` -> `actorWalletAddress`

### この方針を取る理由

- 現行 auth と整合する
- schema 追加を最小化できる
- `User` / `Member` / RBAC を今すぐ固定しなくてよい
- 将来、専用 member table を追加する場合も additive migration で進めやすい

### トレードオフ

- wallet を持たない internal staff は phase 1 では扱いにくい
- manager identity の表示名管理は別途必要になる可能性がある
- 後で `User` / `Member` table を足す場合、backfill が必要になる

### 将来の移行余地

将来 generic member model を導入する場合は、
次のような additive migration を想定する。

- `managerMemberId`
- `authoredByMemberId`
- `actorMemberId`

phase 1 の address columns はすぐ消さず、移行期間中は併存させる。

## Model Design Decisions

### 1. relation key は既存モデルに合わせる

- `creatorProfileId`: `BigInt`
- `projectId`: `BigInt`

### 2. 新モデル自身の id は `String @default(cuid())`

理由:

- API で扱いやすい
- `ActionLog.targetEntityId` と合わせやすい
- 既存の app-specific string id モデルとも相性がよい

### 3. `ActionLog` は append-first

`ActionLog` は mutable state ではなく event history として扱う。
更新や訂正は原則「上書き」ではなく追加ログで補う。

### 4. `ManagerNote` は論理アーカイブ前提

監査性のため、phase 1 から `isArchived` / `archivedAt` を持つ。

### 5. `ExternalContact` は lightweight CRM に留める

巨大 marketplace 用の抽象モデルにはしない。
まずは creator / manager 運営に必要な最小 contact state を持つ。

## Proposed Enums

```prisma
enum ManagerAssignmentRole {
  PRIMARY
  SUPPORTING
}

enum ManagerAssignmentStatus {
  ACTIVE
  PAUSED
  ENDED
}

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

enum ExternalContactSourceType {
  MANUAL
  IMPORTED
  AI_SUGGESTED
}

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

enum ActionLogVisibility {
  INTERNAL
  CREATOR_VISIBLE
  SYSTEM_ONLY
}

enum ActionTargetEntityType {
  PROJECT
  GOAL
  MEETING
  MANAGER_ASSIGNMENT
  MANAGER_NOTE
  EXTERNAL_CONTACT
  TASK
  DRAFT
  OPPORTUNITY
  OTHER
}
```

### Note

phase 1 の assignment event は enum を増やしすぎず、`STATUS_CHANGED` へ集約して扱う。

## Proposed Models

以下の Prisma 例では、既存モデル側の reverse relation は省略しています。
実装時は `CreatorProfile` / `Project` 側にも必要な relation field を追加します。

### ManagerAssignment

```prisma
model ManagerAssignment {
  id                   String                  @id @default(cuid())
  creatorProfileId     BigInt
  managerWalletAddress String

  roleType             ManagerAssignmentRole   @default(PRIMARY)
  status               ManagerAssignmentStatus @default(ACTIVE)

  assignedAt           DateTime                @default(now()) @db.Timestamptz(6)
  endedAt              DateTime?               @db.Timestamptz(6)
  createdAt            DateTime                @default(now()) @db.Timestamptz(6)
  updatedAt            DateTime                @updatedAt @db.Timestamptz(6)

  creatorProfile       CreatorProfile          @relation(fields: [creatorProfileId], references: [id], onDelete: Cascade, onUpdate: NoAction)
  managerNotes         ManagerNote[]
  externalContacts     ExternalContact[]
  actionLogs           ActionLog[]

  @@index([creatorProfileId, status])
  @@index([managerWalletAddress, status])
  @@index([creatorProfileId, roleType, status])
}
```

設計メモ:

- phase 1 では `managerWalletAddress` を actor identity にする
- `PRIMARY` の active assignment は creator ごとに 1 件を想定する
- ただし partial unique 制約は Prisma 単体で表現しづらいため、phase 1 では service layer で守る

### ManagerNote

```prisma
model ManagerNote {
  id                           String             @id @default(cuid())
  creatorProfileId             BigInt
  authoredByManagerWalletAddress String

  managerAssignmentId          String?
  projectId                    BigInt?
  externalContactId            String?
  relatedMeetingId             String?

  noteType                     ManagerNoteType
  visibility                   NoteVisibility

  title                        String
  body                         String             @db.Text

  urgencyScore                 Int?
  followUpNeeded               Boolean            @default(false)
  followUpDueAt                DateTime?          @db.Timestamptz(6)

  aiSummary                    String?            @db.Text
  aiTags                       String[]           @default([])

  isArchived                   Boolean            @default(false)
  archivedAt                   DateTime?          @db.Timestamptz(6)

  createdAt                    DateTime           @default(now()) @db.Timestamptz(6)
  updatedAt                    DateTime           @updatedAt @db.Timestamptz(6)

  creatorProfile               CreatorProfile     @relation(fields: [creatorProfileId], references: [id], onDelete: Cascade, onUpdate: NoAction)
  managerAssignment            ManagerAssignment? @relation(fields: [managerAssignmentId], references: [id], onDelete: SetNull, onUpdate: NoAction)
  project                      Project?           @relation(fields: [projectId], references: [id], onDelete: SetNull, onUpdate: NoAction)
  externalContact              ExternalContact?   @relation(fields: [externalContactId], references: [id], onDelete: SetNull, onUpdate: NoAction)

  @@index([creatorProfileId, createdAt])
  @@index([managerAssignmentId, createdAt])
  @@index([externalContactId])
  @@index([projectId])
  @@index([followUpDueAt])
  @@index([noteType, visibility, createdAt])
}
```

設計メモ:

- author は `walletAddress` で残す
- assignment を optional にすることで、移行初期や例外対応でも書けるようにする
- `relatedMeetingId` は phase 1 では relation を張らず string 参照に留める

### ExternalContact

```prisma
model ExternalContact {
  id                         String                @id @default(cuid())

  creatorProfileId           BigInt?
  ownerManagerWalletAddress  String?
  ownerManagerAssignmentId   String?
  projectId                  BigInt?

  contactType                ExternalContactType

  organizationName           String
  personName                 String?
  roleTitle                  String?

  email                      String?
  phone                      String?
  websiteUrl                 String?
  socialUrl                  String?
  locationText               String?

  status                     ExternalContactStatus @default(NEW)
  temperature                ContactTemperature    @default(UNKNOWN)

  lastContactAt              DateTime?
  nextAction                 String?
  nextActionDueAt            DateTime?

  notes                      String?               @db.Text
  tags                       String[]              @default([])

  sourceType                 ExternalContactSourceType @default(MANUAL)
  sourceRef                  String?

  relationshipStrengthScore  Int?
  lastOutcome                String?               @db.Text

  isArchived                 Boolean               @default(false)

  createdAt                  DateTime              @default(now()) @db.Timestamptz(6)
  updatedAt                  DateTime              @updatedAt @db.Timestamptz(6)

  creatorProfile             CreatorProfile?       @relation(fields: [creatorProfileId], references: [id], onDelete: SetNull, onUpdate: NoAction)
  ownerManagerAssignment     ManagerAssignment?    @relation(fields: [ownerManagerAssignmentId], references: [id], onDelete: SetNull, onUpdate: NoAction)
  project                    Project?              @relation(fields: [projectId], references: [id], onDelete: SetNull, onUpdate: NoAction)
  managerNotes               ManagerNote[]

  @@index([creatorProfileId, status])
  @@index([ownerManagerWalletAddress, status])
  @@index([ownerManagerAssignmentId, status])
  @@index([projectId])
  @@index([contactType, status])
  @@index([nextActionDueAt])
  @@index([organizationName])
}
```

設計メモ:

- contact owner も phase 1 は wallet address ベース
- `creatorProfileId` は nullable にして、将来の shared contact に余地を残す
- 長文の現場知は `ManagerNote` に逃がし、`notes` は短めの補足に留める

### ActionLog

```prisma
model ActionLog {
  id                   String               @id @default(cuid())

  creatorProfileId     BigInt?
  projectId            BigInt?
  managerAssignmentId  String?

  actorType            ActionActorType
  actorWalletAddress   String?

  actionType           ActionLogType
  title                String

  targetEntityType     ActionTargetEntityType?
  targetEntityId       String?

  summary              String?              @db.Text
  metadataJson         Json?

  visibility           ActionLogVisibility  @default(INTERNAL)

  occurredAt           DateTime             @db.Timestamptz(6)
  createdAt            DateTime             @default(now()) @db.Timestamptz(6)

  creatorProfile       CreatorProfile?      @relation(fields: [creatorProfileId], references: [id], onDelete: SetNull, onUpdate: NoAction)
  project              Project?             @relation(fields: [projectId], references: [id], onDelete: SetNull, onUpdate: NoAction)
  managerAssignment    ManagerAssignment?   @relation(fields: [managerAssignmentId], references: [id], onDelete: SetNull, onUpdate: NoAction)

  @@index([creatorProfileId, occurredAt])
  @@index([projectId, occurredAt])
  @@index([managerAssignmentId, occurredAt])
  @@index([actorType, occurredAt])
  @@index([actionType, occurredAt])
  @@index([targetEntityType, targetEntityId])
}
```

設計メモ:

- `targetEntityId` は対象が `BigInt` と `String` に跨るため string に揃える
- 重要な検索キーは column に置き、`metadataJson` へ逃がしすぎない
- `ActionLog` は direct public API を作らず、domain operation の内部 append を原則にする

## Minimal API Contract

### ManagerAssignment

- `GET /api/manager-assignments?creatorProfileId=...`
- `POST /api/manager-assignments`
- `PATCH /api/manager-assignments/:id`

phase 1 rule:

- 書き込みは owner session + manager assignment 管理権限の確認が必要
- `ACTIVE PRIMARY` の重複チェックは service layer で行う

### ManagerNote

- `GET /api/manager-notes?creatorProfileId=...`
- `POST /api/manager-notes`
- `PATCH /api/manager-notes/:id`

phase 1 rule:

- 作成 / 更新時に `MANAGER_NOTE_CREATED` or `MANAGER_NOTE_UPDATED` を `ActionLog` に append する
- Creator への表示は `visibility = SHAREABLE_WITH_CREATOR` のみ

### ExternalContact

- `GET /api/external-contacts?creatorProfileId=...`
- `POST /api/external-contacts`
- `PATCH /api/external-contacts/:id`

phase 1 rule:

- status / next action 更新時に `CONTACT_UPDATED` を append する
- 同一 creator 下での `organizationName + personName` 近似重複は UI で警告する

### ActionLog

- direct `POST /api/action-logs` は作らない
- `appendActionLog()` のような internal helper からのみ書く

理由:

- 監査性を守りやすい
- arbitrary log injection を防ぎやすい
- event naming を集中管理できる

## Service-Layer Rules

schema だけでは守れないが、phase 1 で必ず service layer で守るもの:

- creator ごとに `ACTIVE PRIMARY` manager は最大 1 件
- `ManagerNote.visibility` に応じた read boundary
- `ActionLog` は append-only 運用
- `managerWalletAddress` / `actorWalletAddress` / `authoredByManagerWalletAddress` は normalize 済みで保存する

## Migration Impact

### 影響の種類

additive migration です。
既存テーブルの削除や高リスク列の変更は含みません。

追加対象:

- 4 tables
- related enums
- new indexes
- `CreatorProfile` / `Project` の reverse relation field

### 既存機能への影響

- 既存の Creator / Project / Goal / settlement / bridge flow には直接変更を入れない
- backfill は必須ではない
- 新機能が書き込みを始めるまで、既存画面の挙動は変わらない

### パフォーマンス観点

- `ActionLog` は成長しやすいので index の絞り込みを意識する
- `ExternalContact.organizationName` index は軽量 CRM 用の検索性優先

## Rollback Concerns

### 1. migration 後にデータが入り始めた場合

DB rollback で table drop をするとデータ損失になる。
そのため、問題が出た場合は **feature flag / route disable / write stop** を優先し、
DB は forward-fix を基本とする。

### 2. phase 1 identity の将来変更

wallet address ベースの設計は暫定ではあるが、
後で `Member` table を追加しても additive migration で吸収できるようにしている。
ただし backfill job は必要になる。

### 3. `ActionLog` の運用逸脱

途中で mutable log にしてしまうと監査性が崩れる。
rollback しにくいので、最初から append-first を守る必要がある。

## Recommended Implementation Order

1. `ManagerAssignment`
   manager identity と creator への割当を先に作る
2. `ManagerNote`
   現場知の入力導線を先に作る
3. `ExternalContact`
   lightweight CRM を足す
4. `ActionLog`
   write path に内部 append helper を接続する

## Approval Gate

この proposal は **Prisma schema 変更前の承認が必要** です。

実装に進む前に確認すべき点:

- phase 1 identity を wallet address ベースで進めること
- `ACTIVE PRIMARY` 制約を service layer で持つこと
- rollback は DB drop ではなく forward-fix 前提で考えること
- `Meeting / ActivityTask / TrustProfile` は今回 scope 外に留めること
