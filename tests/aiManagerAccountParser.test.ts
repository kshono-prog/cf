import assert from "node:assert/strict";
import test from "node:test";

import {
  parseAiManagerAccount,
  parseAiManagerFundingInstructions,
} from "../lib/serializers/aiManager";

test("parseAiManagerAccount keeps latest payment attempt ids and tx hashes", () => {
  const account = parseAiManagerAccount({
    id: "11111111-1111-1111-1111-111111111111",
    creatorProfileId: "42",
    ownerControlWalletAddress: null,
    status: "ACTIVE",
    displayName: "Nagi",
    slug: null,
    avatarAssetUrl: null,
    intro: "進捗整理を担当します。",
    archetype: "ANALYST",
    publicVisibility: "OWNER_ONLY",
    primaryLanguage: "ja",
    tone: "POLITE",
    supportStyle: "DATA_DRIVEN",
    disclosurePolicy: "ALWAYS_DISCLOSE_AI",
    managerActivityWalletAddress: null,
    budgetWalletAddress: "0x2222222222222222222222222222222222222222",
    specialties: ["進捗整理"],
    forbiddenTopics: [],
    brandGuardrails: [],
    createdAt: "2026-03-29T00:00:00.000Z",
    updatedAt: "2026-03-29T00:00:00.000Z",
    billingPolicy: {
      status: "ACTIVE",
      billingMode: "MANUAL_TOPUP",
      preferredRail: "X402_PREFERRED",
      currency: "JPYC",
      freeTierEnabled: true,
      freeTierScope: "BRIEFING_AND_LIGHT_DRAFTS",
      autoPayEnabled: true,
      monthlyJpycCap: 3000,
      dailyJpycCap: 300,
      perActionJpycCap: 100,
      allowedBillableCapabilities: ["WEB_RESEARCH"],
      pausedAt: null,
      pauseReason: null,
    },
    budgetBalance: {
      currency: "JPYC",
      availableAmount: "240.00",
      reservedAmount: "0.00",
      updatedAt: "2026-03-29T00:00:00.000Z",
    },
    recentUsageRecords: [
      {
        id: "22222222-2222-2222-2222-222222222222",
        capability: "WEB_RESEARCH",
        provider: "creator-founding-ai-office",
        model: "creator-office-research-v1",
        taskType: "CONTACT_INTELLIGENCE_ALERT",
        currency: "JPYC",
        chargeAmount: "60.00",
        providerCostUsd: "0.120000",
        platformFeeUsd: "0.040000",
        totalChargeUsd: "0.160000",
        billingState: "PAYMENT_PENDING",
        failureReason: null,
        createdAt: "2026-03-29T00:00:00.000Z",
        latestPaymentAttempt: {
          id: "33333333-3333-3333-3333-333333333333",
          rail: "X402",
          status: "PENDING",
          payerWalletAddress: "0x2222222222222222222222222222222222222222",
          currency: "JPYC",
          amount: "60.00",
          txHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          payeeWalletAddress: "0x3333333333333333333333333333333333333333",
          failureReason: null,
          createdAt: "2026-03-29T00:00:00.000Z",
          confirmedAt: null,
        },
      },
    ],
    recentBudgetTransactions: [],
    recentFundingEvidences: [],
    recentPaymentAttemptEvents: [
      {
        id: "44444444-4444-4444-4444-444444444444",
        paymentAttemptId: "33333333-3333-3333-3333-333333333333",
        usageId: "22222222-2222-2222-2222-222222222222",
        source: "X402_CONNECTOR",
        eventType: "ATTEMPT_CREATED",
        status: "PENDING",
        rail: "X402",
        capability: "WEB_RESEARCH",
        taskType: "CONTACT_INTELLIGENCE_ALERT",
        txHash: null,
        detail: "x402 settlement pending callback.",
        createdAt: "2026-03-29T00:00:00.000Z",
      },
    ],
    reconciliation: {
      pendingX402Count: 1,
      pendingX402Amount: "60.00",
      oldestPendingX402CreatedAt: "2026-03-29T00:00:00.000Z",
      pendingX402DeliveryStatus: "ACTIVE",
      pendingX402DeliveryHint: "connector callback 待ちの範囲です。",
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

  assert.ok(account);
  assert.equal(
    account?.recentUsageRecords[0]?.latestPaymentAttempt?.id,
    "33333333-3333-3333-3333-333333333333"
  );
  assert.equal(
    account?.recentUsageRecords[0]?.latestPaymentAttempt?.txHash,
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  );
  assert.equal(account?.recentPaymentAttemptEvents[0]?.source, "X402_CONNECTOR");
  assert.equal(account?.reconciliation.pendingX402Count, 1);
  assert.equal(account?.reconciliation.requiresAttention, true);
});

test("parseAiManagerFundingInstructions keeps verified payee metadata", () => {
  const funding = parseAiManagerFundingInstructions({
    ownerControlWalletAddress: "0x1111111111111111111111111111111111111111",
    budgetWalletAddress: "0x2222222222222222222222222222222222222222",
    payeeId: "platform-operations-wallet",
    payeeLabel: "Platform Operations Wallet",
    payeeVerificationStatus: "VERIFIED",
    platformOperationsWalletAddress: "0x3333333333333333333333333333333333333333",
    currency: "JPYC",
    chainId: 137,
    chainName: "Polygon",
    chainShortName: "Polygon",
    tokenSymbol: "JPYC",
    tokenAddress: "0x4444444444444444444444444444444444444444",
    preferredRail: "X402_PREFERRED",
    activeSettlementRail: "X402",
    x402Status: "X402_READY",
    x402EndpointUrl: "https://payments.creator.example.com/x402",
    referenceCode: "CF-AI-TEST1234",
    steps: ["step 1", "step 2"],
    warnings: [],
  });

  assert.ok(funding);
  assert.equal(funding?.payeeId, "platform-operations-wallet");
  assert.equal(funding?.payeeLabel, "Platform Operations Wallet");
  assert.equal(funding?.payeeVerificationStatus, "VERIFIED");
});
