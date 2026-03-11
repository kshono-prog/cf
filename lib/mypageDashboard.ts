import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";
import type {
  MyPageDashboardData,
  MyPageDashboardLoadOptions,
  MyPageProjectDashboard,
} from "@/lib/mypage/dashboardTypes";
import { getMyPageDashboardLoadOptions } from "@/lib/mypage/dashboardTypes";
import { getMeStatusByAddress } from "@/lib/mypageMe";
import { getProjectSummaryView } from "@/lib/projectSummary";
import { getProjectSettlementView } from "@/lib/projectSettlementView";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";

async function loadProjectDashboard(
  projectId: string | null,
  options: MyPageDashboardLoadOptions
): Promise<MyPageProjectDashboard | null> {
  if (!projectId) return null;

  const bigintProjectId = BigInt(projectId);
  const [summary, settlement] = await Promise.all([
    options.includeSummary
      ? getProjectSummaryView(bigintProjectId)
      : Promise.resolve(null),
    options.includeSettlement
      ? getProjectSettlementView(bigintProjectId)
      : Promise.resolve(null),
  ]);

  if (!summary && !settlement) return null;

  return {
    projectId,
    summary,
    settlement,
  };
}

export async function getMyPageDashboard(
  address: string,
  view: WorkspaceView
): Promise<MyPageDashboardData> {
  const me = await getMeStatusByAddress(address);
  const options = getMyPageDashboardLoadOptions(view);

  const projectIdsByCurrency = me.projectIdsByCurrency ?? {
    JPYC: null,
    USDC: null,
  };

  const [jpyc, usdc] = await Promise.all([
    loadProjectDashboard(projectIdsByCurrency.JPYC, options),
    loadProjectDashboard(projectIdsByCurrency.USDC, options),
  ]);

  return {
    me,
    selectedProjectId: me.projectId ?? projectIdsByCurrency.JPYC ?? projectIdsByCurrency.USDC,
    projectsByCurrency: {
      JPYC: jpyc,
      USDC: usdc,
    } satisfies Record<CurrencyCode, MyPageProjectDashboard | null>,
  };
}
