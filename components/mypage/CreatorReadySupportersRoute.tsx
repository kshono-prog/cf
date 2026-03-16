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
      <WorkspaceLoadingCard title="下書きと承認の面を読み込んでいます" />
    ),
  }
);

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
      <WorkspaceStatusNotice
        tone="info"
        title="日常導線を基本にしつつ、metrics と拡張下書きは beta として扱います"
        description="まずは承認待ちと core task を進め、必要なときだけ metrics や拡張ドラフトを使う前提で整理しています。"
      />
      <AiOfficeManagementSection
        walletAddress={workspace.address ?? null}
        projectId={workspace.localProjectId}
        isConnected={workspace.isConnected}
      />
    </div>
  );
}
