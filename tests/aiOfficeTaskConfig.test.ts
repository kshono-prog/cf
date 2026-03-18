import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_OFFICE_TASK_CHOICES,
  doesAiOfficeTaskMatchRole,
  getAiOfficeRoleGuidance,
  getAiOfficeRoleChoice,
  getAiOfficeRoleChoices,
  getAiOfficeRoleUsefulness,
  getAiOfficeTaskUsefulness,
  getAiOfficeTaskRoleChoices,
  buildAiOfficeTaskInput,
  getDefaultAiOfficeRole,
  getAiOfficeTaskChoice,
  getAiOfficeTaskChoiceGroups,
  sortAiOfficeTaskChoicesByUsefulness,
  normalizeAiOfficeTaskDraft,
  validateAiOfficeTaskDraft,
} from "../components/mypage/aiOfficeTaskConfig";

test("AI Office task choices expose both MVP and Beta tiers", () => {
  const tiers = new Set(AI_OFFICE_TASK_CHOICES.map((choice) => choice.tier));

  assert.equal(tiers.has("MVP"), true);
  assert.equal(tiers.has("BETA"), true);
});

test("AI Office task choice helpers preserve tier order and task lookup", () => {
  const groups = getAiOfficeTaskChoiceGroups();

  assert.deepEqual(groups.map((group) => group.tier), ["MVP", "BETA"]);
  assert.deepEqual(
    groups[0]?.choices.map((choice) => choice.taskType),
    ["MANAGER_NEXT_ACTIONS", "PROPOSE", "ANALYZE", "TRANSLATE"]
  );
  assert.deepEqual(
    groups[1]?.choices.map((choice) => choice.taskType),
    [
      "DISTRIBUTION_PLAN_DRAFT",
      "WEEKLY_REPORT",
      "ANNOUNCEMENT_DRAFT",
      "SUPPORTER_MESSAGE_DRAFT",
    ]
  );
  assert.equal(getAiOfficeTaskChoice("WEEKLY_REPORT")?.tier, "BETA");
  assert.equal(getAiOfficeTaskChoice("TRANSLATE")?.eyebrow, "翻訳");
  assert.equal(
    getAiOfficeTaskChoice("MANAGER_NEXT_ACTIONS")?.eyebrow,
    "Manager"
  );
});

test("AI Office role choices expose role-based entry points with task mappings", () => {
  const roleChoices = getAiOfficeRoleChoices();

  assert.deepEqual(
    roleChoices.map((choice) => choice.roleId),
    ["MANAGER", "PROMOTION", "FINANCE", "FAN_RELATION"]
  );
  assert.equal(getAiOfficeRoleChoice("MANAGER")?.featuredTaskType, "MANAGER_NEXT_ACTIONS");
  assert.equal(
    getAiOfficeRoleChoice("FINANCE")?.featuredTaskType,
    "DISTRIBUTION_PLAN_DRAFT"
  );
  assert.equal(getAiOfficeRoleChoice("FAN_RELATION")?.tier, "BETA");
  assert.equal(
    getAiOfficeTaskRoleChoices("ANNOUNCEMENT_DRAFT").some(
      (choice) => choice.roleId === "PROMOTION"
    ),
    true
  );
  assert.equal(getDefaultAiOfficeRole("TRANSLATE"), "PROMOTION");
  assert.equal(doesAiOfficeTaskMatchRole("TRANSLATE", "PROMOTION"), true);
  assert.equal(doesAiOfficeTaskMatchRole("TRANSLATE", "FINANCE"), false);
});

