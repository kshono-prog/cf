# Meeting / Planner / Follow-up Minimum Contract v0.1

関連タスク:

- [Meeting / Planner / follow-up minimum contract](/Users/shounokazuaki/cf/docs/tasks/todo/2026-03-meeting-planner-minimum.md)
- [Manager Desk 要件定義](/Users/shounokazuaki/cf/docs/specs/manager-desk/requirements.md)
- [Creator Home 再設計案](/Users/shounokazuaki/cf/docs/specs/ux/creator-home-redesign.md)

## 目的

この文書は、Creator Home と Manager Desk の両方で使う
`Meeting / Planner / follow-up` の最小 contract を固定するためのものです。

ここで固定したいのは次の3点です。

- `Meeting` を何のためのレコードとして扱うか
- `follow-up` をどの source に残すか
- Creator Home と Manager Desk が共通で読める timeline input shape をどう定義するか

## 1. 基本原則

### 1-1. Meeting は「会議予定」ではなく「運営上の意思決定単位」

Meeting は単なるカレンダー枠ではない。
Creator と Manager が論点を持ち込み、意思決定し、次の action を残すための
**運営イベントの記録単位**として扱う。

### 1-2. follow-up は当面、source record に残す

phase 1 では、`ActivityTask` を急いで永続化しない。
その代わり、follow-up は source ごとに保持する。

- `ManagerNote.followUp*`
- `ExternalContact.nextAction*`
- future `Meeting.nextAction*`

つまり、**follow-up は generic task box に集約する前に、まず文脈を持つ source に残す**。

### 1-3. Planner は write model ではなく read model から始める

Planner は最初から重い scheduler にしない。
まずは各 source から timeline item を合成する
**shared timeline read model** として始める。

### 1-4. Creator Home と Manager Desk は同じ timeline language を使う

creator-side と manager-side で別の timeline shape を作らない。
visibility と ownerRole だけを切り替えて、同じ input shape から両画面を構成する。

### 1-5. AI は Meeting / follow-up を提案・整理するが確定しない

AI Office は agenda、summary、missing items、follow-up candidates を出してよい。
ただし、会議の確定、対外送信、不可逆 action の確定は人が担う。

## 2. 責務境界

### 2-1. Meeting

Meeting は次を担う。

- scheduled collaboration slot
- agenda
- notes
- decisions
- next action summary
- optional next meeting suggestion

Meeting は次を担わない。

- full calendar sync
- recurring rule management
- generic task management
- notification delivery

### 2-2. follow-up

follow-up は「誰かが次に確認・連絡・実行すべきこと」だが、
phase 1 では source を失わない形で持つ。

#### ManagerNote follow-up

- 現場観測や所感に紐づく follow-up
- 例: 「搬入導線を次回会議で確認」「体調面を来週確認」

#### ExternalContact next action

- 対外関係の進行に紐づく follow-up
- 例: 「主催者に再連絡」「条件返信を待つ」

#### Meeting next action

- 会議結果として決まった follow-up
- 例: 「金曜までに予算案を確認」「次回面談を設定」

### 2-3. ActivityTask

`ActivityTask` は将来、
source を横断して assignment / status / completion を持つ generic task model になる。

ただし phase 1 では導入しない。
最初は source-specific follow-up を残し、timeline read model で束ねる。

## 3. Meeting Minimal Contract

## 3-1. 最小 field set

```ts
type MeetingType =
  | "WEEKLY_REVIEW"
  | "RELEASE_CHECK"
  | "OUTREACH_PROGRESS"
  | "EVENT_PREP"
  | "RETROSPECTIVE"
  | "URGENT_RESPONSE"
  | "OTHER";

type MeetingStatus = "SCHEDULED" | "COMPLETED" | "CANCELED";

type MeetingVisibility = "INTERNAL" | "CREATOR_VISIBLE";

type Meeting = {
  id: string;
  creatorProfileId: string;
  managerAssignmentId: string | null;
  projectId: string | null;

  meetingType: MeetingType;
  status: MeetingStatus;
  visibility: MeetingVisibility;

  title: string;
  scheduledAt: string;
  durationMinutes: number | null;
  locationText: string | null;

  agenda: string | null;
  notes: string | null;
  decisions: string | null;
  nextActionsSummary: string | null;
  aiSummary: string | null;
  nextMeetingSuggestionAt: string | null;

  createdByWalletAddress: string;
  createdAt: string;
  updatedAt: string;
};
```

## 3-2. field 意味

### `title`

一覧で分かる会議名。

### `scheduledAt`

timeline と upcoming 表示の基準時刻。

### `agenda`

会議前の論点整理。
AI Office の提案先として重要。

### `notes`

会議中のメモ。

### `decisions`

会議の結果、何が決まったか。

### `nextActionsSummary`

会議で決まった follow-up の短いまとめ。
phase 1 では structured task list まで求めない。

