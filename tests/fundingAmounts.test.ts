import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveConfirmedAmount,
  resolveGoalTargetAmount,
  resolveProgressTargetAmount,
} from "../lib/fundingAmounts";

test("resolveGoalTargetAmount prefers neutral targetAmount", () => {
  assert.equal(
    resolveGoalTargetAmount({ targetAmount: 1200, targetAmountJpyc: 900 }),
    1200
  );
});

test("resolveGoalTargetAmount falls back to legacy targetAmountJpyc", () => {
  assert.equal(resolveGoalTargetAmount({ targetAmountJpyc: 900 }), 900);
  assert.equal(resolveGoalTargetAmount(null), null);
});

test("resolveConfirmedAmount prefers neutral confirmedAmount", () => {
  assert.equal(
    resolveConfirmedAmount({
      confirmedAmount: 250,
      confirmedTotal: 200,
      confirmedJpyc: 100,
    }),
    250
  );
});

test("resolveConfirmedAmount falls back through confirmedTotal and confirmedJpyc", () => {
  assert.equal(resolveConfirmedAmount({ confirmedTotal: 200 }), 200);
  assert.equal(resolveConfirmedAmount({ confirmedJpyc: 150 }), 150);
  assert.equal(resolveConfirmedAmount(null), 0);
});

test("resolveProgressTargetAmount prefers neutral targetAmount", () => {
  assert.equal(
    resolveProgressTargetAmount({ targetAmount: 300, targetJpyc: 100 }),
    300
  );
  assert.equal(resolveProgressTargetAmount({ targetJpyc: 100 }), 100);
  assert.equal(resolveProgressTargetAmount(null), null);
});
