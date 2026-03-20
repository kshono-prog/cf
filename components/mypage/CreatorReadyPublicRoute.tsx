"use client";

import { CreatorPublicLinkSection } from "@/components/mypage/CreatorPublicLinkSection";
import { CreatorReadyRoutePanel } from "@/components/mypage/CreatorReadyRoutePanel";
import { PublicReadinessPanel } from "@/components/mypage/PublicReadinessPanel";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { useCreatorReadyPublicWorkspaceData } from "@/components/mypage/useCreatorReadyPublicWorkspaceData";
import { withBaseUrl } from "@/utils/baseUrl";

export function CreatorReadyPublicRoute() {
  const workspace = useCreatorReadyWorkspace();
  const { dashboardError, publicReadiness } =
    useCreatorReadyPublicWorkspaceData("public");
  const publicProfileUrl = withBaseUrl(workspace.meCreatorUsername);
  const publicEventsUrl = withBaseUrl(`${workspace.meCreatorUsername}/events`);

  return (
    <CreatorReadyRoutePanel
      title="公開ページの確認"
      description="支援者から見える URL と公開状態を確認します。"
      error={dashboardError}
    >
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
    </CreatorReadyRoutePanel>
  );
}
