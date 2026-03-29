import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAiManagerFundingInstructions,
  resolveAiManagerSettlementRail,
} from "../lib/aiManager/funding";

const OWNER_WALLET = "0x1111111111111111111111111111111111111111";
const BUDGET_WALLET = "0x2222222222222222222222222222222222222222";
const PLATFORM_WALLET = "0x3333333333333333333333333333333333333333";
const TOKEN_ADDRESS = "0x4444444444444444444444444444444444444444";

test("buildAiManagerFundingInstructions marks x402 ready when payee and endpoint exist", () => {
  const instructions = buildAiManagerFundingInstructions({
    aiManagerAccountId: "aimgr_test_1234",
    ownerControlWalletAddress: OWNER_WALLET,
    budgetWalletAddress: BUDGET_WALLET,
    preferredRail: "X402_PREFERRED",
    currency: "JPYC",
    platformOperationsWalletAddress: PLATFORM_WALLET,
    platformOperationsChainId: 137,
    x402EndpointUrl: "https://payments.creator.example.com/x402",
    settlementTokenAddress: TOKEN_ADDRESS,
  });

  assert.equal(instructions.activeSettlementRail, "X402");
  assert.equal(instructions.x402Status, "X402_READY");
  assert.equal(instructions.budgetWalletAddress, BUDGET_WALLET);
  assert.equal(instructions.payeeId, "platform-operations-wallet");
  assert.equal(instructions.payeeLabel, "Platform Operations Wallet");
  assert.equal(instructions.payeeVerificationStatus, "VERIFIED");
  assert.equal(instructions.platformOperationsWalletAddress, PLATFORM_WALLET);
  assert.equal(instructions.chainShortName, "Polygon");
  assert.equal(instructions.tokenAddress, TOKEN_ADDRESS);
  assert.match(instructions.referenceCode, /^CF-AI-/);
  assert.ok(instructions.steps.length >= 3);
  assert.equal(instructions.warnings.length, 0);
});

test("buildAiManagerFundingInstructions falls back to internal ledger when x402 config is incomplete", () => {
  const instructions = buildAiManagerFundingInstructions({
    aiManagerAccountId: "aimgr_test_5678",
    ownerControlWalletAddress: OWNER_WALLET,
    budgetWalletAddress: null,
    preferredRail: "X402_PREFERRED",
    currency: "JPYC",
    platformOperationsWalletAddress: null,
    platformOperationsChainId: 137,
    x402EndpointUrl: null,
    settlementTokenAddress: null,
  });

  assert.equal(instructions.activeSettlementRail, "INTERNAL_LEDGER");
  assert.equal(instructions.x402Status, "X402_CONFIG_REQUIRED");
  assert.equal(instructions.budgetWalletAddress, null);
  assert.equal(instructions.payeeVerificationStatus, "UNVERIFIED");
  assert.ok(instructions.warnings.length >= 3);
});

test("resolveAiManagerSettlementRail respects internal-ledger preference", () => {
  const resolution = resolveAiManagerSettlementRail({
    preferredRail: "INTERNAL_LEDGER_FALLBACK",
    payeeVerificationStatus: "VERIFIED",
    settlementTokenAddress: TOKEN_ADDRESS,
  });

  assert.equal(resolution.activeSettlementRail, "INTERNAL_LEDGER");
  assert.equal(resolution.x402Status, "INTERNAL_LEDGER_ONLY");
});

test("resolveAiManagerSettlementRail requires a verified payee before enabling x402", () => {
  const resolution = resolveAiManagerSettlementRail({
    preferredRail: "X402_PREFERRED",
    payeeVerificationStatus: "UNVERIFIED",
    settlementTokenAddress: TOKEN_ADDRESS,
  });

  assert.equal(resolution.activeSettlementRail, "INTERNAL_LEDGER");
  assert.equal(resolution.x402Status, "X402_CONFIG_REQUIRED");
});
