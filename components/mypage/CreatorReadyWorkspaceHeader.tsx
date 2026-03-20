"use client";

import {
  CREATOR_READY_WORKSPACE_VIEWS,
  type CreatorReadyWorkspaceConfig,
} from "@/components/mypage/creatorReadyWorkspaceConfig";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";

type Props = {
  activeView: WorkspaceView;
  activeWorkspace: CreatorReadyWorkspaceConfig | undefined;
  onOpenPublicPage: () => void;
  onOpenPostingComposer: () => void;
  onNavigateToView: (view: WorkspaceView) => void;
};

export function CreatorReadyWorkspaceHeader(props: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold">
          {props.activeWorkspace?.label ?? "ホーム"}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 transition hover:border-gray-400"
            onClick={props.onOpenPublicPage}
          >
            公開ページを見る
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            onClick={props.onOpenPostingComposer}
          >
            投稿する
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CREATOR_READY_WORKSPACE_VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
              props.activeView === view.id
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:text-gray-900"
            }`}
            onClick={() => props.onNavigateToView(view.id)}
          >
            {view.label}
            {view.tier === "BETA" ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  props.activeView === view.id
                    ? "bg-white/20 text-white"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                試験中
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
