"use client";

import React from "react";

import { CreatorPublicLinkSection } from "@/components/mypage/CreatorPublicLinkSection";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";

export function CreatorReadyPublicRoute() {
  const workspace = useCreatorReadyWorkspace();

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <div className="text-sm font-semibold text-gray-900">公開ページの確認</div>
        <div className="mt-1 text-xs leading-5 text-gray-600">
          支援者から見える URL と公開状態を確認します。
        </div>
      </div>
      <CreatorPublicLinkSection
        username={workspace.meCreatorUsername}
        localProjectId={workspace.localProjectId}
      />
    </div>
  );
}
