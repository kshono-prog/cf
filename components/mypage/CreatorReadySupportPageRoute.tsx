"use client";

import dynamic from "next/dynamic";

import { CreatorReadyPostingSection } from "@/components/mypage/CreatorReadyPostingSection";
import { CreatorReadyRoutePanel } from "@/components/mypage/CreatorReadyRoutePanel";
import { PublicReadinessPanel } from "@/components/mypage/PublicReadinessPanel";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import {
  WorkspaceLoadingCard,
} from "@/components/mypage/WorkspaceFeedback";
import { useCreatorReadyPublicWorkspaceData } from "@/components/mypage/useCreatorReadyPublicWorkspaceData";

const CreatorProjectManagementSection = dynamic(
  () =>
    import("@/components/mypage/CreatorProjectManagementSection").then(
      (mod) => mod.CreatorProjectManagementSection
    ),
  {
    loading: () => (
      <WorkspaceLoadingCard title="プロフィールと支援設定を読み込んでいます" />
    ),
  }
);

export function CreatorReadySupportPageRoute() {
  const workspace = useCreatorReadyWorkspace();
  const {
    dashboardError,
    projectDashboardsByCurrency,
    publicReadiness,
    postingProjectOptions,
  } = useCreatorReadyPublicWorkspaceData("support-page");

  return (
    <CreatorReadyRoutePanel
      title="公開ページ・プロフィール設定"
      description="プロフィール・目標金額・外部リンクを整えて、支援者に伝わる公開ページを作ります。"
      error={dashboardError}
    >
      <PublicReadinessPanel
        title="公開ページの準備状況"
        description="未設定の項目を上から順に埋めると、支援者に伝わりやすい公開ページになります。"
        readiness={publicReadiness}
        actions={[
          {
            label: workspace.editingProfile
              ? "下のフォームを編集する"
              : "プロフィール編集を開く",
            onClick: workspace.onStartEditProfile,
            tone: "primary",
          },
        ]}
      />
      <CreatorProjectManagementSection
        projectDashboardsByCurrency={projectDashboardsByCurrency}
      />
      <CreatorReadyPostingSection projectOptions={postingProjectOptions} />
    </CreatorReadyRoutePanel>
  );
}
