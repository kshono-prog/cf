import assert from "node:assert/strict";
import test from "node:test";

import { deriveAiManagerX402DeliveryEvents } from "../lib/aiManager/x402DeliveryEvents";
import type { SerializedAiManagerAccount } from "../lib/serializers/aiManager";

test("deriveAiManagerX402DeliveryEvents keeps x402 events and sorts latest first", () => {
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
        id: "event-1",
        paymentAttemptId: "attempt-1",
        usageId: "usage-1",
        source: "OWNER_REVIEW",
        eventType: "SETTLEMENT_CONFIRMED",
        status: "CONFIRMED",
        rail: "X402",
        capability: "POST_DRAFTING",
        taskType: "ANNOUNCEMENT_DRAFT",
        txHash:
          "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        detail: null,
        createdAt: "2026-03-29T12:10:00.000Z",
      },
      {
        id: "event-2",
        paymentAttemptId: "attempt-2",
        usageId: "usage-2",
        source: "BILLING_SYSTEM",
        eventType: "ATTEMPT_CREATED",
        status: "CONFIRMED",
        rail: "INTERNAL_LEDGER",
        capability: "PROGRESS_SUMMARY",
        taskType: "WEEKLY_REPORT",
        txHash: null,
        detail: "Internal ledger fallback settled immediately.",
        createdAt: "2026-03-29T12:20:00.000Z",
      },
      {
        id: "event-3",
        paymentAttemptId: "attempt-3",
        usageId: "usage-3",
        source: "X402_CONNECTOR",
        eventType: "SETTLEMENT_REPLAYED",
        status: "CONFIRMED",
        rail: "X402",
        capability: "WEB_RESEARCH",
        taskType: "CONTACT_INTELLIGENCE_ALERT",
        txHash:
          "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        detail: "Duplicate confirmed connector callback accepted as idempotent replay.",
        createdAt: "2026-03-29T12:30:00.000Z",
      },
      {
        id: "event-4",
        paymentAttemptId: "attempt-4",
        usageId: "usage-4",
        source: "X402_CONNECTOR",
        eventType: "PENDING_OBSERVED",
        status: "PENDING",
        rail: "X402",
        capability: "WEB_RESEARCH",
        taskType: "CONTACT_INTELLIGENCE_ALERT",
        txHash: null,
        detail: "Connector polling observed this settlement is still pending.",
        createdAt: "2026-03-29T12:40:00.000Z",
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

  const events = deriveAiManagerX402DeliveryEvents(account);

  assert.equal(events.length, 3);
  assert.equal(events[0]?.id, "event-4");
  assert.equal(events[0]?.eventLabel, "pending observed");
  assert.equal(events[1]?.id, "event-3");
  assert.equal(events[1]?.sourceLabel, "x402 connector");
  assert.equal(events[1]?.eventLabel, "duplicate replay accepted");
  assert.equal(events[2]?.id, "event-1");
  assert.equal(events[0]?.sourceLabel, "x402 connector");
  assert.equal(events[2]?.taskLabel, "告知文案を作る");
});
