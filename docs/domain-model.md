# Domain Model

Phase 1 の manager-side Prisma-ready details は
[`Manager Core Schema Proposal`](/Users/shounokazuaki/cf/docs/specs/manager-desk/schema-proposal.md)
を参照する。

## Creator

The primary operator of the system. A creator owns projects, receives support, connects social accounts, and reviews AI-generated tasks.

## Supporter

A person who contributes to a creator's project or interacts with creator-facing updates and messages.

## ManagerAssignment

A support assignment that defines which manager is responsible for which creator, including ownership and assignment status.

## Project

The main funding unit. A project can have a goal, contributions, purposes, settlement state, and AI tasks.

## Goal

The target funding amount and deadline for a project. Goal state drives settlement and communication flows.

## Contribution

An on-chain or synced support record tied to a project. Contributions are the ground truth for support summaries and support-based messaging.

## Post

A creator-facing SNS unit layered on top of the funding product. A post may optionally link to a project and can accumulate likes, replies, and post-linked tips.

## Reply

A threaded response to a post. Replies support creator or AI-agent authorship and lightweight engagement such as likes.

## PostTip

A join record that links a confirmed `Contribution` to a `Post`, allowing post-level tipping to reuse the existing contribution pipeline without creating a second money flow.

## Purpose

A semantic bucket describing how funds may be used. Purposes can later feed allocations and distribution planning.

## Allocation

A planned payout target with fixed amount or ratio. Allocations belong to purposes and support downstream distribution logic.

## Settlement

The record of what happened after a project goal is achieved. It includes bridge state, distribution state, and execution history.

## DistributionRun

An execution record for payout-related actions. This is high-risk and must be reviewable and auditable.

## BridgeRun

A record of cross-chain movement or bridge-related execution. This is also high-risk and should never be treated as a casual refactor area.

## AgentTask

The core AI Office unit. A task has type, input, output, status, approval state, and audit logs.

## AiAgent

A stored agent configuration owned by a creator. It represents a future automation role such as posting, reply assistance, analysis, or promotion.

## AiPromotionJob

A queued or executed AI-side work record tied to a creator, and optionally to an agent or post. It is the execution/audit foundation for later approved auto-posting and promotion workflows.

## PostAnalytics

A per-post aggregate snapshot used for creator-side feed analytics. It powers mypage summary views without changing the contribution or public feed data model.

## CreatorFollow

A directional relation between creator-profile-backed identities. It powers lightweight follow/follower UI on the public profile without introducing a separate social graph or changing contribution behavior.

## SocialConnection

A linked external account used as the source for metrics collection or later creator operations.

## ContentMetricSnapshot

A point-in-time metrics record used by `ANALYZE`, `PROPOSE`, `WEEKLY_REPORT`, and message or announcement drafts as context.

## ManagerNote

A manager-authored note that stores field context, negotiation points, creator condition observations, risks, and follow-up details that should not be flattened into generic task data.

## ExternalContact

A stateful record for venues, organizers, media, brands, companies, collaborators, or other external counterparties connected to a creator or project.

## ActionLog

An append-oriented event record that captures creator, manager, AI Office, or system actions for auditability, timeline reconstruction, and future trust context.

## Meeting

A creator-manager operating event that captures agenda, decisions, notes, and next action summaries. It should be treated as a first-class collaboration record, not only as a calendar slot.

## ActivityTask

A future generic task model for assignment and completion tracking. Phase 1 intentionally defers this and keeps follow-up data on source records such as `ManagerNote`, `ExternalContact`, and future `Meeting`.

## PlannerTimelineItem

A shared read-model item composed from `Meeting`, note follow-up, external contact next actions, or project deadlines so that Creator Home and Manager Desk can render the same timeline language with different visibility.
