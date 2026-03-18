"use client";

import React from "react";
import dynamic from "next/dynamic";

import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import {
  WorkspaceLoadingCard,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";

const AiOfficeManagementSection = dynamic(
  () =>
    import("@/components/mypage/AiOfficeManagementSection").then(
      (mod) => mod.AiOfficeManagementSection
    ),
  {
    loading: () => (
      <WorkspaceLoadingCard title="AIの提案と確認を読み込んでいます" />
    ),
  }
);

export function CreatorReadySupportersRoute() {
  const workspace = useCreatorReadyWorkspace();

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <div className="text-sm font-semibold text-gray-900">AIの提案と確認</div>
        <div className="mt-1 text-xs leading-5 text-gray-600">
          AIが作成した告知・お礼の下書きを確認して承認または却下できます。
        </div>
      </div>
      <WorkspaceStatusNotice
        tone="info"
        title="承認するまで自動投稿や送金は行われません"
        description="AIが提案した内容を確認してから承認することで、実際の動作に反映されます。まずは承認待ちの提案から確認してください。"
      />
      <AiOfficeManagementSection
        walletAddress={workspace.address ?? null}
        projectId={workspace.localProjectId}
        isConnected={workspace.isConnected}
      />
    </div>
  );
}
