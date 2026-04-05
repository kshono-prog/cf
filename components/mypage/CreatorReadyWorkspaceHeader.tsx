"use client";

import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { NotificationBell } from "@/components/mypage/NotificationBell";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";

type Props = {
  activeView: WorkspaceView;
  onNavigateToView: (view: WorkspaceView) => void;
  onOpenPostingComposer: () => void;
};

/**
 * モバイル専用スリムトップバー。
 * デスクトップ・タブレットでは WorkspaceSidebar がナビを担うため非表示。
 */
export function CreatorReadyWorkspaceHeader({
  onOpenPostingComposer,
}: Props) {
  const workspace = useCreatorReadyWorkspace();

  return (
    /* md 以上では非表示（サイドバーが代替） */
    <div className="md:hidden flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--line)] bg-[var(--surface)] sticky top-0 z-40">
      <span className="text-base font-bold truncate">
        {workspace.displayName || workspace.meCreatorUsername}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <NotificationBell />
        <button
          type="button"
          className="btn btn-sm"
          onClick={onOpenPostingComposer}
        >
          投稿する
        </button>
      </div>
    </div>
  );
}
