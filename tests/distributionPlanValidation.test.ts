import assert from "node:assert/strict";
import test from "node:test";

import { isValidDistributionPlan } from "@/types/distribution";

const VALID_ROW = {
  recipientAddress: "0xabc",
  amountAtomic: "1000000",
  memo: "payment",
  token: "JPYC" as const,
};

test("isValidDistributionPlan accepts a flat array of valid rows", () => {
  assert.equal(isValidDistributionPlan([VALID_ROW]), true);
  assert.equal(
    isValidDistributionPlan([
      VALID_ROW,
      { ...VALID_ROW, token: "USDC" as const },
    ]),
    true
  );
});

test("isValidDistributionPlan accepts an object with a rows array", () => {
  assert.equal(isValidDistributionPlan({ rows: [VALID_ROW] }), true);
  assert.equal(
    isValidDistributionPlan({ rows: [VALID_ROW], version: 1 }),
    true
  );
});

test("isValidDistributionPlan rejects non-objects and non-arrays", () => {
  assert.equal(isValidDistributionPlan(null), false);
  assert.equal(isValidDistributionPlan(undefined), false);
  assert.equal(isValidDistributionPlan("string"), false);
  assert.equal(isValidDistributionPlan(42), false);
  assert.equal(isValidDistributionPlan({}), false); // no rows key
  assert.equal(isValidDistributionPlan({ rows: "not-an-array" }), false);
});

test("isValidDistributionPlan rejects rows with missing required fields", () => {
  assert.equal(
    isValidDistributionPlan([{ ...VALID_ROW, recipientAddress: "" }]),
    false
  );
  assert.equal(
    isValidDistributionPlan([{ ...VALID_ROW, amountAtomic: "" }]),
    false
  );
  assert.equal(
    isValidDistributionPlan([{ ...VALID_ROW, token: "ETH" }]),
    false
  );
  assert.equal(
    isValidDistributionPlan([{ amountAtomic: "100", memo: "x", token: "JPYC" }]),
    false // missing recipientAddress
  );
});

test("isValidDistributionPlan accepts memo as empty string", () => {
  assert.equal(isValidDistributionPlan([{ ...VALID_ROW, memo: "" }]), true);
});

test("isValidDistributionPlan rejects a completely random object", () => {
  assert.equal(isValidDistributionPlan({ random: "object" }), false);
  assert.equal(isValidDistributionPlan([{ foo: "bar" }]), false);
});
