import test from "node:test";
import { strict as assert } from "node:assert";

import {
  calculateRewardTierFundingProgress,
  resolveRewardTierProductionStatus,
  toRewardTierProgressDto,
} from "@/lib/rewardTierProgress";

test("COUNT 未達: 残件数と未達ラベルを返す", () => {
  const p = calculateRewardTierFundingProgress({
    tier: { startThresholdType: "COUNT", startThresholdValue: 10 },
    confirmedSupportCount: 7,
    confirmedSupportAmountJpyc: 14000,
  });
  assert.equal(p.hasThreshold, true);
  assert.equal(p.thresholdType, "COUNT");
  assert.equal(p.remainingCountToStart, 3);
  assert.equal(p.isThresholdReached, false);
  assert.equal(p.progressToStartPct, 70);
  assert.match(p.progressLabel ?? "", /あと3件/);
});

test("COUNT 達成: 残 0 かつ達成ラベル", () => {
  const p = calculateRewardTierFundingProgress({
    tier: { startThresholdType: "COUNT", startThresholdValue: 10 },
    confirmedSupportCount: 12,
    confirmedSupportAmountJpyc: 0,
  });
  assert.equal(p.isThresholdReached, true);
  assert.equal(p.remainingCountToStart, 0);
  assert.equal(p.progressLabel, "開始条件達成");
});

test("AMOUNT 未達: 残金額と未達ラベル", () => {
  const p = calculateRewardTierFundingProgress({
    tier: { startThresholdType: "AMOUNT", startThresholdValue: 50000 },
    confirmedSupportCount: 3,
    confirmedSupportAmountJpyc: 35000,
  });
  assert.equal(p.thresholdType, "AMOUNT");
  assert.equal(p.remainingAmountToStart, 15000);
  assert.equal(p.isThresholdReached, false);
  assert.match(p.progressLabel ?? "", /15,000/);
});

test("threshold 未設定 tier は hasThreshold=false", () => {
  const p = calculateRewardTierFundingProgress({
    tier: { startThresholdType: null, startThresholdValue: null },
    confirmedSupportCount: 5,
    confirmedSupportAmountJpyc: 1000,
  });
  assert.equal(p.hasThreshold, false);
  assert.equal(p.thresholdLabel, null);
  assert.equal(p.progressLabel, null);
});

test("NOT_STARTED + 達成 → READY_TO_START", () => {
  const status = resolveRewardTierProductionStatus({
    currentProductionStatus: "NOT_STARTED",
    isThresholdReached: true,
  });
  assert.equal(status, "READY_TO_START");
});

test("READY_TO_START は自動で進めない", () => {
  const status = resolveRewardTierProductionStatus({
    currentProductionStatus: "READY_TO_START",
    isThresholdReached: true,
  });
  assert.equal(status, "READY_TO_START");
});

test("IN_PROGRESS はそのまま維持", () => {
  const status = resolveRewardTierProductionStatus({
    currentProductionStatus: "IN_PROGRESS",
    isThresholdReached: false,
  });
  assert.equal(status, "IN_PROGRESS");
});

test("toRewardTierProgressDto: canStartProduction は READY_TO_START 時のみ true", () => {
  const dto = toRewardTierProgressDto({
    tier: {
      startThresholdType: "COUNT",
      startThresholdValue: 2,
      productionStatus: "NOT_STARTED",
    },
    confirmedSupportCount: 5,
    confirmedSupportAmountJpyc: 10,
  });
  assert.equal(dto.productionStatus, "READY_TO_START");
  assert.equal(dto.canStartProduction, true);
  assert.equal(dto.canCompleteProduction, false);
});
