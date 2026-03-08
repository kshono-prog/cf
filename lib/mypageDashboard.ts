import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";
import type { MyPageDashboardData, MyPageProjectDashboard } from "@/lib/mypage/dashboardTypes";
import { getMeStatusByAddress } from "@/lib/mypageMe";
import { getProjectSummaryView } from "@/lib/projectSummary";
import { getProjectSettlementView } from "@/lib/projectSettlementView";

async function loadProjectDashboard(
  projectId: string | null
): Promise<MyPageProjectDashboard | null> {
  if (!projectId) return null;

  const bigintProjectId = BigInt(projectId);
  const [summary, settlement] = await Promise.all([
    getProjectSummaryView(bigintProjectId),
    getProjectSettlementView(bigintProjectId),
  ]);

  if (!summary) return null;

  return {
    projectId,
    summary,
    settlement,
  };
}

export async function getMyPageDashboard(
  address: string
): Promise<MyPageDashboardData> {
  const me = await getMeStatusByAddress(address);

  const projectIdsByCurrency = me.projectIdsByCurrency ?? {
    JPYC: null,
    USDC: null,
  };

  const [jpyc, usdc] = await Promise.all([
    loadProjectDashboard(projectIdsByCurrency.JPYC),
    loadProjectDashboard(projectIdsByCurrency.USDC),
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
