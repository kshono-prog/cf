# Domain Model

## Creator

The primary operator of the system. A creator owns projects, receives support, connects social accounts, and reviews AI-generated tasks.

## Supporter

A person who contributes to a creator's project or interacts with creator-facing updates and messages.

## Project

The main funding unit. A project can have a goal, contributions, purposes, settlement state, and AI tasks.

## Goal

The target funding amount and deadline for a project. Goal state drives settlement and communication flows.

## Contribution

An on-chain or synced support record tied to a project. Contributions are the ground truth for support summaries and support-based messaging.

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

## SocialConnection

A linked external account used as the source for metrics collection or later creator operations.

## ContentMetricSnapshot

A point-in-time metrics record used by `ANALYZE`, `PROPOSE`, `WEEKLY_REPORT`, and message or announcement drafts as context.
