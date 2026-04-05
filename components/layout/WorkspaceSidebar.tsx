"use client";

import React from "react";
import Image from "next/image";

import { CREATOR_READY_WORKSPACE_VIEWS } from "@/components/mypage/creatorReadyWorkspaceConfig";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { NotificationBell } from "@/components/mypage/NotificationBell";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";

// ── ナビアイコン ────────────────────────────────────────────

function IconToday() {
  return (
    <svg viewBox="0 0 20 20" className="ws-nav-icon" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="14" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 2v3M13 2v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7" cy="12" r="1" fill="currentColor" />
      <circle cx="10" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function IconProject() {
  return (
    <svg viewBox="0 0 20 20" className="ws-nav-icon" fill="none" aria-hidden="true">
      <path d="M3 14l4-4 3 3 4-5 3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="3" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconAi() {
  return (
    <svg viewBox="0 0 20 20" className="ws-nav-icon" fill="none" aria-hidden="true">
      <path d="M10 3a7 7 0 1 1 0 14A7 7 0 0 1 10 3z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.5 10.5c.5 1.2 1.5 2 2.5 2s2-.8 2.5-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7.5" cy="8.5" r="0.75" fill="currentColor" />
      <circle cx="12.5" cy="8.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

function IconFans() {
  return (
    <svg viewBox="0 0 20 20" className="ws-nav-icon" fill="none" aria-hidden="true">
      <path d="M10 5.5c1-2 4-2 4 1 0 2-4 5.5-4 5.5S6 8.5 6 6.5c0-3 3-3 4-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M5 16c0-2 2-3 5-3s5 1 5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconManage() {
  return (
    <svg viewBox="0 0 20 20" className="ws-nav-icon" fill="none" aria-hidden="true">
      <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 17c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconCompose() {
  return (
    <svg viewBox="0 0 20 20" className="ws-nav-icon" fill="none" aria-hidden="true">
      <path d="M10 4H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14.5 2.5l3 3-7 7H7.5v-3l7-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function navIcon(id: WorkspaceView) {
  switch (id) {
    case "daily-work": return <IconToday />;
    case "project":    return <IconProject />;
    case "ai-office":  return <IconAi />;
    case "fans":       return <IconFans />;
    case "manage":
    case "settings":   return <IconManage />;
    default:           return null;
  }
}

// ── コンポーネント ─────────────────────────────────────────

type Props = {
  activeView: WorkspaceView;
  onNavigateToView: (view: WorkspaceView) => void;
  onOpenPostingComposer: () => void;
};

export function WorkspaceSidebar({
  activeView,
  onNavigateToView,
  onOpenPostingComposer,
}: Props) {
  const workspace = useCreatorReadyWorkspace();
  const publicPageHref = `/${workspace.meCreatorUsername}`;

  const displayTabs = CREATOR_READY_WORKSPACE_VIEWS.filter(
    (v) => v.id !== "settings"
  );

  return (
    <div className="flex flex-col h-full py-3 px-2 gap-1">
      {/* ロゴ */}
      <div className="flex items-center gap-2.5 px-3 py-2 mb-2">
        <div className="ws-logo-mark">C</div>
        <span className="ws-logo-text">Creator Founding</span>
      </div>

      {/* ナビ */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {displayTabs.map((view) => {
          const isActive =
            activeView === view.id ||
            (activeView === "settings" && view.id === "manage");
          return (
            <button
              key={view.id}
              type="button"
              className={`ws-nav-item${isActive ? " active" : ""}`}
              onClick={() => onNavigateToView(view.id)}
              aria-label={view.label}
              aria-current={isActive ? "page" : undefined}
            >
              {navIcon(view.id)}
              <span className="ws-nav-label">{view.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 投稿ボタン */}
      <button
        type="button"
        className="ws-post-btn mt-2"
        onClick={onOpenPostingComposer}
      >
        <IconCompose />
        <span className="ws-post-label">投稿する</span>
      </button>

      {/* 通知 + 公開ページ（デスクトップのみラベル表示） */}
      <div className="flex items-center justify-center gap-2 px-1 mt-2 lg:justify-start lg:px-2">
        <NotificationBell />
        <a
          href={publicPageHref}
          target="_blank"
          rel="noopener noreferrer"
          className="ws-nav-label text-xs text-[var(--text-subtle)] hover:text-[var(--text)] transition-colors whitespace-nowrap"
        >
          公開ページ ↗
        </a>
      </div>

      {/* プロフィール */}
      <div className="flex items-center gap-2.5 px-2 py-2 rounded-full hover:bg-[var(--surface-subtle)] transition-colors cursor-default mt-1">
        {workspace.avatarUrl ? (
          <Image
            src={workspace.avatarUrl}
            alt={`${workspace.meCreatorUsername} のアイコン`}
            width={34}
            height={34}
            className="rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-[34px] h-[34px] rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-sm flex-shrink-0">
            {(workspace.displayName || workspace.meCreatorUsername).slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="hidden lg:flex flex-col min-w-0">
          <span className="block text-sm font-bold truncate leading-tight">
            {workspace.displayName || workspace.meCreatorUsername}
          </span>
          <span className="block text-xs text-[var(--text-subtle)] truncate leading-tight">
            @{workspace.meCreatorUsername}
          </span>
        </div>
      </div>
    </div>
  );
}
