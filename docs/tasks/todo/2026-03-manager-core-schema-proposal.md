# Task

manager core schema proposal

## Status

- approved
- schema implemented
- migration SQL added
- minimal APIs added

## Goal

[`Manager Desk データモデル定義`](/Users/shounokazuaki/cf/docs/specs/manager-desk/data-models.md) を、
現行 Prisma / 認証構造に合わせた **実装可能な schema / migration / API contract** へ落とし、
`ManagerAssignment / ManagerNote / ExternalContact / ActionLog` の phase 1 を固定する。

## Scope

- 現在の schema 制約と auth 制約を整理する
- phase 1 の actor identity 方針を決める
- Prisma-ready な enum / model / index / relation 方針を決める
- 最小 API 契約、migration impact、rollback concern を明文化する
- 実装順と保留事項を明示する

## Non-Goals

- `Meeting` / `ActivityTask` / `TrustProfile` の追加
- 完全な team RBAC の設計
- Manager Desk UI の本実装

## Files Likely Affected

- `/Users/shounokazuaki/cf/docs/specs/manager-desk/data-models.md`
- `/Users/shounokazuaki/cf/docs/specs/manager-desk/schema-proposal.md`
- `/Users/shounokazuaki/cf/docs/domain-model.md`
- `/Users/shounokazuaki/cf/docs/architecture.md`
- `/Users/shounokazuaki/cf/prisma/schema.prisma`
- `/Users/shounokazuaki/cf/prisma/migrations/20260326143000_add_manager_core_models/migration.sql`
- `/Users/shounokazuaki/cf/app/api/manager-assignments/route.ts`
- `/Users/shounokazuaki/cf/app/api/manager-notes/route.ts`
- `/Users/shounokazuaki/cf/app/api/external-contacts/route.ts`
- `/Users/shounokazuaki/cf/app/api/action-logs/route.ts`
- `/Users/shounokazuaki/cf/TASKS.md`

## Acceptance Criteria

- 現在の repo には generic `User` model がないことを前提に proposal が書かれている
- `CreatorProfile.id` / `Project.id` の `BigInt` 制約と整合する
- `ManagerAssignment / ManagerNote / ExternalContact / ActionLog` の fields / enums / indexes が実装可能な粒度で定義されている
- migration impact と rollback concern が明示されている
- additive schema / migration / API が repo に追加されている
- `npm run prisma:validate` が通る

## Risks

- phase 1 を wallet-address identity で進めると、将来の member / user 導入時に追加 migration が必要になる
- partial unique 制約を Prisma 単体で表現しづらく、service layer にルールが残る
- `ActionLog` の柔軟性を上げすぎると、後で JSON 依存が強くなる

## Validation

- `npm run prisma:validate`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
