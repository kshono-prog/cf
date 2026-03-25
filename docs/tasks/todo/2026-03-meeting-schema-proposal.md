# Task

meeting schema proposal and shared timeline read model

## Status

- completed
- Prisma schema, migration, Meeting APIs, and shared timeline read model are now implemented

## Goal

[Meeting / Planner / Follow-up Minimum Contract](/Users/shounokazuaki/cf/docs/specs/operations/meeting-planner-follow-up-minimum.md)
を、現在の Prisma / auth / manager core model 実装に合わせて
**実装可能な schema proposal と read model proposal** に落とす。

## Scope

- `Meeting` の Prisma-ready enum / model / relation 方針を決める
- shared timeline read helper の input / output shape を決める
- Creator Home と Manager Desk の visibility rule を決める
- migration impact と rollback concern を明示する

## Non-Goals

- `ActivityTask` schema 導入
- full calendar UI
- notification delivery

## Files Likely Affected

- `/Users/shounokazuaki/cf/docs/specs/operations/meeting-planner-follow-up-minimum.md`
- `/Users/shounokazuaki/cf/docs/specs/operations/meeting-schema-proposal.md`
- `/Users/shounokazuaki/cf/docs/domain-model.md`
- `/Users/shounokazuaki/cf/docs/architecture.md`
- `/Users/shounokazuaki/cf/TASKS.md`
- `/Users/shounokazuaki/cf/PROJECT_STATE.md`

## Acceptance Criteria

- `Meeting` の enum / model / relation が Prisma-ready な粒度で定義されている
- shared timeline read model の contract が明示されている
- Creator Home と Manager Desk の visibility rule が決まっている
- migration impact と rollback concern が明記されている
- Prisma schema / migration / APIs / `Upcoming / Planner` MVP がコードとして存在する

## Risks

- ExternalContact に visibility がないため、creator-side timeline に何を見せるかを慎重に切り分ける必要がある
- `Meeting` と `ActivityTask` を同時に入れると scope が膨らむ
- reverse relation を増やしすぎると schema diff が読みにくくなる

## Validation

- `npm run prisma:validate`
- `npx prisma generate`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
