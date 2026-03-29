import assert from "node:assert/strict";
import test from "node:test";

import { deriveAiManagerX402RecoveryItems } from "../lib/aiManager/x402Recovery";
import type { SerializedAiManagerAccount } from "../lib/serializers/aiManager";

test("deriveAiManagerX402RecoveryItems returns replay and recovered-after-failure items", () => {
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
        createdAt: "2026-03-29T12:30:00.000Z",
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
        createdAt: "2026-03-29T12:00:00.000Z",
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
        createdAt: "2026-03-29T12:20:00.000Z",
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

  const items = deriveAiManagerX402RecoveryItems(account);

  assert.equal(items.length, 2);
  assert.equal(items[0]?.recoveryLabel, "duplicate replay accepted");
  assert.equal(items[0]?.sourceLabel, "x402 connector");
  assert.equal(items[1]?.recoveryLabel, "failed -> confirmed");
  assert.equal(items[1]?.sourceLabel, "owner review");
});
