import assert from "node:assert/strict";
import test from "node:test";

import { parseSeedProjectConfig } from "../prisma/seedConfig";

test("parseSeedProjectConfig reads neutral seed env values", () => {
  const config = parseSeedProjectConfig({
    SEED_PROJECT_CURRENCY: "USDC",
    SEED_PROJECT_PURPOSE_MODE: "REQUIRED",
    SEED_GOAL_TARGET_AMOUNT: "1500",
    SEED_GOAL_DEADLINE: "2026-03-31T00:00:00.000Z",
  });

  assert.equal(config.currency, "USDC");
  assert.equal(config.purposeMode, "REQUIRED");
  assert.equal(config.goalTargetAmount, 1500);
  assert.equal(config.goalDeadline?.toISOString(), "2026-03-31T00:00:00.000Z");
});

test("parseSeedProjectConfig falls back safely when optional env vars are absent", () => {
  const config = parseSeedProjectConfig({});

  assert.deepEqual(config, {
    currency: "JPYC",
    purposeMode: "OPTIONAL",
    goalTargetAmount: null,
    goalDeadline: null,
  });
});

test("parseSeedProjectConfig rejects invalid currency values", () => {
  assert.throws(
    () =>
      parseSeedProjectConfig({
        SEED_PROJECT_CURRENCY: "JPY",
      }),
    /Invalid SEED_PROJECT_CURRENCY/
  );
});

test("parseSeedProjectConfig rejects invalid deadline values", () => {
  assert.throws(
    () =>
      parseSeedProjectConfig({
        SEED_GOAL_DEADLINE: "not-a-date",
      }),
    /Invalid SEED_GOAL_DEADLINE/
  );
});
