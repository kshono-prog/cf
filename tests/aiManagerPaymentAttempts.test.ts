import assert from "node:assert/strict";
import test from "node:test";

import {
  getAiManagerX402ReplayDisposition,
  shouldSuppressAiManagerPendingObservation,
} from "../lib/aiManager/paymentAttempts";

test("getAiManagerX402ReplayDisposition returns pending for pending x402 attempts", () => {
  assert.equal(
    getAiManagerX402ReplayDisposition({
      rail: "X402",
      currentStatus: "PENDING",
      requestedStatus: "CONFIRMED",
      currentTxHash: null,
      requestedTxHash:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    }),
    "PENDING"
  );
});

test("getAiManagerX402ReplayDisposition accepts duplicate confirmed callback only with matching tx hash", () => {
  assert.equal(
    getAiManagerX402ReplayDisposition({
      rail: "X402",
      currentStatus: "CONFIRMED",
      requestedStatus: "CONFIRMED",
      currentTxHash:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      requestedTxHash:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    }),
    "REPLAY_CONFIRMED"
  );

  assert.equal(
    getAiManagerX402ReplayDisposition({
      rail: "X402",
      currentStatus: "CONFIRMED",
      requestedStatus: "CONFIRMED",
      currentTxHash:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      requestedTxHash:
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    }),
    "INVALID"
  );
});

test("getAiManagerX402ReplayDisposition accepts duplicate failed callback", () => {
  assert.equal(
    getAiManagerX402ReplayDisposition({
      rail: "X402",
      currentStatus: "FAILED",
      requestedStatus: "FAILED",
      currentTxHash: null,
      requestedTxHash: null,
    }),
    "REPLAY_FAILED"
  );
});

test("getAiManagerX402ReplayDisposition rejects non-x402 or incompatible terminal states", () => {
  assert.equal(
    getAiManagerX402ReplayDisposition({
      rail: "INTERNAL_LEDGER",
      currentStatus: "CONFIRMED",
      requestedStatus: "CONFIRMED",
      currentTxHash:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      requestedTxHash:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    }),
    "INVALID"
  );

  assert.equal(
    getAiManagerX402ReplayDisposition({
      rail: "X402",
      currentStatus: "FAILED",
      requestedStatus: "CONFIRMED",
      currentTxHash: null,
      requestedTxHash:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    }),
    "INVALID"
  );
});

test("shouldSuppressAiManagerPendingObservation suppresses duplicate connector polls within five minutes", () => {
  const observedAt = new Date("2026-03-29T12:05:00.000Z");

  assert.equal(
    shouldSuppressAiManagerPendingObservation({
      latestEvent: {
        source: "X402_CONNECTOR",
        eventType: "PENDING_OBSERVED",
        status: "PENDING",
        createdAt: new Date("2026-03-29T12:01:00.000Z"),
      },
      observedAt,
    }),
    true
  );

  assert.equal(
    shouldSuppressAiManagerPendingObservation({
      latestEvent: {
        source: "X402_CONNECTOR",
        eventType: "PENDING_OBSERVED",
        status: "PENDING",
        createdAt: new Date("2026-03-29T11:40:00.000Z"),
      },
      observedAt,
    }),
    false
  );
});
