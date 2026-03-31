import assert from "node:assert/strict";
import test from "node:test";

import { deriveAiManagerX402RecoverySummary } from "../lib/aiManager/x402RecoverySummary";
import type { SerializedAiManagerAccount } from "../lib/serializers/aiManager";

test("deriveAiManagerX402RecoverySummary returns latest recovery headline", () => {
  const now = Date.now();
  // Use relative timestamps so last24hCount stays accurate over time
  const tsReplay = new Date(now - 30 * 60 * 1000).toISOString();    // -30 min
  const tsFailed = new Date(now - 60 * 60 * 1000).toISOString();    // -60 min (not a recovery)
  const tsConfirmed = new Date(now - 50 * 60 * 1000).toISOString(); // -50 min

  const account: SerializedAiManagerAccount = {
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
    recentPaymentAttemptEvents: [
      {
        id: "event-replay",
        paymentAttemptId: "attempt-replay",
        usageId: "usage-replay",
        source: "X402_CONNECTOR",
        eventType: "SETTLEMENT_REPLAYED",
        status: "CONFIRMED",
        rail: "X402",
        capability: "POST_DRAFTING",
        taskType: "ANNOUNCEMENT_DRAFT",
        txHash: "0xaaa",
        detail: "Duplicate confirmed connector callback accepted as idempotent replay.",
        createdAt: tsReplay,
      },
      {
        id: "event-failed",
        paymentAttemptId: "attempt-recovered",
        usageId: "usage-recovered",
        source: "X402_CONNECTOR",
        eventType: "SETTLEMENT_FAILED",
        status: "FAILED",
        rail: "X402",
        capability: "WEB_RESEARCH",
        taskType: "ANALYZE",
        txHash: null,
        detail: "connector timeout",
        createdAt: tsFailed,
      },
      {
        id: "event-confirmed",
        paymentAttemptId: "attempt-recovered",
        usageId: "usage-recovered",
        source: "OWNER_REVIEW",
        eventType: "SETTLEMENT_CONFIRMED",
        status: "CONFIRMED",
        rail: "X402",
        capability: "WEB_RESEARCH",
        taskType: "ANALYZE",
        txHash: "0xbbb",
        detail: null,
        createdAt: tsConfirmed,
      },
    ],
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

  assert.deepEqual(deriveAiManagerX402RecoverySummary(account), {
    count: 2,
    latestRecoveryLabel: "duplicate replay accepted",
    latestSourceLabel: "x402 connector",
    latestCreatedAt: tsReplay,
    connectorCount: 1,
    ownerReviewCount: 1,
    billingSystemCount: 0,
    last24hCount: 2,
    prior24hCount: 0,
    recentTrend: "increasing",
    last7d: { total: 2, connectorCount: 1, ownerReviewCount: 1, billingSystemCount: 0 },
    last30d: { total: 2, connectorCount: 1, ownerReviewCount: 1, billingSystemCount: 0 },
  });
});
