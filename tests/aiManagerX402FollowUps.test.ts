import assert from "node:assert/strict";
import test from "node:test";

import { deriveAiManagerX402FollowUps } from "../lib/aiManager/x402FollowUps";
import type { SerializedAiManagerAccount } from "../lib/serializers/aiManager";

function buildBaseAccount(): SerializedAiManagerAccount {
  return {
    id: "manager-1",
    creatorProfileId: "1",
    ownerControlWalletAddress: null,
    status: "ACTIVE",
    displayName: "Luna",
    slug: "luna",
    avatarAssetUrl: null,
    intro: null,
    archetype: "PROMOTER",
    publicVisibility: "OWNER_ONLY",
    primaryLanguage: "ja",
    tone: "FRIENDLY",
    supportStyle: "PROMOTIONAL",
    disclosurePolicy: "ALWAYS_DISCLOSE_AI",
    managerActivityWalletAddress: null,
    budgetWalletAddress: null,
    specialties: [],
    forbiddenTopics: [],
    brandGuardrails: [],
    createdAt: "2026-03-29T00:00:00.000Z",
    updatedAt: "2026-03-29T00:00:00.000Z",
    billingPolicy: null,
    budgetBalance: null,
    recentUsageRecords: [],
    recentBudgetTransactions: [],
    recentFundingEvidences: [],
    recentPaymentAttemptEvents: [],
    reconciliation: {
      pendingX402Count: 0,
      pendingX402Amount: "0",
      oldestPendingX402CreatedAt: null,
      pendingX402DeliveryStatus: "NONE",
      pendingX402DeliveryHint: null,
      latestPendingX402EventAt: null,
      latestPendingX402EventSource: null,
      latestPendingX402EventType: null,
      failedX402Count: 0,
      failedX402Amount: "0",
      unmatchedFundingEvidenceCount: 0,
      unmatchedFundingEvidenceAmount: "0",
      latestConfirmedX402At: null,
      recoveryCount: 0,
      latestRecoveryLabel: null,
      latestRecoverySourceLabel: null,
      latestRecoveryCreatedAt: null,
      recoveryConnectorCount: 0,
      recoveryOwnerReviewCount: 0,
      recoveryBillingSystemCount: 0,
      requiresAttention: false,
    },
  };
}

test("deriveAiManagerX402FollowUps prioritizes stale, failed, and unmatched follow-ups", () => {
  const followUps = deriveAiManagerX402FollowUps({
    ...buildBaseAccount(),
    recentUsageRecords: [
      {
        id: "usage-pending",
        capability: "POST_DRAFTING",
        provider: "openai",
        model: null,
        taskType: "ANNOUNCEMENT_DRAFT",
        currency: "JPYC",
        chargeAmount: "100",
        providerCostUsd: "0.1",
        platformFeeUsd: "0.1",
        totalChargeUsd: "0.2",
        billingState: "PAYMENT_PENDING",
        failureReason: null,
        createdAt: "2026-03-29T10:00:00.000Z",
        latestPaymentAttempt: {
          id: "attempt-pending",
          rail: "X402",
          status: "PENDING",
          payerWalletAddress: null,
          currency: "JPYC",
          amount: "100",
          txHash: null,
          payeeWalletAddress: null,
          failureReason: null,
          createdAt: "2026-03-29T10:00:00.000Z",
          confirmedAt: null,
        },
      },
      {
        id: "usage-failed",
        capability: "WEB_RESEARCH",
        provider: "openai",
        model: null,
        taskType: "ANALYZE",
        currency: "JPYC",
        chargeAmount: "80",
        providerCostUsd: "0.1",
        platformFeeUsd: "0.1",
        totalChargeUsd: "0.2",
        billingState: "FAILED",
        failureReason: "connector timeout",
        createdAt: "2026-03-29T11:00:00.000Z",
        latestPaymentAttempt: {
          id: "attempt-failed",
          rail: "X402",
          status: "FAILED",
          payerWalletAddress: null,
          currency: "JPYC",
          amount: "80",
          txHash: null,
          payeeWalletAddress: null,
          failureReason: "connector timeout",
          createdAt: "2026-03-29T11:00:00.000Z",
          confirmedAt: null,
        },
      },
    ],
    recentFundingEvidences: [
      {
        id: "evidence-1",
        status: "SELF_REPORTED",
        chainId: 137,
        currency: "JPYC",
        amount: "500",
        txHash: "0xabc",
        fromWalletAddress: null,
        toWalletAddress: "0xdef",
        reportedByAddress: null,
        note: null,
        createdAt: "2026-03-29T12:00:00.000Z",
        matchedAt: null,
        matchedBudgetTransactionId: null,
      },
    ],
    recentPaymentAttemptEvents: [
      {
        id: "event-pending",
        paymentAttemptId: "attempt-pending",
        usageId: "usage-pending",
        source: "X402_CONNECTOR",
        eventType: "ATTEMPT_CREATED",
        status: "PENDING",
        rail: "X402",
        capability: "POST_DRAFTING",
        taskType: "ANNOUNCEMENT_DRAFT",
        txHash: null,
        detail: "connector accepted settlement",
        createdAt: "2026-03-29T10:10:00.000Z",
      },
      {
        id: "event-failed",
        paymentAttemptId: "attempt-failed",
        usageId: "usage-failed",
        source: "X402_CONNECTOR",
        eventType: "SETTLEMENT_FAILED",
        status: "FAILED",
        rail: "X402",
        capability: "WEB_RESEARCH",
        taskType: "ANALYZE",
        txHash: null,
        detail: "connector timeout",
        createdAt: "2026-03-29T11:05:00.000Z",
      },
    ],
    reconciliation: {
      pendingX402Count: 1,
      pendingX402Amount: "100",
      oldestPendingX402CreatedAt: "2026-03-29T10:00:00.000Z",
      pendingX402DeliveryStatus: "STALE",
      pendingX402DeliveryHint:
        "pending が長時間継続しています。connector と owner review の両方を確認してください。",
      latestPendingX402EventAt: null,
      latestPendingX402EventSource: null,
      latestPendingX402EventType: null,
      failedX402Count: 1,
      failedX402Amount: "80",
      unmatchedFundingEvidenceCount: 1,
      unmatchedFundingEvidenceAmount: "500",
      latestConfirmedX402At: null,
      recoveryCount: 0,
      latestRecoveryLabel: null,
      latestRecoverySourceLabel: null,
      latestRecoveryCreatedAt: null,
      recoveryConnectorCount: 0,
      recoveryOwnerReviewCount: 0,
      recoveryBillingSystemCount: 0,
      requiresAttention: true,
    },
  });

  assert.deepEqual(
    followUps.map((entry) => [entry.kind, entry.priority]),
    [
      ["STALE_PENDING_X402", "HIGH"],
      ["FAILED_X402", "HIGH"],
      ["UNMATCHED_FUNDING_EVIDENCE", "MEDIUM"],
    ]
  );
  assert.equal(followUps[0]?.routeLabel, "x402 connector");
  assert.match(
    followUps[0]?.detail ?? "",
    /connector 側の event はありますが/
  );
  assert.equal(followUps[1]?.routeLabel, "x402 connector");
  assert.equal(followUps[1]?.actionLabel, "connector failure と pause を確認");
  assert.match(followUps[1]?.detail ?? "", /connector から failed が返っています/);
  assert.equal(followUps[2]?.routeLabel, "funding evidence");
});

