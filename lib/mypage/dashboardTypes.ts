import type { SummaryViewData, CurrencyCode } from "@/lib/mypage/accountPageTypes";
import type { MeStatus } from "@/lib/mypage/types";
import type { ProjectSettlementData } from "@/lib/projectSettlementView";

export type MyPageProjectDashboard = {
  projectId: string;
  summary: SummaryViewData;
  settlement: ProjectSettlementData | null;
};

export type MyPageDashboardData = {
  me: MeStatus;
  selectedProjectId: string | null;
  projectsByCurrency: Record<CurrencyCode, MyPageProjectDashboard | null>;
};
