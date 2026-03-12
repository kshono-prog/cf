"use client";

import React from "react";

import { AiOfficeManagementSection } from "@/components/mypage/AiOfficeManagementSection";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";

export function CreatorReadySupportersRoute() {
  const workspace = useCreatorReadyWorkspace();

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <div className="text-sm font-semibold text-gray-900">下書きと承認</div>
        <div className="mt-1 text-xs leading-5 text-gray-600">
          告知やお礼の下書き作成、承認待ちの確認、指標の取り込みを行います。
        </div>
      </div>
      <AiOfficeManagementSection
        walletAddress={workspace.address ?? null}
        projectId={workspace.localProjectId}
        isConnected={workspace.isConnected}
      />
    </div>
  );
}
