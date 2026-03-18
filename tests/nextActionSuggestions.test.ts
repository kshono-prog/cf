import assert from "node:assert/strict";
import test from "node:test";

import {
  getNextActionSuggestions,
  isDistributionPlanMissing,
} from "../lib/creator-ai/nextActionSuggestions";
import { NEXT_ACTION_TEST_CASES } from "../lib/creator-ai/nextActionSuggestions.testcases";

test("getNextActionSuggestions matches the documented manual cases", async (t) => {
  for (const testCase of NEXT_ACTION_TEST_CASES) {
    await t.test(testCase.name, () => {
      const suggestions = getNextActionSuggestions(testCase.input);

      assert.deepEqual(
        suggestions.map((suggestion) => suggestion.title),
        testCase.expectedTitles
      );
      assert.deepEqual(
        suggestions.map((suggestion) => suggestion.recommendedUiTarget),
        testCase.expectedTargets
      );
      assert.ok(suggestions.length <= 3);
    });
  }
});

test("isDistributionPlanMissing treats saved PLAN_ONLY runs as plan availability", () => {
  const savedPlanRun = {
    id: "distribution-run-1",
    createdAt: "2026-03-17T01:00:00.000Z",
    txHashes: [],
    mode: "PLAN_ONLY",
  };

  assert.equal(
    isDistributionPlanMissing({
      project: {
        id: "project-1",
        status: "OPEN",
        ownerAddress: "0xowner",
        bridgedAt: null,
        distributedAt: null,
      },
      goal: {
        id: "goal-1",
        targetAmountJpyc: 1000,
        achievedAt: "2026-03-17T00:00:00.000Z",
        deadline: null,
      },
      progress: {
        confirmedJpyc: 1000,
        targetJpyc: 1000,
        progressPct: 100,
      },
      distributionPlan: [],
      lastBridgeRuns: [],
      lastDistributionRuns: [savedPlanRun],
    }),
    false
  );
});
