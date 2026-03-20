"use client";

import {
  type CreatorReadyAccountViewProps,
} from "@/components/mypage/CreatorReadyWorkspaceContext";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import { CreatorReadyWorkspaceHeader } from "@/components/mypage/CreatorReadyWorkspaceHeader";
import { CreatorReadyWorkspaceRouteContent } from "@/components/mypage/CreatorReadyWorkspaceRouteContent";
import {
  getCreatorReadyWorkspaceConfig,
} from "@/components/mypage/creatorReadyWorkspaceConfig";
import { useCreatorReadyWorkspaceNavigation } from "@/components/mypage/useCreatorReadyWorkspaceNavigation";

export function CreatorReadyAccountView(props: CreatorReadyAccountViewProps) {
  const promoHeaderColor = props.themeColor || "#005bbb";
  const activeView = props.initialWorkspaceView;
  const activeWorkspace = getCreatorReadyWorkspaceConfig(activeView);
  const {
    navigateToView,
    openPublicPage,
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
          activeWorkspace={activeWorkspace}
          onOpenPublicPage={openPublicPage}
          onOpenPostingComposer={openPostingComposer}
          onNavigateToView={navigateToView}
        />

        {props.error ? (
          <WorkspaceStatusNotice tone="error" title={props.error} />
        ) : null}
        {activeWorkspace?.betaNote ? (
          <WorkspaceStatusNotice
            tone={activeWorkspace.tier === "BETA" ? "attention" : "info"}
            title={
              activeWorkspace.tier === "BETA"
                ? "この画面には試験中の機能が含まれます"
                : "この画面には試験提供中の機能が一部含まれます"
            }
            description={activeWorkspace.betaNote}
          />
        ) : null}

        <CreatorReadyWorkspaceRouteContent
          activeView={activeView}
          workspaceBasePath={props.workspaceBasePath}
          onNavigateToView={navigateToView}
        />
      </div>
    </MyPageShell>
  );
}
