"use client";

import dynamic from "next/dynamic";

import { CreatorReadyRoutePanel } from "@/components/mypage/CreatorReadyRoutePanel";
import { WorkspaceLoadingCard } from "@/components/mypage/WorkspaceFeedback";
import { useCreatorReadyWorkspaceProjectDashboards } from "@/components/mypage/useCreatorReadyWorkspaceProjectDashboards";

const CreatorAdvancedSettingsSection = dynamic(
  () =>
    import("@/components/mypage/CreatorAdvancedSettingsSection").then(
      (mod) => mod.CreatorAdvancedSettingsSection
    ),
  {
    loading: () => (
      <WorkspaceLoadingCard title="精算と詳細設定を読み込んでいます" />
    ),
  }
);

export function CreatorReadyAdvancedRoute() {
  const { dashboardError, projectDashboardsByCurrency } =
    useCreatorReadyWorkspaceProjectDashboards("advanced");

  return (
    <CreatorReadyRoutePanel
      title="精算・詳細設定"
      description="目標達成後の配分・精算・ガス代支援など、上級者向けの設定をまとめています。"
      error={dashboardError}
    >
      <CreatorAdvancedSettingsSection
        projectDashboardsByCurrency={projectDashboardsByCurrency}
      />
    </CreatorReadyRoutePanel>
  );
}