### `visibility`

Creator Home に見せる会議か、internal-only かを分ける。

## 3-3. state transition

最初は次だけでよい。

`SCHEDULED -> COMPLETED`

`SCHEDULED -> CANCELED`

再 scheduling や recurring は後段で扱う。

## 4. follow-up Source Of Truth

phase 1 の source of truth は次です。

| follow-up kind | source of truth | 使い道 |
| --- | --- | --- |
| 現場メモ起点 | `ManagerNote.followUpNeeded`, `followUpDueAt` | Manager Desk / Creator Home の次アクション候補 |
| 対外接点起点 | `ExternalContact.nextAction`, `nextActionDueAt` | CRM / Desk / timeline |
| 会議起点 | future `Meeting.nextActionsSummary`, `scheduledAt` | upcoming meeting / decision follow-up |
| generic task | future `ActivityTask` | completion / assignment / status 管理 |

重要なのは、**phase 1 では follow-up を generic task に flatten しないこと**です。

## 5. Shared Timeline Input Shape

## 5-1. 最小 shape

```ts
type PlannerTimelineSourceType =
  | "MEETING"
  | "MANAGER_NOTE_FOLLOW_UP"
  | "EXTERNAL_CONTACT_NEXT_ACTION"
  | "PROJECT_DEADLINE"
  | "SYSTEM_REMINDER";

type PlannerTimelineStatus =
  | "UPCOMING"
  | "DUE_SOON"
  | "OVERDUE"
  | "COMPLETED"
  | "CANCELED";

type PlannerTimelineOwnerRole = "CREATOR" | "MANAGER" | "SHARED" | "SYSTEM";

type PlannerTimelineVisibility =
  | "MANAGER_ONLY"
  | "CREATOR_AND_MANAGER"
  | "CREATOR_ONLY";

type PlannerTimelineItem = {
  id: string;
  sourceType: PlannerTimelineSourceType;
  sourceId: string;

  creatorProfileId: string;
  relatedProjectId: string | null;
  relatedContactId: string | null;
  relatedMeetingId: string | null;

  title: string;
  summary: string | null;

  dueAt: string | null;
  occurredAt: string | null;
  status: PlannerTimelineStatus;
  priority: "HIGH" | "MEDIUM" | "LOW";

  ownerRole: PlannerTimelineOwnerRole;
  visibility: PlannerTimelineVisibility;
  isDerived: boolean;

  href: string | null;
};
```

## 5-2. source mapping

### Meeting -> timeline

- `sourceType = "MEETING"`
- `dueAt = scheduledAt`
- `title = title`
- `summary = agenda or aiSummary`

### ManagerNote follow-up -> timeline

- `sourceType = "MANAGER_NOTE_FOLLOW_UP"`
- `dueAt = followUpDueAt`
- `title = note.title`
- `summary = aiSummary or body excerpt`

### ExternalContact next action -> timeline

- `sourceType = "EXTERNAL_CONTACT_NEXT_ACTION"`
- `dueAt = nextActionDueAt`
- `title = organizationName + nextAction`
- `summary = status / temperature / lastOutcome`

### Project deadline -> timeline

- `sourceType = "PROJECT_DEADLINE"`
- `dueAt = goal.deadline`
- `title = project title`
- `summary = progress / target / remaining amount`

## 5-3. status derivation

phase 1 の derived rule は次で十分です。

- dueAt が未来で 7 日超: `UPCOMING`
- dueAt が未来で 7 日以内: `DUE_SOON`
- dueAt が現在以前で未完了 source: `OVERDUE`
- source が完了済み: `COMPLETED`
- source が canceled 状態: `CANCELED`

## 5-4. visibility rule

### Creator Home

表示してよいのは次だけ。

- `Meeting.visibility = CREATOR_VISIBLE`
- `ManagerNote.visibility = SHAREABLE_WITH_CREATOR` 由来
- creator-visible な project / deadline / reminder

### Manager Desk

表示してよいのは次。

- manager-assigned creator の `MANAGER_ONLY`
- `CREATOR_AND_MANAGER`
- internal meeting

## 6. Phase 1 実装順

### MP-1

Meeting minimal contract を docs で固定する。

### MP-2

shared timeline input shape を docs で固定する。

### MP-3

次にやる implementation slice は次。

1. Meeting schema proposal
2. timeline read model helper
3. Creator Home `Upcoming / Planner`
4. Manager Desk `Upcoming / Planner`

## 7. Non-Goals

- Google Calendar / Apple Calendar 同期
- recurring events
- full task board
- notification delivery
- approval workflow の複雑化

## 8. 決定事項

- `Meeting` は first-class entity にする
- `Planner` は最初は read model として始める
- `follow-up` は source-specific に持ち、phase 1 では generic task へ急がない
- `Creator Home` と `Manager Desk` は同じ timeline item shape を使う
