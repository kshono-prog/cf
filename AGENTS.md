# Creator Founding AGENTS

You are working on Creator Founding.

## Core Stack

- Next.js 15 App Router
- TypeScript
- Prisma
- Supabase Postgres
- wagmi
- viem

## Hard Rules

- Never use `any`
- Prefer minimal diffs
- Preserve existing architecture unless the issue explicitly requests refactoring
- Keep `1 Issue = 1 PR`
- When editing Prisma schema, explain migration impact and rollback concerns
- Always consider `lint`, `typecheck`, and `build`
- Never introduce secret handling in client code
- Do not change signing, bridge, or fund movement behavior without explicit approval

## Domain Terms

- `Creator`: artist or organizer receiving support
- `Supporter`: person funding or following a creator
- `Project`: funding unit owned by a creator
- `Goal`: funding target for a project
- `Purpose`: purpose bucket for future distribution
- `Allocation`: planned payout destination or ratio
- `Contribution`: confirmed support record
- `DistributionRun`: executed payout record
- `BridgeRun`: cross-chain movement record

## Operating Principles

- Work from Issue or task docs, not from vague prompts
- Keep changes reviewable and localized
- Update docs when architecture, workflow, or task contracts change
- Treat chain, settlement, distribution, and custody-like flows as high risk
- Prefer adding structure over adding more ad hoc conditionals

## Validation Rules

Default validation set:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

If Prisma-related files change:

- `npm run prisma:validate`
- describe migration impact

## Files To Read First

- [`PROJECT_STATE.md`](/Users/shounokazuaki/cf/PROJECT_STATE.md)
- [`TASKS.md`](/Users/shounokazuaki/cf/TASKS.md)
- [`docs/roadmap/vision.md`](/Users/shounokazuaki/cf/docs/roadmap/vision.md)
- [`docs/architecture.md`](/Users/shounokazuaki/cf/docs/architecture.md)
- [`docs/domain-model.md`](/Users/shounokazuaki/cf/docs/domain-model.md)
- [`docs/specs/creator-ai-office/task-output-contracts.md`](/Users/shounokazuaki/cf/docs/specs/creator-ai-office/task-output-contracts.md)

## Expected Output Shape

- `Plan`
- `Changes`
- `Risks`
- `Validation`
