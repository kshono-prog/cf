"use client";

import dynamic from "next/dynamic";

import {
  useCreatorReadyWorkspace,
  type CreatorReadyWorkspaceShellProps,
} from "@/components/mypage/CreatorReadyWorkspaceContext";
import { CreatorReadyPostingSection } from "@/components/mypage/CreatorReadyPostingSection";
import { CreatorSettingsBasicInfoSection } from "@/components/mypage/CreatorSettingsBasicInfoSection";
import { CreatorSettingsHeaderSection } from "@/components/mypage/CreatorSettingsHeaderSection";
import { CreatorSettingsSupportSection } from "@/components/mypage/CreatorSettingsSupportSection";
import { CreatorSettingsWalletSection } from "@/components/mypage/CreatorSettingsWalletSection";
import { CreatorWorkspaceProjectManagementBlocks } from "@/components/mypage/CreatorWorkspaceProjectManagementBlocks";
import { PublicReadinessPanel } from "@/components/mypage/PublicReadinessPanel";
import { WorkspaceLoadingCard } from "@/components/mypage/WorkspaceFeedback";
import { useCreatorReadyPublicWorkspaceData } from "@/components/mypage/useCreatorReadyPublicWorkspaceData";
import { withBaseUrl } from "@/utils/baseUrl";

const CreatorAdvancedSettingsSection = dynamic(
  () =>
    import("@/components/mypage/CreatorAdvancedSettingsSection").then(
      (mod) => mod.CreatorAdvancedSettingsSection
    ),
  {
    loading: () => (
      <WorkspaceLoadingCard title="精算・詳細設定を読み込んでいます" />
    ),
  }
);

type SettingsPageClientProps = Pick<
  CreatorReadyWorkspaceShellProps,
  "workspaceBasePath" | "error"
>;

export function SettingsPageClient(props: SettingsPageClientProps) {
  const workspace = useCreatorReadyWorkspace();
  const {
    dashboardError,
    projectDashboardsByCurrency,
    publicReadiness,
    postingProjectOptions,
  } = useCreatorReadyPublicWorkspaceData("settings");

  const publicProfileUrl = withBaseUrl(workspace.meCreatorUsername);

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

      <CreatorWorkspaceProjectManagementBlocks
        projectDashboardsByCurrency={projectDashboardsByCurrency}
      />

      <PublicReadinessPanel
        title="公開ページの準備状況"
        description="未設定の項目を埋めると、支援者に伝わりやすいページになります。"
        readiness={publicReadiness}
        actions={[
          {
            label: "ファン目線で確認する ↗",
            href: publicProfileUrl,
            tone: "primary",
          },
        ]}
      />

      <CreatorSettingsWalletSection />

      <CreatorReadyPostingSection projectOptions={postingProjectOptions} />

      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <span className="text-sm font-semibold text-[var(--text)]">精算</span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            試験中
          </span>
        </div>
        <CreatorAdvancedSettingsSection
          projectDashboardsByCurrency={projectDashboardsByCurrency}
        />
      </section>
    </div>
  );
}
