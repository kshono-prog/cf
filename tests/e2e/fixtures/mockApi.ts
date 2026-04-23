import type { Page, Route } from "@playwright/test";

import type { SummaryResponseOk, SummaryViewData } from "@/lib/mypage/accountPageTypes";
import type { MyPageDashboardData } from "@/lib/mypage/dashboardTypes";
import {
  buildCreatorReadyDashboard,
  buildCreatorReadyMeStatus,
  buildCreatorReadySummary,
  buildUserOnlyMeStatus,
} from "@/lib/testing/e2eMocks";

export type CreatorReadyMockState = {
  dashboard: MyPageDashboardData;
  summary: SummaryResponseOk;
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toSummaryResponse(summary: SummaryViewData): SummaryResponseOk {
  return {
    ok: true,
    ...summary,
  };
}

function toSummaryView(summary: SummaryResponseOk): SummaryViewData {
  const { ok: ignoredOk, ...view } = summary;
  void ignoredOk;
  return view;
}

async function fulfillJson(
  route: Route,
  body: unknown,
  status: number = 200
): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export function createCreatorReadyMockState(
  username: string
): CreatorReadyMockState {
  const dashboard = cloneJson(buildCreatorReadyDashboard(username));
  const summaryView = cloneJson(buildCreatorReadySummary(username));

  summaryView.goal = null;
  summaryView.progress.targetAmount = null;
  summaryView.progress.targetJpyc = null;
  summaryView.progress.progressPct = 0;

  dashboard.projectsByCurrency.JPYC = {
    projectId: summaryView.project.id,
    summary: summaryView,
    settlement: null,
  };

  return {
    dashboard,
    summary: toSummaryResponse(summaryView),
  };
}

export async function mockCreatorPublicPage(
  page: Page,
  username: string
): Promise<void> {
  await page.route(
    `**/api/creators/${encodeURIComponent(username)}/follow**`,
    async (route) => {
      await fulfillJson(route, {
        ok: true,
        creator: {
          id: "follow-creator-1",
          username,
          displayName: "E2E Creator",
          avatarUrl: null,
        },
        counts: {
          followers: 12,
          following: 3,
        },
        viewer: {
          hasUser: false,
          isOwner: false,
          follows: false,
        },
        followers: [],
      });
    }
  );

  await page.route("**/api/projects/*/reward-tiers**", async (route) => {
    await fulfillJson(route, {
      items: [],
    });
  });
}

export async function mockMeNoUser(page: Page, username: string): Promise<void> {
  await page.route("**/api/me?**", async (route) => {
    await fulfillJson(route, {
      ok: true,
      hasUser: false,
      hasCreator: false,
      user: null,
      creator: null,
      projectId: null,
      projectIdsByCurrency: {
        JPYC: null,
        USDC: null,
      },
      username,
    });
  });
}

export async function mockMeUserOnly(
  page: Page,
  username: string
): Promise<void> {
  const me = buildUserOnlyMeStatus(username);
  await page.route("**/api/me?**", async (route) => {
    await fulfillJson(route, {
      ok: true,
      ...me,
    });
  });
}

export async function mockMeCreatorReady(
  page: Page,
  username: string
): Promise<void> {
  const me = buildCreatorReadyMeStatus(username);
  await page.route("**/api/me?**", async (route) => {
    await fulfillJson(route, {
      ok: true,
      ...me,
    });
  });
}

export async function mockSummarySuccess(
  page: Page,
  state: CreatorReadyMockState
): Promise<void> {
  await page.route("**/api/mypage/dashboard?**", async (route) => {
    await fulfillJson(route, state.dashboard);
  });

  await page.route("**/api/projects/*/summary", async (route) => {
    await fulfillJson(route, state.summary);
  });

  await page.route("**/api/projects/*/reward-tiers**", async (route) => {
    await fulfillJson(route, {
      items: [],
    });
  });

  await page.route("**/api/projects/*/payment-intents**", async (route) => {
    await fulfillJson(route, {
      items: [],
    });
  });
}

export async function mockCreateProjectSuccess(
  page: Page,
  state: CreatorReadyMockState
): Promise<void> {
  await page.route("**/api/projects", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() !== "POST" || url.pathname !== "/api/projects") {
      await route.fallback();
      return;
    }

    const body = request.postDataJSON() as {
      title?: string;
      description?: string | null;
      purposeMode?: string;
    };
    const nextProjectId = `e2e-project-${Date.now()}`;

    state.summary = {
      ...state.summary,
      project: {
        ...state.summary.project,
        id: nextProjectId,
        title: body.title?.trim() || "E2E Project",
        description: body.description?.trim() || null,
        purposeMode: body.purposeMode ?? "OPTIONAL",
      },
      goal: null,
      progress: {
        ...state.summary.progress,
        targetAmount: null,
        targetJpyc: null,
        progressPct: 0,
      },
    };

    state.dashboard = {
      ...state.dashboard,
      me: {
        ...state.dashboard.me,
        projectId: nextProjectId,
        projectIdsByCurrency: {
          JPYC: nextProjectId,
          USDC: null,
        },
      },
      selectedProjectId: nextProjectId,
      projectsByCurrency: {
        JPYC: {
          projectId: nextProjectId,
          summary: toSummaryView(state.summary),
          settlement: null,
        },
        USDC: null,
      },
    };

    await fulfillJson(route, {
      ok: true,
      projectId: nextProjectId,
      project: state.summary.project,
    });
  });
}

export async function mockGoalSaveSuccess(
  page: Page,
  state: CreatorReadyMockState
): Promise<void> {
  await page.route("**/api/projects/*/goal", async (route) => {
    const request = route.request();
    if (request.method() !== "PUT") {
      await route.fallback();
      return;
    }

    const body = request.postDataJSON() as {
      targetAmount?: number;
      deadline?: string | null;
    };
    const targetAmount =
      typeof body.targetAmount === "number" && Number.isFinite(body.targetAmount)
        ? body.targetAmount
        : 0;
    const confirmedAmount = state.summary.progress.confirmedAmount;
    const progressPct =
      targetAmount > 0 ? Math.min(100, (confirmedAmount / targetAmount) * 100) : 0;

    state.summary = {
      ...state.summary,
      goal: {
        id: "e2e-goal-jpyc",
        unitCurrency: "JPYC",
        targetAmount,
        targetAmountJpyc: targetAmount,
        achievedAt: null,
        deadline: body.deadline ?? null,
      },
      progress: {
        ...state.summary.progress,
        targetAmount,
        targetJpyc: targetAmount,
        progressPct,
      },
    };

    state.dashboard = {
      ...state.dashboard,
      projectsByCurrency: {
        JPYC: {
          projectId: state.summary.project.id,
          summary: toSummaryView(state.summary),
          settlement: null,
        },
        USDC: null,
      },
    };

    await fulfillJson(route, { ok: true });
  });
}
