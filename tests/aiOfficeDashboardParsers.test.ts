import assert from "node:assert/strict";
import test from "node:test";

import {
  parseAiOfficeContentSummary,
  parseAiOfficeMetrics,
  parseAiOfficeMetricTrends,
  parseAiOfficeTasks,
  parseAiOfficeUsefulnessSummary,
} from "../components/mypage/aiOfficeDashboardParsers";

test("AI Office content summary parser normalizes missing counts", () => {
  const parsed = parseAiOfficeContentSummary({
    totalPosts: 4,
    publishedPosts: 2,
    aiGeneratedPosts: Number.NaN,
    lastPostAt: "2026-03-17T00:00:00.000Z",
    lastPublishedAt: null,
  });

  assert.deepEqual(parsed, {
    totalPosts: 4,
    publishedPosts: 2,
    draftPosts: 0,
    archivedPosts: 0,
    aiGeneratedPosts: 0,
    lastPostAt: "2026-03-17T00:00:00.000Z",
    lastPublishedAt: null,
  });
});

test("AI Office task parser preserves valid tasks and audit logs", () => {
  const parsed = parseAiOfficeTasks({
    tasks: [
      {
        id: "task-1",
        projectId: "project-1",
        taskType: "PROPOSE",
        status: "WAITING_APPROVAL",
        approvedBy: null,
        approvedAt: null,
        createdAt: "2026-03-17T00:00:00.000Z",
        output: { summary: "ok" },
        auditLogs: [
          {
            id: "log-1",
            action: "CREATED",
            actorAddress: "0xabc",
            createdAt: "2026-03-17T00:00:00.000Z",
            meta: { note: "initial" },
          },
          {
            id: "log-2",
            action: null,
            actorAddress: "0xabc",
            createdAt: "2026-03-17T00:01:00.000Z",
          },
        ],
      },
      {
        id: "task-2",
        projectId: "project-1",
        taskType: null,
        status: "DONE",
        createdAt: "2026-03-17T00:00:00.000Z",
      },
    ],
  });

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]?.id, "task-1");
  assert.deepEqual(parsed[0]?.auditLogs, [
    {
      id: "log-1",
      action: "CREATED",
      actorAddress: "0xabc",
      createdAt: "2026-03-17T00:00:00.000Z",
      note: "initial",
    },
  ]);
});

test("AI Office metrics parser normalizes missing totals and snapshots", () => {
  const parsed = parseAiOfficeMetrics({
    totals: {
      views: 10,
      likes: 3,
      comments: Number.NaN,
    },
    snapshots: [
      {
        id: "snap-1",
        platform: "X",
        capturedAt: "2026-03-17T00:00:00.000Z",
        views: 8,
        likes: 2,
        comments: 1,
        shares: null,
      },
      {
        id: "snap-2",
        platform: null,
        capturedAt: "2026-03-17T00:00:00.000Z",
      },
    ],
  });

  assert.deepEqual(parsed.totals, {
    views: 10,
    likes: 3,
    comments: 0,
    shares: 0,
  });
  assert.deepEqual(parsed.snapshots, [
    {
      id: "snap-1",
      platform: "X",
      capturedAt: "2026-03-17T00:00:00.000Z",
      views: 8,
      likes: 2,
      comments: 1,
      shares: null,
    },
  ]);
});

test("AI Office usefulness parser normalizes missing dashboard fields", () => {
  const parsed = parseAiOfficeUsefulnessSummary({
    windowDays: 14,
    actionableCount: 4,
    followThroughRate: 0.5,
    medianDecisionHours: Number.NaN,
  });

  assert.deepEqual(parsed, {
    windowDays: 14,
    staleAfterHours: 72,
    createdCount: 0,
    actionableCount: 4,
    autoCompletedCount: 0,
    trackedReadyCount: 0,
    waitingApprovalCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    ignoredCount: 0,
    followThroughCount: 0,
    followThroughRate: 0.5,
    usedCount: 0,
    usedRate: 0,
    approvalRate: 0,
    rejectionRate: 0,
    medianDecisionHours: null,
    roleBreakdown: [],
  });
});

test("AI Office usefulness parser keeps valid role breakdown rows", () => {
  const parsed = parseAiOfficeUsefulnessSummary({
    roleBreakdown: [
      {
        roleId: "MANAGER",
        label: "Manager Agent",
        actionableCount: 3,
        trackedReadyCount: 2,
        usedCount: 1,
        waitingApprovalCount: 1,
        approvedCount: 1,
        rejectedCount: 1,
        ignoredCount: 0,
        followThroughRate: 0.6667,
        usedRate: 0.5,
      },
      {
        roleId: "INVALID",
        label: "Broken",
      },
    ],
  });

  assert.deepEqual(parsed.roleBreakdown, [
    {
      roleId: "MANAGER",
      label: "Manager Agent",
      actionableCount: 3,
      trackedReadyCount: 2,
      usedCount: 1,
      waitingApprovalCount: 1,
      approvedCount: 1,
      rejectedCount: 1,
      ignoredCount: 0,
      followThroughRate: 0.6667,
      usedRate: 0.5,
    },
  ]);
});

test("AI Office metric trend parser tolerates partial top-platform data", () => {
  const parsed = parseAiOfficeMetricTrends({
    daily: [
      {
        date: "2026-03-17",
        views: 20,
        likes: 5,
        comments: 2,
        shares: 1,
        interactionRate: 0.4,
        topPlatform: {
          platform: "X",
          rate: 0.5,
          count: 10,
        },
      },
      {
        date: "2026-03-16",
        views: 10,
        likes: 2,
        comments: 1,
        shares: 0,
        interactionRate: 0.3,
        topPlatform: {
          platform: null,
          rate: 0.2,
          count: 3,
        },
      },
    ],
  });

  assert.deepEqual(parsed, [
    {
      date: "2026-03-17",
      views: 20,
      likes: 5,
      comments: 2,
      shares: 1,
      interactionRate: 0.4,
      topPlatform: {
        platform: "X",
        rate: 0.5,
        count: 10,
      },
    },
    {
      date: "2026-03-16",
      views: 10,
      likes: 2,
      comments: 1,
      shares: 0,
      interactionRate: 0.3,
      topPlatform: null,
    },
  ]);
});
