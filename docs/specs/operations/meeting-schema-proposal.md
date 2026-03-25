# Meeting Schema Proposal v0.1

## Status

implemented on 2026-03-26. the additive Prisma schema, migration, Meeting APIs, and shared planner timeline are now in code.

## Purpose

この文書は、
[Meeting / Planner / Follow-up Minimum Contract](/Users/shounokazuaki/cf/docs/specs/operations/meeting-planner-follow-up-minimum.md)
を、**現在の Creator Founding の Prisma schema と認証構造に合わせて実装可能な proposal**
に落とすためのものです。

対象は次の2つです。

- `Meeting` の additive schema proposal
- Creator Home / Manager Desk で共通に使う shared timeline read model proposal

## Current Constraints

### 1. actor identity は wallet address ベース

現行 owner auth は wallet address ベースです。
したがって meeting author も phase 1 では `createdByWalletAddress` を使うのが自然です。

### 2. 既存の relation key は `BigInt`

現在の主要 relation key は `BigInt` です。

- `CreatorProfile.id`
- `Project.id`

そのため `Meeting.creatorProfileId` と `Meeting.projectId` も `BigInt` に揃える。

### 3. manager core models はすでに導入済み

`ManagerAssignment / ManagerNote / ExternalContact / ActionLog`
は phase 1 実装済みです。
Meeting proposal はこれらと衝突せず、follow-up source を補完する形に留める。

### 4. Creator Home と Manager Desk で visibility が異なる

同じ timeline shape を使う一方で、
Creator Home にそのまま見せてよい情報と Manager Desk の internal 情報は分ける必要があります。

### 5. 高リスク領域とは分離する

今回の proposal は運営メモリと timeline のための追加です。
bridge / distribution / fund movement の挙動は変更しません。

## Proposed Enums

```prisma
enum MeetingType {
  WEEKLY_REVIEW
  RELEASE_CHECK
  OUTREACH_PROGRESS
  EVENT_PREP
  RETROSPECTIVE
  URGENT_RESPONSE
  OTHER
}

enum MeetingStatus {
  SCHEDULED
  COMPLETED
  CANCELED
}

enum MeetingVisibility {
  INTERNAL
  CREATOR_VISIBLE
}
```

## Proposed Model

```prisma
model Meeting {
  id                      String            @id @default(cuid())
  creatorProfileId        BigInt
  managerAssignmentId     String?
  projectId               BigInt?

  createdByWalletAddress  String

  meetingType             MeetingType       @default(OTHER)
  status                  MeetingStatus     @default(SCHEDULED)
  visibility              MeetingVisibility @default(CREATOR_VISIBLE)

  title                   String
  scheduledAt             DateTime          @db.Timestamptz(6)
  durationMinutes         Int?
  locationText            String?

  agenda                  String?           @db.Text
  notes                   String?           @db.Text
  decisions               String?           @db.Text
  nextActionsSummary      String?           @db.Text
  aiSummary               String?           @db.Text
  nextMeetingSuggestionAt DateTime?         @db.Timestamptz(6)

  createdAt               DateTime          @default(now()) @db.Timestamptz(6)
  updatedAt               DateTime          @updatedAt @db.Timestamptz(6)

  creatorProfile          CreatorProfile    @relation(fields: [creatorProfileId], references: [id], onDelete: Cascade)
  managerAssignment       ManagerAssignment? @relation(fields: [managerAssignmentId], references: [id], onDelete: SetNull)
  project                 Project?          @relation(fields: [projectId], references: [id], onDelete: SetNull)

  @@index([creatorProfileId, scheduledAt])
  @@index([managerAssignmentId, scheduledAt])
  @@index([projectId, scheduledAt])
  @@index([status, scheduledAt])
  @@index([visibility, scheduledAt])
}
```

## Design Decisions

### 1. `Meeting` 自体の id は `String @default(cuid())`

理由:

- API で扱いやすい
- `ActionLog.targetEntityId` と相性がよい
- manager core models の id strategy と揃う

### 2. decisions と next actions は phase 1 では free text

