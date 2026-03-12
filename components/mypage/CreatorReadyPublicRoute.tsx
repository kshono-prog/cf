"use client";

import React from "react";

import { CreatorPublicLinkSection } from "@/components/mypage/CreatorPublicLinkSection";
import { PublicReadinessPanel } from "@/components/mypage/PublicReadinessPanel";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { useCreatorReadyProjectDashboards } from "@/components/mypage/useCreatorReadyProjectDashboards";
import { buildPublicReadiness } from "@/lib/mypage/publicReadiness";
import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import { withBaseUrl } from "@/utils/baseUrl";

export function CreatorReadyPublicRoute() {
  const workspace = useCreatorReadyWorkspace();
  const { dashboardError, projectDashboardsByCurrency } =
    useCreatorReadyProjectDashboards({
      view: "public",
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
        categories: workspace.categories ?? [],
        projectDashboardsByCurrency,
      }),
    [
      projectDashboardsByCurrency,
      workspace.avatarUrl,
      workspace.categories,
      workspace.creatorType,
      workspace.displayName,
      workspace.profile,
    ]
  );
  const publicProfileUrl = withBaseUrl(workspace.meCreatorUsername);
  const publicEventsUrl = withBaseUrl(`${workspace.meCreatorUsername}/events`);

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <div className="text-sm font-semibold text-gray-900">公開ページの確認</div>
        <div className="mt-1 text-xs leading-5 text-gray-600">
          支援者から見える URL と公開状態を確認します。
        </div>
      </div>
      {dashboardError ? (
        <WorkspaceStatusNotice tone="error" title={dashboardError} />
      ) : null}
      <PublicReadinessPanel
        title="公開品質チェック"
        description="公開前に見える情報が揃っているか、支援者目線で確認します。"
        readiness={publicReadiness}
        actions={[
          {
            label: "公開ページを開く",
            href: publicProfileUrl,
            tone: "primary",
          },
          {
            label: "イベント一覧を開く",
            href: publicEventsUrl,
          },
        ]}
      />
      <CreatorPublicLinkSection
        username={workspace.meCreatorUsername}
        localProjectId={workspace.localProjectId}
      />
    </div>
  );
}
