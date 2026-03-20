"use client";

import { CreatorAdvancedSettingsSection } from "@/components/mypage/CreatorAdvancedSettingsSection";
import { CreatorWorkspaceProjectManagementBlocks } from "@/components/mypage/CreatorWorkspaceProjectManagementBlocks";
import type { ProjectDashboardsByCurrency } from "@/lib/mypage/dashboardTypes";

type Props = {
  projectDashboardsByCurrency: ProjectDashboardsByCurrency;
};

export function CreatorSettingsProjectSection(props: Props) {
  return (
    <details
      id="advanced-settings"
      className="surface-card px-5 py-4 sm:px-6"
      open={false}
    >
      <summary className="cursor-pointer list-none text-lg font-semibold text-[var(--text)]">
        詳細設定（上級者向け）
      </summary>
      <p className="mt-2 text-sm leading-6 text-[var(--text-subtle)]">
        プロジェクト作成・目標金額の設定・配分管理など、詳しい設定をまとめています。
      </p>
      <div className="mt-4 space-y-4">
        <CreatorWorkspaceProjectManagementBlocks
          projectDashboardsByCurrency={props.projectDashboardsByCurrency}
        />

        <CreatorAdvancedSettingsSection
          projectDashboardsByCurrency={props.projectDashboardsByCurrency}
        />
      </div>
    </details>
  );
}
