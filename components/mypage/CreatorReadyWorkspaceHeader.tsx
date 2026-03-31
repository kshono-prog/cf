"use client";

import Link from "next/link";

import {
  CREATOR_READY_WORKSPACE_VIEWS,
  getCreatorReadyWorkspaceConfig,
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
  const activeViewConfig = getCreatorReadyWorkspaceConfig(props.activeView);
  const secondaryActionClassName =
    "inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900";

  return (
    <div className="flex flex-col gap-4 pb-1">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-1">
          <h1 className="text-lg font-semibold">
            {workspace.displayName || workspace.meCreatorUsername} のワークスペース
          </h1>
          {activeViewConfig ? (
            <p className="text-sm text-[var(--text-subtle)]">
              {activeViewConfig.description}
            </p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[22rem] sm:items-start lg:items-end">
          <div className="flex flex-wrap items-center gap-2 sm:justify-start lg:justify-end">
            <NotificationBell />
            <Link href="/manager-desk" className={secondaryActionClassName}>
              Manager Desk
            </Link>
            <a
              href={publicPageHref}
              target="_blank"
              rel="noopener noreferrer"
              className={secondaryActionClassName}
            >
              ファン目線を確認 ↗
            </a>
          </div>
          <button
            type="button"
            className="inline-flex min-h-10 w-full items-center justify-center self-stretch rounded-full border border-slate-900 bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:w-auto sm:self-auto lg:self-end"
            onClick={props.onOpenPostingComposer}
          >
            投稿する
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="workspace-segment flex-1 overflow-x-auto">
          {CREATOR_READY_WORKSPACE_VIEWS.filter((v) => v.id !== "settings").map((view) => (
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
        <button
          type="button"
          className={`shrink-0 text-xs transition-colors ${
            props.activeView === "settings"
              ? "font-semibold text-[var(--text)]"
              : "text-[var(--text-subtle)] hover:text-[var(--text)]"
          }`}
          onClick={() => props.onNavigateToView("settings")}
        >
          詳細設定
        </button>
      </div>
    </div>
  );
}
