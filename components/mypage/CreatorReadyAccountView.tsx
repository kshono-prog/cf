"use client";

import {
  type CreatorReadyAccountViewProps,
} from "@/components/mypage/CreatorReadyWorkspaceContext";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import { CreatorReadyWorkspaceHeader } from "@/components/mypage/CreatorReadyWorkspaceHeader";
import { CreatorReadyWorkspaceRouteContent } from "@/components/mypage/CreatorReadyWorkspaceRouteContent";
import { useCreatorReadyWorkspaceNavigation } from "@/components/mypage/useCreatorReadyWorkspaceNavigation";

export function CreatorReadyAccountView(props: CreatorReadyAccountViewProps) {
  const promoHeaderColor = props.themeColor || "#005bbb";
  const activeView = props.initialWorkspaceView;
  const {
    navigateToView,
    openPostingComposer,
  } = useCreatorReadyWorkspaceNavigation({
    workspaceBasePath: props.workspaceBasePath,
    activeView,
  });

  return (
    <MyPageShell headerColor={promoHeaderColor}>
      <div className="container-narrow space-y-4">
        <CreatorReadyWorkspaceHeader
          activeView={activeView}
          onNavigateToView={navigateToView}
          onOpenPostingComposer={openPostingComposer}
        />

        {props.error ? (
          <WorkspaceStatusNotice tone="error" title={props.error} />
        ) : null}

        <CreatorReadyWorkspaceRouteContent
          activeView={activeView}
          workspaceBasePath={props.workspaceBasePath}
          error={props.error}
          onNavigateToView={navigateToView}
        />
      </div>
    </MyPageShell>
  );
}
