"use client";

import {
  useCreatorReadyWorkspace,
  type CreatorReadyWorkspaceShellProps,
} from "@/components/mypage/CreatorReadyWorkspaceContext";
import { CreatorSettingsAiOfficeSection } from "@/components/mypage/CreatorSettingsAiOfficeSection";
import { CreatorSettingsBasicInfoSection } from "@/components/mypage/CreatorSettingsBasicInfoSection";
import { CreatorSettingsHeaderSection } from "@/components/mypage/CreatorSettingsHeaderSection";
import { CreatorProfileSection } from "@/components/mypage/CreatorProfileSection";
import { CreatorSettingsProjectSection } from "@/components/mypage/CreatorSettingsProjectSection";
import { CreatorSettingsSupportSection } from "@/components/mypage/CreatorSettingsSupportSection";
import { CreatorSettingsWalletSection } from "@/components/mypage/CreatorSettingsWalletSection";
import { useCreatorReadyWorkspaceProjectDashboards } from "@/components/mypage/useCreatorReadyWorkspaceProjectDashboards";

type SettingsPageClientProps = Pick<
  CreatorReadyWorkspaceShellProps,
  "workspaceBasePath" | "error"
>;

export function SettingsPageClient(props: SettingsPageClientProps) {
  const workspace = useCreatorReadyWorkspace();
  const { dashboardError, projectDashboardsByCurrency } =
    useCreatorReadyWorkspaceProjectDashboards("home");

  return (
    <div className="space-y-4">
      <CreatorSettingsHeaderSection
        error={props.error}
        dashboardError={dashboardError}
      />

      <CreatorSettingsBasicInfoSection />
      <CreatorSettingsSupportSection
        projectDashboardsByCurrency={projectDashboardsByCurrency}
      />

      <CreatorSettingsWalletSection />

      <CreatorSettingsAiOfficeSection
        workspaceBasePath={props.workspaceBasePath}
      />

      {workspace.editingProfile ? (
        <CreatorProfileSection />
      ) : null}

      <CreatorSettingsProjectSection
        projectDashboardsByCurrency={projectDashboardsByCurrency}
      />
    </div>
  );
}
