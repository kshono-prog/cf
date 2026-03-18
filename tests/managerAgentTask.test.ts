import assert from "node:assert/strict";
import test from "node:test";

import {
  buildManagerAgentTaskOutput,
  normalizeManagerAgentTaskInput,
} from "../lib/creator-ai/managerAgentTask";
import type { SummaryViewData } from "../lib/mypage/accountPageTypes";

const BASE_SUMMARY: SummaryViewData = {
  project: {
    id: "project-1",
    title: "Spring Live",
    description: "funding for the next live show",
    status: "OPEN",
    currency: "JPYC",
    purposeMode: "FLEXIBLE",
    ownerAddress: "0xowner",
    creatorProfileId: "creator-1",
    bridgedAt: null,
    distributedAt: null,
    createdAt: "2026-03-17T00:00:00.000Z",
    updatedAt: "2026-03-17T00:00:00.000Z",
  },
  goal: {
    id: "goal-1",
    unitCurrency: "JPYC",
    targetAmount: 1000,
    targetAmountJpyc: 1000,
    achievedAt: null,
    deadline: null,
  },
  progress: {
    currency: "JPYC",
    confirmedJpyc: 1200,
    confirmedTotal: 1200,
    confirmedByCurrency: {
      JPYC: 1200,
      USDC: 0,
    },
    targetAmount: 1000,
    targetJpyc: 1000,
    progressPct: 100,
    totals: {
      JPYC: "1200",
      USDC: "0",
    },
  },
  distributionPlan: null,
  lastBridgeRuns: [],
  lastDistributionRuns: [],
};

test("normalizeManagerAgentTaskInput keeps the common input envelope", () => {
  const normalized = normalizeManagerAgentTaskInput(
    {
      source: "mypage",
      requestedAt: "2026-03-17T00:00:00.000Z",
    },
    "2026-03-18T00:00:00.000Z"
  );

  assert.deepEqual(normalized, {
    source: "mypage",
    requestedAt: "2026-03-17T00:00:00.000Z",
  });
});

test("manager task output stores next actions and evidence from summary", () => {
  const output = buildManagerAgentTaskOutput({
    summary: BASE_SUMMARY,
    input: {
      source: "mypage",
      requestedAt: "2026-03-17T00:00:00.000Z",
    },
    isOwner: true,
  });

  assert.equal(output.suggestedActions[0]?.title, "目標達成を確定してください");
  assert.equal(output.suggestedActions[0]?.recommendedUiTarget, "achieve");
  assert.equal(output.evidence.goalConfigured, true);
  assert.equal(output.evidence.goalAchieved, false);
  assert.equal(output.evidence.distributionPlanMissing, true);
  assert.equal(output.projectSnapshot?.title, "Spring Live");
  assert.match(output.summary, /next action/);
});

test("manager task output falls back safely when summary is unavailable", () => {
  const output = buildManagerAgentTaskOutput({
    summary: null,
    input: {
      source: "mypage",
      requestedAt: "2026-03-17T00:00:00.000Z",
    },
    isOwner: true,
  });

  assert.deepEqual(output.suggestedActions, []);
  assert.equal(output.evidence.goalConfigured, false);
  assert.equal(output.projectSnapshot, undefined);
  assert.match(output.summary, /summary がまだ取得できない/);
});
