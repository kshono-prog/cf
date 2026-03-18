import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAiOfficeRoleUsefulnessSummary,
  buildAiOfficeUsefulnessSummary,
} from "../lib/aiOfficeDashboard";

test("AI Office usefulness summary tracks approvals, rejections, stale waiting tasks, and auto-complete", () => {
  const summary = buildAiOfficeUsefulnessSummary(
    [
      {
        taskType: "ANNOUNCEMENT_DRAFT",
        status: "WAITING_APPROVAL",
        createdAt: new Date("2026-03-10T00:00:00.000Z"),
        approvedAt: null,
        auditLogs: [
          {
            action: "TASK_CREATED_WAITING_APPROVAL",
            createdAt: new Date("2026-03-10T00:00:00.000Z"),
          },
        ],
      },
      {
        taskType: "MANAGER_NEXT_ACTIONS",
        status: "DONE",
        createdAt: new Date("2026-03-15T00:00:00.000Z"),
        approvedAt: new Date("2026-03-15T06:00:00.000Z"),
        auditLogs: [
          {
            action: "TASK_CREATED_WAITING_APPROVAL",
            createdAt: new Date("2026-03-15T00:00:00.000Z"),
          },
          {
            action: "TASK_APPROVED",
            createdAt: new Date("2026-03-15T06:00:00.000Z"),
          },
        ],
      },
      {
        taskType: "SUPPORTER_MESSAGE_DRAFT",
        status: "FAILED",
        createdAt: new Date("2026-03-16T00:00:00.000Z"),
        approvedAt: new Date("2026-03-16T12:00:00.000Z"),
        auditLogs: [
          {
            action: "TASK_CREATED_WAITING_APPROVAL",
            createdAt: new Date("2026-03-16T00:00:00.000Z"),
          },
          {
            action: "TASK_REJECTED",
            createdAt: new Date("2026-03-16T12:00:00.000Z"),
          },
        ],
      },
      {
        taskType: "TRANSLATE",
        status: "DONE",
        createdAt: new Date("2026-03-17T00:00:00.000Z"),
        approvedAt: new Date("2026-03-17T00:00:00.000Z"),
        auditLogs: [
          {
            action: "TASK_CREATED_DONE",
            createdAt: new Date("2026-03-17T00:00:00.000Z"),
          },
        ],
      },
      {
        taskType: "WEEKLY_REPORT",
        status: "WAITING_APPROVAL",
        createdAt: new Date("2026-03-17T00:00:00.000Z"),
        approvedAt: null,
        auditLogs: [
          {
            action: "TASK_CREATED_WAITING_APPROVAL",
            createdAt: new Date("2026-03-17T00:00:00.000Z"),
          },
        ],
      },
    ],
    {
      now: new Date("2026-03-18T12:00:00.000Z"),
      windowDays: 30,
      staleAfterHours: 72,
    }
  );

  assert.deepEqual(summary, {
    windowDays: 30,
    staleAfterHours: 72,
    createdCount: 5,
    actionableCount: 4,
    autoCompletedCount: 1,
    waitingApprovalCount: 2,
    approvedCount: 1,
    rejectedCount: 1,
    ignoredCount: 1,
    followThroughCount: 2,
    followThroughRate: 0.5,
    approvalRate: 0.25,
    rejectionRate: 0.25,
    medianDecisionHours: 9,
  });
});

test("AI Office usefulness summary can break metrics down by selected role", () => {
  const summary = buildAiOfficeRoleUsefulnessSummary(
    [
      {
        taskType: "MANAGER_NEXT_ACTIONS",
        status: "DONE",
        createdAt: new Date("2026-03-15T00:00:00.000Z"),
        approvedAt: new Date("2026-03-15T06:00:00.000Z"),
        auditLogs: [
          {
            action: "TASK_CREATED_WAITING_APPROVAL",
            metaJson: { roleId: "MANAGER" },
            createdAt: new Date("2026-03-15T00:00:00.000Z"),
          },
          {
            action: "TASK_APPROVED",
            createdAt: new Date("2026-03-15T06:00:00.000Z"),
          },
        ],
      },
      {
        taskType: "ANNOUNCEMENT_DRAFT",
        status: "WAITING_APPROVAL",
        createdAt: new Date("2026-03-10T00:00:00.000Z"),
        approvedAt: null,
        auditLogs: [
          {
            action: "TASK_CREATED_WAITING_APPROVAL",
            metaJson: { roleId: "PROMOTION" },
            createdAt: new Date("2026-03-10T00:00:00.000Z"),
          },
        ],
      },
      {
        taskType: "SUPPORTER_MESSAGE_DRAFT",
        status: "FAILED",
        createdAt: new Date("2026-03-16T00:00:00.000Z"),
        approvedAt: new Date("2026-03-16T12:00:00.000Z"),
        auditLogs: [
          {
            action: "TASK_CREATED_WAITING_APPROVAL",
            metaJson: { roleId: "FAN_RELATION" },
            createdAt: new Date("2026-03-16T00:00:00.000Z"),
          },
          {
            action: "TASK_REJECTED",
            createdAt: new Date("2026-03-16T12:00:00.000Z"),
          },
        ],
      },
    ],
    {
      now: new Date("2026-03-18T12:00:00.000Z"),
      staleAfterHours: 72,
    }
  );

  assert.deepEqual(summary, [
    {
      roleId: "MANAGER",
      label: "Manager Agent",
      actionableCount: 1,
      waitingApprovalCount: 0,
      approvedCount: 1,
      rejectedCount: 0,
      ignoredCount: 0,
      followThroughRate: 1,
    },
    {
      roleId: "PROMOTION",
      label: "Promotion Agent",
      actionableCount: 1,
      waitingApprovalCount: 1,
      approvedCount: 0,
      rejectedCount: 0,
      ignoredCount: 1,
      followThroughRate: 0,
    },
    {
      roleId: "FAN_RELATION",
      label: "Fan Relation Agent",
      actionableCount: 1,
      waitingApprovalCount: 0,
      approvedCount: 0,
      rejectedCount: 1,
      ignoredCount: 0,
      followThroughRate: 1,
    },
  ]);
});
