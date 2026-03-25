# Task

Manager Desk follow-up slices

## Status

- ready
- follows `Manager Desk first slice` and `Meeting / Planner` implementation

## Goal

Manager Desk を `Dashboard / Creator Detail` から一歩進めて、
**Contact Pipeline / Notes / Activity Timeline** を持つ運営面へ広げる。

## Scope

- `Contact Pipeline` の read model と MVP UI
- `Manager Note` 一覧 / search / filter の最小 UI
- `ActionLog` と note / meeting を束ねた activity timeline の MVP
- dashboard / creator detail からの導線整理

## Non-Goals

- enterprise CRM 化
- full text search の最適化
- complex Kanban workflow
- multi-manager analytics

## Issue Sequence

### Issue MF-1

Contact Pipeline MVP

やること:

- `ExternalContact.status / temperature / nextActionDueAt` を主軸に read model を作る
- creator / status / overdue で絞れる軽量 UI を作る

### Issue MF-2

Notes surface MVP

やること:

- `ManagerNote` 一覧を noteType / visibility / follow-up 有無で見られるようにする
- creator detail から notes 面へ入れるようにする

### Issue MF-3

Activity Timeline MVP

やること:

- `ActionLog + Meeting + shareable note updates` を時系列面として並べる
- 「誰が何を進めたか」が分かる timeline にする

## Files Likely Affected

- `/Users/shounokazuaki/cf/app/manager-desk/`
- `/Users/shounokazuaki/cf/components/managerDesk/`
- `/Users/shounokazuaki/cf/lib/managerDesk/readModel.ts`
- `/Users/shounokazuaki/cf/lib/managerDesk/readModelTypes.ts`
- `/Users/shounokazuaki/cf/app/api/manager-desk/`

## Acceptance Criteria

- contact overdue が Manager Desk 上で追える
- notes が creator detail 以外でも一覧で見られる
- activity timeline で actor / action / happenedAt が分かる
- dashboard から follow-up 面に自然に遷移できる

## Risks

- contact / note / activity を 1 issue に詰め込みすぎると review が重い
- read model を先に固めないと UI ごとに集約ロジックが散る
- manager-only と creator-visible の境界が timeline で崩れやすい

## Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`

