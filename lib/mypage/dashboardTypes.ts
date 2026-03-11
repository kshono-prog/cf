import type {
  SummaryViewData,
  CurrencyCode,
} from "@/lib/mypage/accountPageTypes";
import type { MeStatus } from "@/lib/mypage/types";
import type { ProjectSettlementData } from "@/lib/projectSettlementView";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";

export type MyPageProjectDashboard = {
  projectId: string;
  summary: SummaryViewData | null;
  settlement: ProjectSettlementData | null;
};

export type MyPageDashboardData = {
  me: MeStatus;
  selectedProjectId: string | null;
  projectsByCurrency: Record<CurrencyCode, MyPageProjectDashboard | null>;
};

export type MyPageDashboardLoadOptions = {
  includeSummary: boolean;
  includeSettlement: boolean;
};

export type MyPageDashboardQueryMode =
  | "none"
  | "summary"
  | "settlement"
  | "full";

export function getMyPageDashboardLoadOptions(
  view: WorkspaceView
): MyPageDashboardLoadOptions {
  switch (view) {
    case "home":
      return { includeSummary: true, includeSettlement: true };
    case "support-page":
      return { includeSummary: true, includeSettlement: false };
    case "advanced":
      return { includeSummary: false, includeSettlement: true };
    case "supporters":
    case "public":
      return { includeSummary: false, includeSettlement: false };
  }
}

export function getMyPageDashboardQueryMode(
  view: WorkspaceView
): MyPageDashboardQueryMode {
  switch (view) {
    case "home":
      return "full";
    case "support-page":
      return "summary";
    case "advanced":
      return "settlement";
    case "supporters":
    case "public":
      return "none";
  }
}

function projectDashboardForLoadOptions(
  dashboard: MyPageProjectDashboard | null,
  options: MyPageDashboardLoadOptions
): MyPageProjectDashboard | null {
  if (!dashboard) return null;

  return {
    projectId: dashboard.projectId,
    summary: options.includeSummary ? dashboard.summary : null,
    settlement: options.includeSettlement ? dashboard.settlement : null,
  };
}

export function projectMyPageDashboardDataForView(
  dashboard: MyPageDashboardData,
  view: WorkspaceView
): MyPageDashboardData {
  const options = getMyPageDashboardLoadOptions(view);

  return {
    me: dashboard.me,
    selectedProjectId: dashboard.selectedProjectId,
    projectsByCurrency: {
      JPYC: projectDashboardForLoadOptions(
        dashboard.projectsByCurrency.JPYC,
        options
      ),
      USDC: projectDashboardForLoadOptions(
        dashboard.projectsByCurrency.USDC,
        options
      ),
    },
  };
}

export function hasProjectSummary(
  dashboard: MyPageProjectDashboard | null
): dashboard is MyPageProjectDashboard & { summary: SummaryViewData } {
  return dashboard !== null && dashboard.summary !== null;
}
