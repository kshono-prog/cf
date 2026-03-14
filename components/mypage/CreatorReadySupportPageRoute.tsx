"use client";

import React from "react";

import { PublicReadinessPanel } from "@/components/mypage/PublicReadinessPanel";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { CreatorProjectManagementSection } from "@/components/mypage/CreatorProjectManagementSection";
import { MyPageAccordion } from "@/components/mypage/MyPageAccordion";
import { SnsAiOfficeSection } from "@/components/mypage/SnsAiOfficeSection";
import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import { buildPublicReadiness } from "@/lib/mypage/publicReadiness";
import { useCreatorReadyProjectDashboards } from "@/components/mypage/useCreatorReadyProjectDashboards";
import type { SnsProjectOption } from "@/lib/mypage/snsApi";

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
  const projectOptions = React.useMemo(() => {
    const options: SnsProjectOption[] = [];
    const seenProjectIds = new Set<string>();

    for (const currency of ["JPYC", "USDC"] as const) {
      const dashboard = projectDashboardsByCurrency[currency];
      const summaryProject = dashboard?.summary?.project ?? null;
      const projectId =
        summaryProject?.id ?? workspace.projectIdsByCurrency[currency];

      if (!projectId || seenProjectIds.has(projectId)) continue;
      seenProjectIds.add(projectId);

      options.push({
        id: projectId,
        currency,
        title: summaryProject?.title ?? `${currency} project`,
        status: summaryProject?.status ?? "ACTIVE",
        label: `${currency} / ${summaryProject?.title ?? `${currency} project`}`,
      });
    }

    return options;
  }, [projectDashboardsByCurrency, workspace.projectIdsByCurrency]);

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <div className="text-sm font-semibold text-gray-900">
          公開ページと投稿の設定
        </div>
        <div className="mt-1 text-xs leading-5 text-gray-600">
          プロフィール、project、goal、投稿導線を整えて、公開ページの土台を更新します。
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
        externalUrl={workspace.externalUrl}
        themeColorValue={workspace.themeColorValue}
        creatorType={workspace.creatorType}
        socials={workspace.socials}
        youtubeVideos={workspace.youtubeVideos}
        avatarFile={workspace.avatarFile}
        avatarPreview={workspace.avatarPreview}
        setDisplayName={workspace.setDisplayName}
        setProfile={workspace.setProfile}
        setExternalUrl={workspace.setExternalUrl}
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
      <div id="sns-compose">
        <MyPageAccordion
          open={workspace.openSections}
          onToggle={workspace.onToggleSection}
          sectionKey="sns"
          title="SNS・AI事務所"
        >
          <SnsAiOfficeSection
            address={workspace.address}
            username={workspace.meCreatorUsername}
            projectOptions={projectOptions}
          />
        </MyPageAccordion>
      </div>
    </div>
  );
}
