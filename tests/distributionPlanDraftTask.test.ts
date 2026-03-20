import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDistributionPlanDraftTaskOutput,
  normalizeDistributionPlanDraftTaskInput,
} from "../lib/creator-ai/distributionPlanDraftTask";
import type { SummaryViewData } from "../lib/mypage/accountPageTypes";
import type { ProjectSettlementData } from "../lib/projectSettlementView";

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
    achievedAt: "2026-03-18T00:00:00.000Z",
    deadline: null,
  },
  progress: {
    currency: "JPYC",
    confirmedAmount: 1200,
    confirmedTotal: 1200,
    confirmedByCurrency: {
      JPYC: 1200,
      USDC: 0,
    },
    targetAmount: 1000,
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

const BASE_SETTLEMENT: ProjectSettlementData = {
  project: {
    id: "project-1",
    title: "Spring Live",
    status: "OPEN",
  },
  goal: {
    id: "goal-1",
    achievedAt: "2026-03-18T00:00:00.000Z",
    targetAmount: 1000,
  },
  settlement: {
    id: "settlement-1",
    status: "READY_FOR_DISTRIBUTION",
    bridgedTotalAtomic: "1200",
    distributedTotalAtomic: "0",
    readyAt: "2026-03-18T00:00:00.000Z",
    distributedAt: null,
    updatedAt: "2026-03-18T00:00:00.000Z",
  },
  bridgeSteps: [],
  distributionEntries: [
    {
      id: "entry-1",
      recipientAddressChecksum: "0x1111111111111111111111111111111111111111",
      token: "JPYC",
      amountAtomic: "700",
      memo: "artist",
      status: "DRAFT",
      sentAt: null,
      txHash: null,
      orderIndex: 0,
      createdAt: "2026-03-18T00:00:00.000Z",
      updatedAt: "2026-03-18T00:00:00.000Z",
    },
  ],
  recentExecutions: [],
  cctpJobs: [],
};

test("normalizeDistributionPlanDraftTaskInput keeps the common input envelope", () => {
  const normalized = normalizeDistributionPlanDraftTaskInput(
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

test("distribution plan draft task output stores payload from summary and settlement", () => {
  const output = buildDistributionPlanDraftTaskOutput({
    summary: BASE_SUMMARY,
    settlement: BASE_SETTLEMENT,
    input: {
      source: "mypage",
      requestedAt: "2026-03-18T00:00:00.000Z",
    },
  });

  assert.equal(output.draftPayload?.projectId, "project-1");
  assert.equal(output.draftPayload?.currency, "JPYC");
  assert.equal(output.draftPayload?.rows.length, 1);
  assert.equal(output.projectSnapshot?.settlementStatus, "READY_FOR_DISTRIBUTION");
  assert.match(output.summary, /配分 plan/);
});

test("distribution plan draft task output falls back safely when project data is unavailable", () => {
  const output = buildDistributionPlanDraftTaskOutput({
    summary: null,
    settlement: null,
    input: {
      source: "mypage",
      requestedAt: "2026-03-18T00:00:00.000Z",
    },
  });

  assert.equal(output.draftPayload, undefined);
  assert.equal(output.projectSnapshot, undefined);
  assert.match(output.summary, /まだ作成できませんでした/);
});
