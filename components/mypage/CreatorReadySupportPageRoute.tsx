"use client";

import React from "react";

import { PublicReadinessPanel } from "@/components/mypage/PublicReadinessPanel";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { CreatorProjectManagementSection } from "@/components/mypage/CreatorProjectManagementSection";
import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import { buildPublicReadiness } from "@/lib/mypage/publicReadiness";
import { useCreatorReadyProjectDashboards } from "@/components/mypage/useCreatorReadyProjectDashboards";

export function CreatorReadySupportPageRoute() {
  const workspace = useCreatorReadyWorkspace();
  const { dashboardError, projectDashboardsByCurrency } =
    useCreatorReadyProjectDashboards({
      view: "support-page",
      address: workspace.address,
      isConnected: workspace.isConnected,
      projectIdsByCurrency: workspace.projectIdsByCurrency,
    });
  const publicReadiness = React.useMemo(
    () =>
      buildPublicReadiness({
        displayName: workspace.displayName,
        profile: workspace.profile,
        avatarUrl: workspace.avatarUrl,
        creatorType: workspace.creatorType,
        projectDashboardsByCurrency,
      }),
    [
      projectDashboardsByCurrency,
      workspace.avatarUrl,
      workspace.creatorType,
      workspace.displayName,
      workspace.profile,
    ]
  );

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <div className="text-sm font-semibold text-gray-900">
          プロフィールと支援設定
        </div>
        <div className="mt-1 text-xs leading-5 text-gray-600">
          プロフィール、project、goal を整えて、公開ページの土台を更新します。
        </div>
      </div>
      {dashboardError ? (
        <WorkspaceStatusNotice tone="error" title={dashboardError} />
      ) : null}
      <PublicReadinessPanel
        title="公開準備チェック"
        description="未設定の項目を上から埋めると、公開ページの理解しやすさと支援しやすさが上がります。"
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
        meCreatorUsername={workspace.meCreatorUsername}
        eventBaseUrl={workspace.eventBaseUrl}
        editingProfile={workspace.editingProfile}
        onStartEditProfile={workspace.onStartEditProfile}
        onCancelEditProfile={workspace.onCancelEditProfile}
        displayName={workspace.displayName}
        profile={workspace.profile}
        avatarUrl={workspace.avatarUrl}
        themeColorValue={workspace.themeColorValue}
        creatorType={workspace.creatorType}
        socials={workspace.socials}
        youtubeVideos={workspace.youtubeVideos}
        avatarFile={workspace.avatarFile}
        avatarPreview={workspace.avatarPreview}
        setDisplayName={workspace.setDisplayName}
        setProfile={workspace.setProfile}
        setThemeColor={workspace.setThemeColor}
        setCreatorType={workspace.setCreatorType}
        setSocials={workspace.setSocials}
        setYoutubeVideos={workspace.setYoutubeVideos}
        setAvatarFile={workspace.setAvatarFile}
        setAvatarPreview={workspace.setAvatarPreview}
        saving={workspace.saving}
        onSubmitProfile={workspace.onSubmitProfile}
        address={workspace.address}
        isConnected={workspace.isConnected}
        projectIdsByCurrency={workspace.projectIdsByCurrency}
        projectDashboardsByCurrency={projectDashboardsByCurrency}
        onActiveProjectIdChange={workspace.onActiveProjectIdChange}
      />
    </div>
  );
}
