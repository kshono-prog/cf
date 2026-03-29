import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEmptyAiManagerReconciliationSummary,
  deriveAiManagerX402DeliveryStatus,
} from "../lib/aiManager/reconciliationShared";

test("buildEmptyAiManagerReconciliationSummary includes delivery defaults", () => {
  assert.deepEqual(buildEmptyAiManagerReconciliationSummary(), {
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
  });
});

test("deriveAiManagerX402DeliveryStatus returns ACTIVE for recent pending settlement", () => {
  const result = deriveAiManagerX402DeliveryStatus({
    pendingX402Count: 1,
    oldestPendingX402CreatedAt: "2026-03-29T11:55:00.000Z",
    now: new Date("2026-03-29T12:00:00.000Z"),
  });

  assert.deepEqual(result, {
    status: "ACTIVE",
    hint: "connector callback 待ちの範囲です。",
  });
});

test("deriveAiManagerX402DeliveryStatus returns WATCH and STALE by pending age", () => {
  assert.deepEqual(
    deriveAiManagerX402DeliveryStatus({
      pendingX402Count: 1,
      oldestPendingX402CreatedAt: "2026-03-29T11:30:00.000Z",
      now: new Date("2026-03-29T12:00:00.000Z"),
    }),
    {
      status: "WATCH",
      hint: "やや長く pending が続いています。connector delivery を確認してください。",
    }
  );

  assert.deepEqual(
    deriveAiManagerX402DeliveryStatus({
      pendingX402Count: 1,
      oldestPendingX402CreatedAt: "2026-03-29T10:30:00.000Z",
      now: new Date("2026-03-29T12:00:00.000Z"),
    }),
    {
      status: "STALE",
      hint: "pending が長時間継続しています。connector と owner review の両方を確認してください。",
    }
  );
});

test("deriveAiManagerX402DeliveryStatus treats recent connector events as active even for older pending attempts", () => {
  const result = deriveAiManagerX402DeliveryStatus({
    pendingX402Count: 1,
    oldestPendingX402CreatedAt: "2026-03-29T10:30:00.000Z",
    latestPendingX402EventAt: "2026-03-29T11:55:00.000Z",
    latestPendingX402EventSource: "X402_CONNECTOR",
    latestPendingX402EventType: "ATTEMPT_CREATED",
    now: new Date("2026-03-29T12:00:00.000Z"),
  });

  assert.deepEqual(result, {
    status: "ACTIVE",
    hint: "x402 connector から最近 event が届いています。callback 継続待ちの範囲です。",
  });
});

test("deriveAiManagerX402DeliveryStatus degrades to stale after long silence from last event", () => {
  const result = deriveAiManagerX402DeliveryStatus({
    pendingX402Count: 1,
    oldestPendingX402CreatedAt: "2026-03-29T09:30:00.000Z",
    latestPendingX402EventAt: "2026-03-29T10:15:00.000Z",
    latestPendingX402EventSource: "BILLING_SYSTEM",
    latestPendingX402EventType: "ATTEMPT_CREATED",
    now: new Date("2026-03-29T12:00:00.000Z"),
  });

  assert.deepEqual(result, {
    status: "STALE",
    hint: "最後の billing system event から長時間更新がありません。connector と owner review の両方を確認してください。",
  });
});
