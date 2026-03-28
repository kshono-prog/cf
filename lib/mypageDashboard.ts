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

const globalForMyPageDashboardCache = globalThis as unknown as {
  myPageDashboardCache?: Map<string, MyPageDashboardData>;
};

function getDashboardCache(): Map<string, MyPageDashboardData> {
  if (!globalForMyPageDashboardCache.myPageDashboardCache) {
    globalForMyPageDashboardCache.myPageDashboardCache = new Map();
  }

  return globalForMyPageDashboardCache.myPageDashboardCache;
}

function buildDashboardCacheKey(address: string, view: WorkspaceView): string {
  return `${address.toLowerCase()}::${view}`;
}

async function loadProjectDashboard(
  projectId: string | null,
  options: MyPageDashboardLoadOptions
): Promise<MyPageProjectDashboard | null> {
  if (!projectId) return null;

  const bigintProjectId = BigInt(projectId);
  const summary = options.includeSummary
    ? await getProjectSummaryView(bigintProjectId)
    : null;
  const settlement = options.includeSettlement
    ? await getProjectSettlementView(bigintProjectId)
    : null;

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

  const jpyc = await loadProjectDashboard(projectIdsByCurrency.JPYC, options);
  const usdc = await loadProjectDashboard(projectIdsByCurrency.USDC, options);

  const dashboard: MyPageDashboardData = {
    me,
    selectedProjectId: me.projectId ?? projectIdsByCurrency.JPYC ?? projectIdsByCurrency.USDC,
    projectsByCurrency: {
      JPYC: jpyc,
      USDC: usdc,
    } satisfies Record<CurrencyCode, MyPageProjectDashboard | null>,
  };

  getDashboardCache().set(buildDashboardCacheKey(address, view), dashboard);

  return dashboard;
}

export function getCachedMyPageDashboard(
  address: string,
  view: WorkspaceView
): MyPageDashboardData | null {
  return getDashboardCache().get(buildDashboardCacheKey(address, view)) ?? null;
}
