"use client";

import React from "react";

import { CreatorReadyWorkspaceOverview } from "@/components/mypage/CreatorReadyWorkspaceOverview";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import { useCreatorReadyProjectDashboards } from "@/components/mypage/useCreatorReadyProjectDashboards";

type Props = {
  onOpenSupportPage: () => void;
  onOpenSupporterResponse: () => void;
  onOpenPublicPage: () => void;
  onOpenAdvancedSettings: () => void;
};

export function CreatorReadyHomeRoute(props: Props) {
  const workspace = useCreatorReadyWorkspace();
  const { dashboardError, projectDashboardsByCurrency } =
    useCreatorReadyProjectDashboards({
      view: "home",
      address: workspace.address,
      isConnected: workspace.isConnected,
      projectIdsByCurrency: workspace.projectIdsByCurrency,
    });

  return (
    <div className="space-y-4">
      {dashboardError ? (
        <WorkspaceStatusNotice tone="error" title={dashboardError} />
      ) : null}
      <CreatorReadyWorkspaceOverview
        username={workspace.meCreatorUsername}
        displayName={workspace.displayName}
        profile={workspace.profile}
        avatarUrl={workspace.avatarUrl}
        creatorType={workspace.creatorType}
        walletAddress={workspace.address?.toLowerCase() ?? null}
        projectId={workspace.localProjectId}
        isConnected={workspace.isConnected}
        projectDashboardsByCurrency={projectDashboardsByCurrency}
        onOpenSupportPage={props.onOpenSupportPage}
        onOpenSupporterResponse={props.onOpenSupporterResponse}
        onOpenPublicPage={props.onOpenPublicPage}
        onOpenAdvancedSettings={props.onOpenAdvancedSettings}
      />
    </div>
  );
}
