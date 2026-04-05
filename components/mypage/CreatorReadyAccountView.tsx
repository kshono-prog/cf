"use client";

import { type CreatorReadyAccountViewProps } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { WorkspaceXLayout } from "@/components/layout/WorkspaceXLayout";
import { WorkspaceSidebar } from "@/components/layout/WorkspaceSidebar";
import { WorkspaceRightPanel } from "@/components/layout/WorkspaceRightPanel";
import { WorkspaceRightPanelContent } from "@/components/mypage/WorkspaceRightPanelContent";
import { WorkspaceMobileBottomNav } from "@/components/mypage/WorkspaceMobileBottomNav";
import { CreatorReadyWorkspaceHeader } from "@/components/mypage/CreatorReadyWorkspaceHeader";
import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import { CreatorReadyWorkspaceRouteContent } from "@/components/mypage/CreatorReadyWorkspaceRouteContent";
import { useCreatorReadyWorkspaceNavigation } from "@/components/mypage/useCreatorReadyWorkspaceNavigation";

export function CreatorReadyAccountView(props: CreatorReadyAccountViewProps) {
  const activeView = props.initialWorkspaceView;
  const { navigateToView, openPostingComposer } =
    useCreatorReadyWorkspaceNavigation({
      workspaceBasePath: props.workspaceBasePath,
      activeView,
    });

  return (
    <WorkspaceXLayout
      sidebar={
        <WorkspaceSidebar
          activeView={activeView}
          onNavigateToView={navigateToView}
          onOpenPostingComposer={openPostingComposer}
        />
      }
      rightPanel={
        <WorkspaceRightPanel>
          <WorkspaceRightPanelContent
            workspaceBasePath={props.workspaceBasePath}
            onNavigateToView={navigateToView}
          />
        </WorkspaceRightPanel>
      }
    >
      {/* モバイル用スリムトップバー */}
      <CreatorReadyWorkspaceHeader
        activeView={activeView}
        onNavigateToView={navigateToView}
        onOpenPostingComposer={openPostingComposer}
      />

      {/* エラー・通知 */}
      {props.error ? (
        <div className="px-4 pt-3">
          <WorkspaceStatusNotice
            tone="error"
            title={props.error}
            description={props.errorDescription ?? undefined}
          />
        </div>
      ) : null}
      {props.notice ? (
        <div className="px-4 pt-3">
          <WorkspaceStatusNotice
            tone={props.notice.tone}
            title={props.notice.title}
            description={props.notice.description}
          />
        </div>
      ) : null}

      {/* メインコンテンツ */}
      <div className="px-4 py-4 space-y-4 sm:px-5">
        <CreatorReadyWorkspaceRouteContent
          activeView={activeView}
          workspaceBasePath={props.workspaceBasePath}
          error={props.error}
          onNavigateToView={navigateToView}
        />
      </div>

      {/* モバイルボトムナビ */}
      <WorkspaceMobileBottomNav
        activeView={activeView}
        onNavigateToView={navigateToView}
        onOpenPostingComposer={openPostingComposer}
      />
    </WorkspaceXLayout>
  );
}
