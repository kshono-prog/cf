# Task

Meeting / Planner / follow-up minimum contract

Status:

- `MP-1` 完了
- `MP-2` 完了
- `MP-3` 完了
- next: AI operational assistance on structured context

## Goal

Creator Home と Manager Desk の両方に、
`次の会議 / 次の期限 / 次のフォローアップ` を載せられる最小 contract を定義する。

## Scope

- `Meeting` の最小 field set を定義する
- `next action` と `follow-up` の責務を整理する
- `ManagerNote.followUp*`、`ExternalContact.nextAction*`、将来の `ActivityTask` の境界を決める
- `Creator Home` と `Manager Desk` に共通で使える timeline input shape を決める

## Non-Goals

- full calendar UI
- recurring schedule
- notification delivery
- complete task management app 化

## Files Likely Affected

- `/Users/shounokazuaki/cf/docs/specs/operations/meeting-planner-follow-up-minimum.md`
- `/Users/shounokazuaki/cf/docs/specs/manager-desk/requirements.md`
- `/Users/shounokazuaki/cf/docs/specs/ux/creator-home-redesign.md`
- `/Users/shounokazuaki/cf/docs/architecture.md`
- `/Users/shounokazuaki/cf/docs/domain-model.md`
- `/Users/shounokazuaki/cf/TASKS.md`

## Issue Sequence

### Issue MP-1

`Meeting` minimal contract doc

完了:

- [Meeting / Planner / Follow-up Minimum Contract](/Users/shounokazuaki/cf/docs/specs/operations/meeting-planner-follow-up-minimum.md) に `Meeting` minimal field set と state transition を追加

### Issue MP-2

shared timeline input shape doc

完了:

- [Meeting / Planner / Follow-up Minimum Contract](/Users/shounokazuaki/cf/docs/specs/operations/meeting-planner-follow-up-minimum.md) に `PlannerTimelineItem` と source mapping を追加

### Issue MP-3

Creator Home / Manager Desk の timeline MVP 実装

完了:

- [meeting schema proposal and shared timeline read model](/Users/shounokazuaki/cf/docs/tasks/todo/2026-03-meeting-schema-proposal.md)
- shared timeline read model helper
- Creator Home `Upcoming / Planner` MVP
- Manager Desk `Upcoming / Planner` MVP

## Acceptance Criteria

- `Meeting / Planner / follow-up` の責務境界が docs で共有されている
- `ManagerNote` / `ExternalContact` / future `ActivityTask` の関係が整理されている
- timeline を作るための最低限の input shape が決まっている

## Risks

- `Meeting` と `Task` を同時に作り込みすぎると scope が大きくなる
- creator-side と manager-side で別の timeline shape を作ると後で統合コストが増える

## Validation

- `npm run prisma:validate`
- `npx prisma generate`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
