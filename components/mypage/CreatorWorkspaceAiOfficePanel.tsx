"use client";

import { AiOfficeManagementSection } from "@/components/mypage/AiOfficeManagementSection";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";

export function CreatorWorkspaceAiOfficePanel() {
  const workspace = useCreatorReadyWorkspace();

  return (
    <AiOfficeManagementSection
      walletAddress={workspace.address ?? null}
      projectId={workspace.localProjectId}
      isConnected={workspace.isConnected}
      initialUrlState={workspace.initialAiOfficeUrlState}
    />
  );
}