test("AI Office role guidance points creators to pending or effective roles", () => {
  const roleChoices = getAiOfficeRoleChoices();

  const attention = getAiOfficeRoleGuidance(roleChoices, [
    {
      roleId: "FINANCE",
      label: "Finance Agent",
      actionableCount: 2,
      waitingApprovalCount: 2,
      approvedCount: 0,
      rejectedCount: 0,
      ignoredCount: 1,
      followThroughRate: 0,
    },
  ]);
  assert.equal(attention.tone, "attention");
  assert.equal(attention.roleId, "FINANCE");
  assert.equal(
    getAiOfficeRoleUsefulness("FINANCE", [
      {
        roleId: "FINANCE",
        label: "Finance Agent",
        actionableCount: 2,
        waitingApprovalCount: 2,
        approvedCount: 0,
        rejectedCount: 0,
        ignoredCount: 1,
        followThroughRate: 0,
      },
    ])?.ignoredCount,
    1
  );

  const recommended = getAiOfficeRoleGuidance(roleChoices, [
    {
      roleId: "PROMOTION",
      label: "Promotion Agent",
      actionableCount: 3,
      waitingApprovalCount: 0,
      approvedCount: 2,
      rejectedCount: 0,
      ignoredCount: 0,
      followThroughRate: 0.6667,
    },
  ]);
  assert.equal(recommended.tone, "recommended");
  assert.equal(recommended.roleId, "PROMOTION");
});

test("AI Office task usefulness and sorting prefer previously approved task types", () => {
  const taskUsefulness = getAiOfficeTaskUsefulness("ANNOUNCEMENT_DRAFT", [
    {
      id: "task-1",
      projectId: "project-1",
      taskType: "ANNOUNCEMENT_DRAFT",
      status: "DONE",
      approvedBy: "0xabc",
      approvedAt: "2026-03-18T00:00:00.000Z",
      createdAt: "2026-03-18T00:00:00.000Z",
      output: {},
      auditLogs: [
        {
          id: "log-1",
          action: "TASK_CREATED_WAITING_APPROVAL",
          actorAddress: "0xabc",
          createdAt: "2026-03-18T00:00:00.000Z",
          note: null,
        },
        {
          id: "log-2",
          action: "TASK_APPROVED",
          actorAddress: "0xabc",
          createdAt: "2026-03-18T01:00:00.000Z",
          note: null,
        },
      ],
    },
    {
      id: "task-2",
      projectId: "project-1",
      taskType: "TRANSLATE",
      status: "WAITING_APPROVAL",
      approvedBy: null,
      approvedAt: null,
      createdAt: "2026-03-18T00:00:00.000Z",
      output: {},
      auditLogs: [
        {
          id: "log-3",
          action: "TASK_CREATED_WAITING_APPROVAL",
          actorAddress: "0xabc",
          createdAt: "2026-03-18T00:00:00.000Z",
          note: null,
        },
      ],
    },
  ]);

  assert.deepEqual(taskUsefulness, {
    taskType: "ANNOUNCEMENT_DRAFT",
    actionableCount: 1,
    autoCompletedCount: 0,
    waitingApprovalCount: 0,
    approvedCount: 1,
    rejectedCount: 0,
    followThroughRate: 1,
  });

  const sorted = sortAiOfficeTaskChoicesByUsefulness(
    [
      getAiOfficeTaskChoice("TRANSLATE")!,
      getAiOfficeTaskChoice("DISTRIBUTION_PLAN_DRAFT")!,
      getAiOfficeTaskChoice("ANNOUNCEMENT_DRAFT")!,
    ],
    [
      {
        id: "task-1",
        projectId: "project-1",
        taskType: "ANNOUNCEMENT_DRAFT",
        status: "DONE",
        approvedBy: "0xabc",
        approvedAt: "2026-03-18T00:00:00.000Z",
        createdAt: "2026-03-18T00:00:00.000Z",
        output: {},
        auditLogs: [
          {
            id: "log-1",
            action: "TASK_CREATED_WAITING_APPROVAL",
            actorAddress: "0xabc",
            createdAt: "2026-03-18T00:00:00.000Z",
            note: null,
          },
          {
            id: "log-2",
            action: "TASK_APPROVED",
            actorAddress: "0xabc",
            createdAt: "2026-03-18T01:00:00.000Z",
            note: null,
          },
        ],
      },
    ]
  );

  assert.deepEqual(
    sorted.map((choice) => choice.taskType),
    ["ANNOUNCEMENT_DRAFT", "TRANSLATE", "DISTRIBUTION_PLAN_DRAFT"]
  );
});

