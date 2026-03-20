"use client";

import { CreatorReadyWorkspaceOverview } from "@/components/mypage/CreatorReadyWorkspaceOverview";
import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import { useCreatorReadyWorkspaceProjectDashboards } from "@/components/mypage/useCreatorReadyWorkspaceProjectDashboards";

type Props = {
  onOpenSupportPage: () => void;
  onOpenSupporterResponse: () => void;
  onOpenPublicPage: () => void;
  onOpenAdvancedSettings: () => void;
};

export function CreatorReadyHomeRoute(props: Props) {
  const { dashboardError, projectDashboardsByCurrency } =
    useCreatorReadyWorkspaceProjectDashboards("home");

  return (
    <div className="space-y-4">
      {dashboardError ? (
        <WorkspaceStatusNotice tone="error" title={dashboardError} />
      ) : null}
      <CreatorReadyWorkspaceOverview
        projectDashboardsByCurrency={projectDashboardsByCurrency}
        onOpenSupportPage={props.onOpenSupportPage}
        onOpenSupporterResponse={props.onOpenSupporterResponse}
        onOpenPublicPage={props.onOpenPublicPage}
        onOpenAdvancedSettings={props.onOpenAdvancedSettings}
      />
    </div>
  );
}
