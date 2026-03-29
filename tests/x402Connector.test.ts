import assert from "node:assert/strict";
import test from "node:test";

import {
  authorizeAiManagerX402ConnectorRequest,
  parseAiManagerX402ConnectorPendingObservationPayload,
  parseAiManagerX402ConnectorSettlementPayload,
  validateAiManagerX402ConnectorPayee,
} from "../lib/aiManager/x402Connector";

const PAYMENT_ATTEMPT_ID = "11111111-1111-4111-8111-111111111111";
const TX_HASH =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const PAYEE_WALLET = "0x3333333333333333333333333333333333333333";

test("authorizeAiManagerX402ConnectorRequest accepts matching bearer token", () => {
  const error = authorizeAiManagerX402ConnectorRequest({
    authorizationHeader: "Bearer connector-secret",
    expectedToken: "connector-secret",
  });

  assert.equal(error, null);
});

test("authorizeAiManagerX402ConnectorRequest rejects missing or wrong token", () => {
  assert.equal(
    authorizeAiManagerX402ConnectorRequest({
      authorizationHeader: null,
      expectedToken: "connector-secret",
    }),
    "AI_MANAGER_X402_CONNECTOR_UNAUTHORIZED"
  );

  assert.equal(
    authorizeAiManagerX402ConnectorRequest({
      authorizationHeader: "Bearer wrong-secret",
      expectedToken: "connector-secret",
    }),
    "AI_MANAGER_X402_CONNECTOR_UNAUTHORIZED"
  );
});

test("parseAiManagerX402ConnectorSettlementPayload validates confirmed payloads", () => {
  const payload = parseAiManagerX402ConnectorSettlementPayload({
    paymentAttemptId: PAYMENT_ATTEMPT_ID,
    status: "CONFIRMED",
    txHash: TX_HASH,
    payeeId: "platform-operations-wallet",
    payeeWalletAddress: PAYEE_WALLET,
  });

  assert.equal(payload.paymentAttemptId, PAYMENT_ATTEMPT_ID);
  assert.equal(payload.status, "CONFIRMED");
  assert.equal(payload.txHash, TX_HASH);
  assert.equal(payload.payeeWalletAddress, PAYEE_WALLET);
});

test("parseAiManagerX402ConnectorSettlementPayload requires tx hash for confirmed updates", () => {
  assert.throws(
    () =>
      parseAiManagerX402ConnectorSettlementPayload({
        paymentAttemptId: PAYMENT_ATTEMPT_ID,
        status: "CONFIRMED",
      }),
    /AI_MANAGER_X402_CONNECTOR_TX_HASH_REQUIRED/
  );
});

test("parseAiManagerX402ConnectorPendingObservationPayload validates pending poll payloads", () => {
  const payload = parseAiManagerX402ConnectorPendingObservationPayload({
    paymentAttemptId: PAYMENT_ATTEMPT_ID,
    detail: "connector poll observed pending settlement",
    payeeId: "platform-operations-wallet",
    payeeWalletAddress: PAYEE_WALLET,
  });

  assert.equal(payload.paymentAttemptId, PAYMENT_ATTEMPT_ID);
  assert.equal(payload.detail, "connector poll observed pending settlement");
  assert.equal(payload.payeeId, "platform-operations-wallet");
  assert.equal(payload.payeeWalletAddress, PAYEE_WALLET);
});

test("validateAiManagerX402ConnectorPayee accepts only verified matching payees", () => {
  const payload = parseAiManagerX402ConnectorSettlementPayload({
    paymentAttemptId: PAYMENT_ATTEMPT_ID,
    status: "FAILED",
    failureReason: "connector rejected settlement",
    payeeId: "platform-operations-wallet",
    payeeWalletAddress: PAYEE_WALLET,
  });

  assert.equal(
    validateAiManagerX402ConnectorPayee({
      payload,
      verifiedPayee: {
        id: "platform-operations-wallet",
        label: "Platform Operations Wallet",
        walletAddress: PAYEE_WALLET,
        x402EndpointUrl: "https://payments.creator.example.com/x402",
        verificationStatus: "VERIFIED",
      },
    }),
    null
  );

  assert.equal(
    validateAiManagerX402ConnectorPayee({
      payload,
      verifiedPayee: {
        id: "platform-operations-wallet",
        label: "Platform Operations Wallet",
        walletAddress: PAYEE_WALLET,
        x402EndpointUrl: null,
        verificationStatus: "UNVERIFIED",
      },
    }),
    "AI_MANAGER_X402_CONNECTOR_PAYEE_UNVERIFIED"
  );
});
