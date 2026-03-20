"use client";

import dynamic from "next/dynamic";

import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { WorkspaceLoadingCard } from "@/components/mypage/WorkspaceFeedback";

const AiOfficeManagementSection = dynamic(
  () =>
    import("@/components/mypage/AiOfficeManagementSection").then(
      (mod) => mod.AiOfficeManagementSection
    ),
  {
    loading: () => <WorkspaceLoadingCard title="AI機能を読み込んでいます" />,
  }
);

export function CreatorWorkspaceAiOfficePanel() {
  const workspace = useCreatorReadyWorkspace();

  return (
    <AiOfficeManagementSection
      walletAddress={workspace.address ?? null}
      projectId={workspace.localProjectId}
      isConnected={workspace.isConnected}
    />
  );
}