test("deriveAiManagerX402FollowUps falls back to watch follow-up when stale items do not exist", () => {
  const attemptCreatedAt = new Date(Date.now() - 50 * 60_000).toISOString();
  const latestEventAt = new Date(Date.now() - 20 * 60_000).toISOString();
  const followUps = deriveAiManagerX402FollowUps({
    ...buildBaseAccount(),
    recentUsageRecords: [
      {
        id: "usage-watch",
        capability: "PROGRESS_SUMMARY",
        provider: "openai",
        model: null,
        taskType: "WEEKLY_REPORT",
        currency: "JPYC",
        chargeAmount: "60",
        providerCostUsd: "0.1",
        platformFeeUsd: "0.1",
        totalChargeUsd: "0.2",
        billingState: "PAYMENT_PENDING",
        failureReason: null,
        createdAt: "2026-03-29T11:30:00.000Z",
        latestPaymentAttempt: {
          id: "attempt-watch",
          rail: "X402",
          status: "PENDING",
          payerWalletAddress: null,
          currency: "JPYC",
          amount: "60",
          txHash: null,
          payeeWalletAddress: null,
          failureReason: null,
          createdAt: attemptCreatedAt,
          confirmedAt: null,
        },
      },
    ],
    recentPaymentAttemptEvents: [
      {
        id: "event-watch",
        paymentAttemptId: "attempt-watch",
        usageId: "usage-watch",
        source: "OWNER_REVIEW",
        eventType: "ATTEMPT_CREATED",
        status: "PENDING",
        rail: "X402",
        capability: "PROGRESS_SUMMARY",
        taskType: "WEEKLY_REPORT",
        txHash: null,
        detail: "awaiting owner decision",
        createdAt: latestEventAt,
      },
    ],
    reconciliation: {
      pendingX402Count: 1,
      pendingX402Amount: "60",
      oldestPendingX402CreatedAt: attemptCreatedAt,
      pendingX402DeliveryStatus: "WATCH",
      pendingX402DeliveryHint:
        "やや長く pending が続いています。connector delivery を確認してください。",
      latestPendingX402EventAt: latestEventAt,
      latestPendingX402EventSource: "OWNER_REVIEW",
      latestPendingX402EventType: "ATTEMPT_CREATED",
      failedX402Count: 0,
      failedX402Amount: "0",
      unmatchedFundingEvidenceCount: 0,
      unmatchedFundingEvidenceAmount: "0",
      latestConfirmedX402At: null,
      recoveryCount: 0,
      latestRecoveryLabel: null,
      latestRecoverySourceLabel: null,
      latestRecoveryCreatedAt: null,
      recoveryConnectorCount: 0,
      recoveryOwnerReviewCount: 0,
      recoveryBillingSystemCount: 0,
      requiresAttention: true,
    },
  });

  assert.equal(followUps.length, 1);
  assert.equal(followUps[0]?.kind, "WATCH_PENDING_X402");
  assert.equal(followUps[0]?.priority, "MEDIUM");
  assert.equal(followUps[0]?.routeLabel, "owner review");
  assert.equal(followUps[0]?.actionLabel, "owner review の要否を確認");
});
