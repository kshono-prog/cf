"use client";

import Link from "next/link";

import {
  CREATOR_READY_WORKSPACE_VIEWS,
} from "@/components/mypage/creatorReadyWorkspaceConfig";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { NotificationBell } from "@/components/mypage/NotificationBell";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";

type Props = {
  activeView: WorkspaceView;
  onNavigateToView: (view: WorkspaceView) => void;
  onOpenPostingComposer: () => void;
};

export function CreatorReadyWorkspaceHeader(props: Props) {
  const workspace = useCreatorReadyWorkspace();
  const publicPageHref = `/${workspace.meCreatorUsername}`;

  return (
    <div className="flex flex-col gap-3 pb-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold">
          {workspace.displayName || workspace.meCreatorUsername} のワークスペース
        </h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <NotificationBell />
          <Link
            href="/manager-desk"
            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 transition hover:border-gray-400"
          >
            Manager Desk
          </Link>
          <a
            href={publicPageHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 transition hover:border-gray-400"
          >
            ファン目線を確認 ↗
          </a>
          <button
            type="button"
            className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            onClick={props.onOpenPostingComposer}
          >
            投稿する
          </button>
        </div>
      </div>

      <div className="workspace-segment">
        {CREATOR_READY_WORKSPACE_VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            className={`workspace-segment-btn${
              props.activeView === view.id ? " workspace-segment-btn-active" : ""
            }`}
            onClick={() => props.onNavigateToView(view.id)}
          >
            {view.label}
          </button>
        ))}
      </div>
    </div>
  );
}
