import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDistributionPlanDraftHandoff,
  buildSettlementDraftHref,
  buildSettlementPlanAnchorId,
  parseDistributionPlanDraftHandoff,
} from "../components/mypage/distributionPlanDraftHandoff";
import { buildDistributionPlanDraftPayload } from "../lib/creator-ai/distributionPlanDraft";

const PAYLOAD = buildDistributionPlanDraftPayload({
  project: {
    id: "project-1",
    title: "Spring Live",
    status: "OPEN",
    currency: "JPYC",
  },
  goal: {
    achievedAt: "2026-03-18T00:00:00.000Z",
  },
  progress: {
    progressPct: 100,
  },
  distributionPlan: null,
  settlement: {
    status: "READY_FOR_DISTRIBUTION",
    bridgedTotalAtomic: "1200",
  },
  distributionEntries: [],
  generatedAt: "2026-03-18T00:00:00.000Z",
});

test("distribution plan draft handoff keeps project, currency, and payload text", () => {
  const handoff = buildDistributionPlanDraftHandoff(PAYLOAD, {
    sourceTaskId: "task-1",
  });

  assert.equal(handoff.projectId, "project-1");
  assert.equal(handoff.currency, "JPYC");
  assert.match(handoff.payloadText, /"projectId": "project-1"/);
  assert.equal(handoff.sourceTaskId, "task-1");
});

test("distribution plan draft handoff parser rejects invalid rows", () => {
  assert.equal(parseDistributionPlanDraftHandoff(null), null);
  assert.equal(
    parseDistributionPlanDraftHandoff({
      projectId: "project-1",
      currency: "BTC",
      payloadText: "{}",
      createdAt: "2026-03-18T00:00:00.000Z",
      sourceTaskId: null,
    }),
    null
  );
});

test("distribution plan draft handoff builds advanced draft hrefs", () => {
  assert.equal(buildSettlementPlanAnchorId("JPYC"), "settlement-plan-jpyc");
  assert.equal(
    buildSettlementDraftHref({
      pathname: "/kazu/mypage/supporters",
      currency: "JPYC",
    }),
    "/kazu/mypage/advanced#settlement-plan-jpyc"
  );
});
