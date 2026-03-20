"use client";

import { CreatorProfileSection } from "@/components/mypage/CreatorProfileSection";
import { CreatorWorkspaceProjectManagementBlocks } from "@/components/mypage/CreatorWorkspaceProjectManagementBlocks";
import type { ProjectDashboardsByCurrency } from "@/lib/mypage/dashboardTypes";

type Props = {
  projectDashboardsByCurrency: ProjectDashboardsByCurrency;
};

export function CreatorProjectManagementSection(props: Props) {
  return (
    <CreatorProfileSection
      extraSections={
        <CreatorWorkspaceProjectManagementBlocks
          projectDashboardsByCurrency={props.projectDashboardsByCurrency}
        />
      }
    />
  );
}
