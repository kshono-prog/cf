"use client";

import React from "react";

import { CreatorAdvancedSettingsSection } from "@/components/mypage/CreatorAdvancedSettingsSection";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import { useCreatorReadyProjectDashboards } from "@/components/mypage/useCreatorReadyProjectDashboards";

export function CreatorReadyAdvancedRoute() {
  const workspace = useCreatorReadyWorkspace();
  const { dashboardError, projectDashboardsByCurrency } =
    useCreatorReadyProjectDashboards({
      view: "advanced",
      address: workspace.address,
      isConnected: workspace.isConnected,
      projectIdsByCurrency: workspace.projectIdsByCurrency,
    });

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <div className="text-sm font-semibold text-gray-900">
          精算と詳細設定
        </div>
        <div className="mt-1 text-xs leading-5 text-gray-600">
          配分、精算、ガス代支援などの高リスク操作をここでまとめて扱います。
        </div>
      </div>
      {dashboardError ? (
        <WorkspaceStatusNotice tone="error" title={dashboardError} />
      ) : null}
      <CreatorAdvancedSettingsSection
        projectIdsByCurrency={workspace.projectIdsByCurrency}
        projectDashboardsByCurrency={projectDashboardsByCurrency}
        walletAddress={workspace.address?.toLowerCase() ?? null}
        isConnected={workspace.isConnected}
      />
    </div>
  );
}
