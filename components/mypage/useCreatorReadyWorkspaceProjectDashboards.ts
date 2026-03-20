"use client";

import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { useCreatorReadyProjectDashboards } from "@/components/mypage/useCreatorReadyProjectDashboards";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";

export function useCreatorReadyWorkspaceProjectDashboards(
  view: WorkspaceView
) {
  const workspace = useCreatorReadyWorkspace();

  return useCreatorReadyProjectDashboards({
    view,
    address: workspace.address,
    isConnected: workspace.isConnected,
    projectIdsByCurrency: workspace.projectIdsByCurrency,
  });
}
