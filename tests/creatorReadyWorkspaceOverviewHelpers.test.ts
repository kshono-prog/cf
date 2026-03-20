import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCreatorReadyBetaActions,
  buildCreatorReadyQuickActions,
  hasCreatorReadySettlementAttention,
  parseCreatorReadyWaitingTasks,
  type ActiveProjectDashboard,
} from "../components/mypage/creatorReadyWorkspaceOverviewHelpers";

function createActiveDashboard(params?: {
  goalAchievedAt?: string | null;
  withGoal?: boolean;
  settlementStatus?: "NOT_READY" | "BRIDGING" | "READY_FOR_DISTRIBUTION" | "DISTRIBUTED";
}): ActiveProjectDashboard {
  const withGoal = params?.withGoal ?? true;

  return {
    projectId: "1",
    summary: {
      project: {
        id: "1",
        title: "Project",
        description: null,
        status: "OPEN",
        currency: "JPYC",
        purposeMode: "FLEXIBLE",
        ownerAddress: null,
        creatorProfileId: null,
        bridgedAt: null,
        distributedAt: null,
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
      },
      goal: withGoal
        ? {
            id: "goal-1",
            unitCurrency: "JPYC",
            targetAmount: 1000,
            achievedAt: params?.goalAchievedAt ?? null,
            deadline: null,
          }
        : null,
      progress: {
        currency: "JPYC",
        confirmedAmount: 200,
        confirmedTotal: 200,
        confirmedByCurrency: {
          JPYC: 200,
          USDC: 0,
        },
        targetAmount: 1000,
        progressPct: 20,
        totals: {
          JPYC: "200",
          USDC: null,
        },
      },
      distributionPlan: null,
      lastBridgeRuns: [],
      lastDistributionRuns: [],
    },
    settlement: {
      project: {
        id: "1",
        title: "Project",
        status: "OPEN",
      },
      goal: {
        id: "goal-1",
        achievedAt: params?.goalAchievedAt ?? null,
        targetAmount: 1000,
      },
      settlement: {
        id: "settlement-1",
        status: params?.settlementStatus ?? "NOT_READY",
        bridgedTotalAtomic: "0",
        distributedTotalAtomic: "0",
        readyAt: null,
        distributedAt: null,
        updatedAt: "2026-03-01T00:00:00.000Z",
      },
      bridgeSteps: [],
      distributionEntries: [],
      recentExecutions: [],
      cctpJobs: [],
    },
  };
}

test("parseCreatorReadyWaitingTasks keeps only waiting approval tasks", () => {
  assert.deepEqual(
    parseCreatorReadyWaitingTasks({
      tasks: [
        {
          id: "task-1",
          taskType: "ANNOUNCEMENT_DRAFT",
          status: "WAITING_APPROVAL",
        },
        {
          id: "task-2",
          taskType: "WEEKLY_REPORT",
          status: "DONE",
        },
        {
          id: "task-3",
          status: "WAITING_APPROVAL",
        },
        null,
      ],
    }),
    [{ id: "task-1", taskType: "ANNOUNCEMENT_DRAFT" }]
  );
});

test("hasCreatorReadySettlementAttention reacts to achieved goals and settlement status", () => {
  assert.equal(
    hasCreatorReadySettlementAttention([createActiveDashboard()]),
    false
  );
  assert.equal(
    hasCreatorReadySettlementAttention([
      createActiveDashboard({ settlementStatus: "BRIDGING" }),
    ]),
    true
  );
  assert.equal(
    hasCreatorReadySettlementAttention([
      createActiveDashboard({ goalAchievedAt: "2026-03-02T00:00:00.000Z" }),
    ]),
    true
  );
});

test("buildCreatorReadyQuickActions prioritizes waiting approvals", () => {
  const onOpenSupportPage = () => undefined;
  const onOpenSupporterResponse = () => undefined;
  const onOpenPublicPage = () => undefined;

  const actions = buildCreatorReadyQuickActions({
    activeDashboards: [createActiveDashboard()],
    waitingApprovalCount: 2,
    onOpenSupportPage,
    onOpenSupporterResponse,
    onOpenPublicPage,
  });

  assert.equal(actions[0]?.title, "AIの承認待ちを確認する");
  assert.equal(actions[0]?.onAction, onOpenSupporterResponse);
  assert.equal(actions[1]?.onAction, onOpenSupportPage);
  assert.equal(actions[2]?.onAction, onOpenPublicPage);
});

test("buildCreatorReadyQuickActions falls back to setup guidance when no project exists", () => {
  const onOpenSupportPage = () => undefined;

  const actions = buildCreatorReadyQuickActions({
    activeDashboards: [],
    waitingApprovalCount: 0,
    onOpenSupportPage,
    onOpenSupporterResponse: () => undefined,
    onOpenPublicPage: () => undefined,
  });

  assert.equal(actions[0]?.title, "プロフィールと支援設定を準備する");
  assert.equal(actions[0]?.onAction, onOpenSupportPage);
});

test("buildCreatorReadyQuickActions asks for a goal before promotion work", () => {
  const onOpenSupportPage = () => undefined;

  const actions = buildCreatorReadyQuickActions({
    activeDashboards: [createActiveDashboard({ withGoal: false })],
    waitingApprovalCount: 0,
    onOpenSupportPage,
    onOpenSupporterResponse: () => undefined,
    onOpenPublicPage: () => undefined,
  });

  assert.equal(actions[0]?.title, "目標金額を設定する");
  assert.equal(actions[0]?.onAction, onOpenSupportPage);
});

test("buildCreatorReadyQuickActions suggests outreach once project and goal exist", () => {
  const onOpenSupporterResponse = () => undefined;

  const actions = buildCreatorReadyQuickActions({
    activeDashboards: [createActiveDashboard()],
    waitingApprovalCount: 0,
    onOpenSupportPage: () => undefined,
    onOpenSupporterResponse,
    onOpenPublicPage: () => undefined,
  });

  assert.equal(actions[0]?.title, "告知やお礼の下書きを進める");
  assert.equal(actions[0]?.onAction, onOpenSupporterResponse);
});

test("buildCreatorReadyBetaActions keeps beta entry points stable", () => {
  const onOpenSupporterResponse = () => undefined;
  const onOpenAdvancedSettings = () => undefined;

  const actions = buildCreatorReadyBetaActions({
    onOpenSupporterResponse,
    onOpenAdvancedSettings,
  });

  assert.deepEqual(
    actions.map((action) => action.title),
    ["分析・拡張機能", "精算・送金設定"]
  );
  assert.equal(actions[0]?.onAction, onOpenSupporterResponse);
  assert.equal(actions[1]?.onAction, onOpenAdvancedSettings);
});