phase 1 では次を急がない。

- child table の `MeetingDecision`
- child table の `MeetingAction`
- attendee table

まずは `decisions` と `nextActionsSummary` で十分です。

### 3. `Meeting` は soft delete ではなく status 管理で始める

phase 1 では `CANCELED` を持つので、
まずは soft delete を増やさず status で十分とする。

### 4. ExternalContact には visibility がない

そのため phase 1 の timeline では、
`ExternalContact` 起点の item は基本的に `MANAGER_ONLY` 扱いにする。
Creator Home へ直接見せるのは、将来 visibility 設計を入れてからにする。

## Reverse Relations Needed

実装時は既存モデルにも additive relation を追加する。

### CreatorProfile

```prisma
meetings Meeting[]
```

### Project

```prisma
meetings Meeting[]
```

### ManagerAssignment

```prisma
meetings Meeting[]
```

## Shared Timeline Read Model Proposal

## Read Model Goal

`Planner` をまず read model として成立させる。
write source は次です。

- `Meeting`
- `ManagerNote.followUp*`
- `ExternalContact.nextAction*`
- project goal deadline

## Proposed Read Helper

```ts
type PlannerActorMode = "CREATOR_HOME" | "MANAGER_DESK";

type GetPlannerTimelineArgs = {
  creatorProfileId: bigint;
  actorAddress: string;
  actorMode: PlannerActorMode;
  limit?: number;
};

type PlannerTimelineData = {
  items: PlannerTimelineItem[];
  summary: {
    overdueCount: number;
    dueSoonCount: number;
    meetingCount: number;
    followUpCount: number;
    managerOnlyCount: number;
  };
  generatedAt: string;
};
```

## Read Composition Rules

### Creator Home

含める source:

- `Meeting.visibility = CREATOR_VISIBLE`
- `ManagerNote.visibility = SHAREABLE_WITH_CREATOR` かつ `followUpNeeded = true`
- project deadline

除外する source:

- internal-only meeting
- manager-only notes
- external contact next action

### Manager Desk

含める source:

- assigned creator のすべての meeting
- manager note follow-up
- external contact next action
- project deadline

## Priority Rules

phase 1 は deterministic でよい。

- overdue follow-up: `HIGH`
- due within 3 days: `HIGH`
- due within 7 days: `MEDIUM`
- future scheduled items: `LOW`

## ActionLog Integration

meeting create / completion 時には、次の event を append する。

- `MEETING_CREATED`
- `MEETING_COMPLETED`

必要に応じて `STATUS_CHANGED` を併用する。

## API Direction

phase 1 では専用 API を急いで細分化しすぎず、
まずは server-side read helper を先に作る。

候補:

- `/api/manager-desk/creators/[creatorProfileId]/planner`
- `/api/mypage/planner`

ただし実装順は、helper -> surface integration -> API の順でもよい。

## Migration Impact

### Additive Changes Only

想定変更は additive のみです。

- new enums: `MeetingType`, `MeetingStatus`, `MeetingVisibility`
- new table: `Meeting`
- reverse relations on `CreatorProfile / Project / ManagerAssignment`

### Existing High-Risk Flows

影響なし。

- contributions
- goal achievement
- distribution
- bridge
- settlement

### Existing Manager Models

破壊的変更なし。

- `ManagerNote`
- `ExternalContact`
- `ActionLog`

## Rollback Concern

Meeting rows の書き込み開始後に table を drop するとデータ消失になる。
そのため rollback は基本的に非推奨で、forward-fix を優先する。

もし緊急停止が必要なら、

- route を閉じる
- UI 導線を隠す
- read helper を無効化する

という順で運用停止する方が安全です。

## Out Of Scope

- recurring meeting
- attendee management
- calendar provider sync
- notification delivery
- generic `ActivityTask` schema
- approval workflow の詳細拡張

## Next Step

この proposal が承認されたら、次の順で進める。

1. Prisma schema update
2. migration SQL
3. read helper for shared timeline
4. Creator Home `Upcoming / Planner`
5. Manager Desk `Upcoming / Planner`
