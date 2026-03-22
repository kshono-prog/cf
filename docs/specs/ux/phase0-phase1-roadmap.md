# UX Phase 0-1 Roadmap

## Purpose

Phase 0 and Phase 1 fix the current mismatch between implementation structure and user understanding.

The immediate goal is not final visual polish.
The goal is to make the product understandable:

- what this screen is for
- what the user should do next
- which action is primary
- which terms are internal-only and should not appear in UI

## Phase 0

Phase 0 defines information architecture before major UI edits.

### Screen Purpose

- public profile:
  support a creator, understand current goal, decide whether to contribute
- noUser mypage:
  create an account and understand what becomes available next
- userOnly mypage:
  complete profile basics and apply to become a creator
- creatorReady mypage:
  manage ongoing creator operations from a daily-work entry point
- AI Office:
  see what AI recommends, create new AI work, approve or reject pending work
  inbox should prioritize `approval queue -> bulk action -> recent history`
  approval-required work should stay visible from `Overview` and `Create`, not only inside `Inbox`
- settlement:
  move from funding state to distribution state with explicit safety checks

### Primary CTA Rules

- one primary CTA per screen
- dangerous actions must be visually separated from routine actions
- advanced or audit-oriented controls should not compete with the main action

### Terminology Rules

Internal terms should not be shown raw unless the user is clearly an operator.

- `PROPOSE` -> `提案を作る`
- `ANALYZE` -> `活動を分析する`
- `TRANSLATE` -> `翻訳案を作る`
- `WEEKLY_REPORT` -> `週次レポート案を作る`
- `ANNOUNCEMENT_DRAFT` -> `告知文案を作る`
- `SUPPORTER_MESSAGE_DRAFT` -> `支援者メッセージ案を作る`

`WAITING_APPROVAL`, `DONE`, `FAILED` should also have user-facing labels and helper text.

Settlement and operator-facing statuses also need user-facing labels.

- `NOT_READY` -> `準備中`
- `BRIDGING` -> `ブリッジ進行中`
- `READY_FOR_DISTRIBUTION` -> `配分準備完了`
- `DISTRIBUTED` -> `配分完了`
- `DRAFT` -> `下書き`
- `QUEUED` -> `送信待ち`
- `SENT` -> `送信済み`
- `FAILED` -> `失敗`
- `CANCELLED` -> `対象外`

### Message Rules

- error message:
  say what failed and what the user can do next
- success message:
  say what changed and where to check it
- empty state:
  explain why the list is empty and what creates the first item
- success / error notice:
  use the same visual pattern across `Overview / Create / Inbox`
- empty state:
  use the same dashed card pattern across `Overview / Create / Inbox`
- extend the same notice / empty-state pattern into `settlement` and `mypage`
- in `settlement`, keep `execution logs` in the main review flow, but move `CCTP` and `manual result controls` into advanced areas

Message style examples:

- bad: `DISTRIBUTION_SAVE_FAILED`
- good: `配分下書きを保存できませんでした。入力内容を確認してもう一度お試しください。`
- bad: `WAITING_APPROVAL`
- good: `承認待ち`
- bad: `TASK_CREATED_WAITING_APPROVAL`
- good: `承認待ちで作成`

## Phase 1

Phase 1 improves the early user journey.

### Target Flow

1. wallet connect
2. user registration
3. basic profile confirmation
4. creator apply
5. creator-ready workspace entry

### UX Requirements

- the current step must always be visible
- the next action must be obvious
- forms should explain why the information is needed
- creatorReady should open with daily work priorities, not implementation-oriented grouping

### creatorReady Entry Direction

The top of creatorReady should prioritize:

1. today’s actions
2. project / goal health
3. AI Office inbox
4. advanced management sections

Accordion structure can remain temporarily, but the first visible area should act as a dashboard.

## Phase 2

Phase 2 はユーザー属性によるUX分岐と、クリエイターワークスペースの2モード化を実装する。

### User Role Separation

- public page (`/[username]`) はファン向けとして独立させる
- creatorReady mypage (`/[username]/mypage`) はクリエイター専用とする
- クリエイターが自分の `/[username]` にアクセスした場合のみ管理ストリップを表示する
- ファンが `/[username]` にアクセスしても管理要素は一切表示しない

### Workspace 2-Mode Structure

クリエイターワークスペースのナビゲーションを以下の2モードに統一する:

- `今日の仕事`: AI事務所が主役。承認待ちが常に最上部。投稿・サマリー・履歴が続く。
- `設定・準備`: プロフィール・プロジェクト・ウォレット・精算のみ。AI Officeは含まない。

### AI Office 配置原則

- AI事務所は `今日の仕事` モードの主画面にのみ存在する
- `設定・準備` モードや `SettingsPageClient` にAI Officeパネルを重複配置しない
- `公開ページを見る` タブは廃止し、ヘッダーボタン + 公開ページの管理ストリップで代替する

### Screen Purpose（Phase 2 追加分）

- 今日の仕事モード: AI事務所の承認待ちを処理し、AIに依頼し、活動状況を確認する
- 設定・準備モード: 公開情報を整え、プロジェクトを管理し、精算を操作する
- 公開ページ（管理ストリップ付き）: ファンに見えているものをそのまま確認する

## Out of Scope

- final brand polish
- complete public profile redesign
- AI による完全自動投稿・完全自動意思決定

Those belong to later UX phases after Phase 0, 1, and 2 are implemented and reviewed.