test("distribution plan draft uses the common AI Office input envelope", () => {
  const input = buildAiOfficeTaskInput({
    taskType: "DISTRIBUTION_PLAN_DRAFT",
    translationInput: "",
    translationLang: "en",
    reportingWindowDays: 7,
    draftTone: "warm",
    announcementChannel: "SUPPORTERS",
    includeMetricsSummary: true,
    includeSupportSummary: true,
    supporterMessagePurpose: "THANK_YOU",
  });

  assert.equal(typeof input.source, "string");
  assert.equal(typeof input.requestedAt, "string");
  assert.deepEqual(Object.keys(input).sort(), ["requestedAt", "source"]);
});

test("announcement draft settings normalize to the supported defaults", () => {
  const normalized = normalizeAiOfficeTaskDraft({
    taskType: "ANNOUNCEMENT_DRAFT",
    translationInput: "",
    translationLang: "en",
    reportingWindowDays: 30,
    draftTone: "casual",
    announcementChannel: "GENERAL",
    includeMetricsSummary: false,
    includeSupportSummary: false,
    supporterMessagePurpose: "REENGAGEMENT",
  });

  assert.equal(normalized.reportingWindowDays, 7);
  assert.equal(normalized.announcementChannel, "SUPPORTERS");
  assert.equal(normalized.includeMetricsSummary, true);
  assert.equal(normalized.includeSupportSummary, true);
});

test("supporter draft settings keep support summary on and metrics off", () => {
  const normalized = normalizeAiOfficeTaskDraft({
    taskType: "SUPPORTER_MESSAGE_DRAFT",
    translationInput: "",
    translationLang: "en",
    reportingWindowDays: 7,
    draftTone: "warm",
    announcementChannel: "SUPPORTERS",
    includeMetricsSummary: true,
    includeSupportSummary: false,
    supporterMessagePurpose: "THANK_YOU",
  });

  assert.equal(normalized.reportingWindowDays, 30);
  assert.equal(normalized.includeMetricsSummary, false);
  assert.equal(normalized.includeSupportSummary, true);
});

test("translate draft requires non-empty text", () => {
  const error = validateAiOfficeTaskDraft({
    taskType: "TRANSLATE",
    translationInput: "   ",
    translationLang: "ja",
    reportingWindowDays: 7,
    draftTone: "warm",
    announcementChannel: "SUPPORTERS",
    includeMetricsSummary: true,
    includeSupportSummary: true,
    supporterMessagePurpose: "THANK_YOU",
  });

  assert.equal(error, "TRANSLATE タスクには翻訳テキストが必要です。");
});

test("task input builder uses normalized task settings", () => {
  const input = buildAiOfficeTaskInput({
    taskType: "ANNOUNCEMENT_DRAFT",
    translationInput: "",
    translationLang: "en",
    reportingWindowDays: 28,
    draftTone: "formal",
    announcementChannel: "GENERAL",
    includeMetricsSummary: false,
    includeSupportSummary: false,
    supporterMessagePurpose: "REENGAGEMENT",
  });

  assert.deepEqual(input, {
    source: "mypage",
    requestedAt: input.requestedAt,
    channel: "SUPPORTERS",
    tone: "formal",
    reportingWindowDays: 7,
    includeMetricsSummary: true,
    includeSupportSummary: true,
  });
  assert.equal(typeof input.requestedAt, "string");
});

test("manager task input builder uses the common AI Office envelope", () => {
  const input = buildAiOfficeTaskInput({
    taskType: "MANAGER_NEXT_ACTIONS",
    translationInput: "",
    translationLang: "en",
    reportingWindowDays: 7,
    draftTone: "warm",
    announcementChannel: "SUPPORTERS",
    includeMetricsSummary: true,
    includeSupportSummary: true,
    supporterMessagePurpose: "THANK_YOU",
  });

  assert.deepEqual(input, {
    source: "mypage",
    requestedAt: input.requestedAt,
  });
  assert.equal(typeof input.requestedAt, "string");
});
