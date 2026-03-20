import assert from "node:assert/strict";
import test from "node:test";

import {
  parseCreatorPublicDto,
  serializeCreatorLatestProjectSummary,
} from "../lib/serializers/creator";

test("serializeCreatorLatestProjectSummary uses neutral goal and progress fields", () => {
  const summary = serializeCreatorLatestProjectSummary({
    project: {
      id: "project-1",
      title: "JPYC project",
      description: null,
      status: "OPEN",
      currency: "JPYC",
      purposeMode: "OPTIONAL",
      ownerAddress: null,
      creatorProfileId: "1",
      bridgedAt: null,
      distributedAt: null,
      createdAt: "2026-03-20T00:00:00.000Z",
      updatedAt: "2026-03-20T00:00:00.000Z",
    },
    goal: {
      id: "goal-1",
      unitCurrency: "JPYC",
      targetAmount: 1000,
      achievedAt: null,
      deadline: null,
    },
    progress: {
      currency: "JPYC",
      confirmedAmount: 250,
      targetAmount: 1000,
      progressPct: 25,
      totals: {
        JPYC: "250",
        USDC: "0",
      },
    },
    distributionPlan: null,
    lastBridgeRuns: [],
    lastDistributionRuns: [],
  });

  assert.deepEqual(summary, {
    projectId: "project-1",
    title: "JPYC project",
    currency: "JPYC",
    targetAmount: 1000,
    confirmedAmount: 250,
    progressPct: 25,
    achievedAt: null,
  });
});

test("parseCreatorPublicDto reads project ids and latest project summary", () => {
  const creator = parseCreatorPublicDto({
    username: "kazu",
    displayName: "Kazu",
    profile: "profile",
    avatarUrl: "/avatars/kazu.jpg",
    qrcode: null,
    url: "https://example.com",
    themeColor: "#005bbb",
    creatorType: "MUSICIAN",
    projectId: "project-1",
    projectIdsByCurrency: {
      JPYC: "project-1",
      USDC: "project-2",
    },
    latestProjectSummary: {
      projectId: "project-1",
      title: "Latest project",
      currency: "JPYC",
      targetAmount: 1000,
      confirmedAmount: 250,
      progressPct: 25,
      achievedAt: null,
    },
  });

  assert.equal(creator.projectId, "project-1");
  assert.deepEqual(creator.projectIdsByCurrency, {
    JPYC: "project-1",
    USDC: "project-2",
  });
  assert.deepEqual(creator.latestProjectSummary, {
    projectId: "project-1",
    title: "Latest project",
    currency: "JPYC",
    targetAmount: 1000,
    confirmedAmount: 250,
    progressPct: 25,
    achievedAt: null,
  });
});
