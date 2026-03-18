# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run build        # prisma generate + next build
npm run test         # Node test runner (tests/*.test.ts)
npm run prisma:validate   # Validate Prisma schema
npm run db:seed      # Seed database
```

Default validation before any PR: `lint` → `typecheck` → `build`.
When Prisma files change: also run `prisma:validate` and describe migration impact.

Run a single test file:
```bash
TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","moduleResolution":"Node"}' node --require ts-node/register --require ./tests/register-alias.cjs --test tests/<file>.test.ts
```

Manual smoke tests for AI Office:
```bash
npm run manual-check:ai-office:prepare
npm run manual-check:ai-office:minimum
npm run manual-check:ai-office:smoke
npm run manual-check:ai-office:status
```

## Architecture

**Stack:** Next.js 15 App Router, TypeScript (strict, no `any`), Tailwind CSS v4, Prisma 5, Supabase Postgres, wagmi/viem, AppKit (WalletConnect).

**Directory layout:**
- `app/` — routes and API route handlers (40+ API endpoints)
- `components/` — UI organized by feature area (mypage, profile, support, feed, shared, etc.)
- `lib/` — shared domain logic, Prisma access, task executors, integrations
- `prisma/` — schema and seed
- `config/` — AppKit/WalletConnect config
- `context/` — React context providers
- `types/` — shared TypeScript type definitions
- `utils/` — small utilities (e.g. `baseUrl.ts`)
- `tests/` — Node test runner test files; `register-alias.cjs` resolves `@/` imports
- `scripts/` — manual data-check and import scripts (`.cjs`)
- `docs/` — architecture specs, runbooks, ADRs, decision logs

**Key docs to read before making changes:**
- `PROJECT_STATE.md` — current focus, active issues, approval boundaries
- `TASKS.md` — ready queue and active tracks
- `AGENTS.md` — AI agent role definitions
- `docs/architecture.md` — layered architecture and runtime constraints
- `docs/domain-model.md` — data model
- `docs/specs/creator-ai-office/task-output-contracts.md` — AI task output schemas

## Layers

1. **Public product** — creator public page (`/[username]`): profile, project progress, funding CTA
2. **Creator operation** — mypage (`/[username]/mypage`): profile, project/settlement management, AI Office
3. **Funding & settlement** — contribution recording, goal/settlement state, distribution/bridge runs
4. **AI Office** — `AgentTask` flow: create → validate → execute → `WAITING_APPROVAL` → approve/reject. Backed by task definition registry, output renderer registry, and a dashboard aggregation service for the read side

## Key lib/ Modules

- `lib/prisma.ts` — Prisma client singleton
- `lib/mypageDashboard.ts` — dashboard aggregation service (single read source for mypage)
- `lib/mypage/api.ts` — write-side API functions (profile save, creator apply)
- `lib/mypage/dashboardTypes.ts` — response types for dashboard endpoint
- `lib/creator-ai/agentRoleRegistry.ts` — agent role definitions (Manager, Finance, Promotion, Fan Relation)
- `lib/creator-ai/distributionPlanDraftTask.ts` — Finance agent distribution plan as AgentTask
- `lib/creator-ai/managerAgentTask.ts` — Manager agent next-action suggestions
- `lib/agentTaskParsers.ts` — AgentTask output parsing
- `lib/agentTaskAudit.ts` — AgentTask state change audit logging
- `lib/tokenRegistry.ts` — supported token and chain config (JPYC / USDC, Polygon / Avalanche)
- `lib/api/guards.ts` — request validation guards
- `lib/api/responses.ts` — standard response helpers
- `lib/contracts/eventFunding.ts` — event funding contract logic
- `lib/x402/` — x402 service catalog (future machine-billable boundary)

## Mypage Read Pattern

Single `GET /api/mypage/dashboard` aggregates `me`, per-currency summary, and settlement data. Child panels hydrate from this response before issuing route-specific refreshes. Write operations go through `lib/mypage/api.ts`.

## Blockchain

Polygon + Avalanche. Supported currencies: JPYC / USDC (ERC20 transfers). Contribution flow: wallet transfer → txHash → `POST /api/contributions` (PENDING) → receipt reverification → CONFIRMED. Cross-chain movement uses CCTP (`CctpBridgeJob`).

## Domain Terms

| Term | Meaning |
|---|---|
| `Creator` | Artist/organizer receiving support |
| `Supporter` | Person funding or following |
| `Project` | Funding unit owned by a creator |
| `Goal` | Funding target for a project |
| `Contribution` | Confirmed on-chain support record |
| `Purpose` | Semantic allocation bucket |
| `Settlement` | Post-goal state and distribution record |
| `DistributionRun` | Executed payout audit record |
| `BridgeRun` | Cross-chain movement audit record |
| `AgentTask` | AI Office task unit |
| `AiAgent` | Stored agent config (role, configJson) |
| `Post` / `Reply` | Creator SNS content (supports AI-agent authorship and post-level tipping) |

## Rules

- No `any` in TypeScript
- Prefer minimal diffs; preserve existing architecture unless refactoring is explicitly requested
- Never introduce secret handling in client code
- Do not change signing, bridge, or fund movement behavior without explicit approval
- Treat `settlement`, `distribution`, and `bridge` flows as high-risk — require approval for spec changes
- Prisma schema changes, new env vars, and new external APIs all require explicit approval
- `1 Issue = 1 PR`

**Approval-free (proceed without asking):** existing-spec implementation, refactoring within architecture, lint/type fixes, doc updates, non-breaking UI improvements.
