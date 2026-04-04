"use client";

import Link from "next/link";

import {
  CREATOR_READY_WORKSPACE_VIEWS,
} from "@/components/mypage/creatorReadyWorkspaceConfig";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { NotificationBell } from "@/components/mypage/NotificationBell";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";

// ── Tab icons ──────────────────────────────────────────────────────────────

function IconToday() {
  return (
    <svg viewBox="0 0 20 20" className="nav-tab-icon" fill="none" aria-hidden="true">
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
    <svg viewBox="0 0 20 20" className="nav-tab-icon" fill="none" aria-hidden="true">
      <path d="M3 14l4-4 3 3 4-5 3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="3" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconAi() {
  return (
    <svg viewBox="0 0 20 20" className="nav-tab-icon" fill="none" aria-hidden="true">
      <path d="M10 3a7 7 0 1 1 0 14A7 7 0 0 1 10 3z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.5 10.5c.5 1.2 1.5 2 2.5 2s2-.8 2.5-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7.5" cy="8.5" r="0.75" fill="currentColor" />
      <circle cx="12.5" cy="8.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

function IconFans() {
  return (
    <svg viewBox="0 0 20 20" className="nav-tab-icon" fill="none" aria-hidden="true">
      <path d="M10 5.5c1-2 4-2 4 1 0 2-4 5.5-4 5.5S6 8.5 6 6.5c0-3 3-3 4-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M5 16c0-2 2-3 5-3s5 1 5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconManage() {
  return (
    <svg viewBox="0 0 20 20" className="nav-tab-icon" fill="none" aria-hidden="true">
      <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 17c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function tabIcon(id: WorkspaceView) {
  switch (id) {
    case "daily-work": return <IconToday />;
    case "project":    return <IconProject />;
    case "ai-office":  return <IconAi />;
    case "fans":       return <IconFans />;
    case "manage":     return <IconManage />;
    default:           return null;
  }
}

// ── Component ──────────────────────────────────────────────────────────────

type Props = {
  activeView: WorkspaceView;
  onNavigateToView: (view: WorkspaceView) => void;
  onOpenPostingComposer: () => void;
};

export function CreatorReadyWorkspaceHeader(props: Props) {
  const workspace = useCreatorReadyWorkspace();
  const publicPageHref = `/${workspace.meCreatorUsername}`;

  const displayTabs = CREATOR_READY_WORKSPACE_VIEWS.filter(
    (v) => v.id !== "settings"
  );

  return (
    <div className="flex flex-col gap-0 -mx-3 sm:-mx-4">
      {/* ── トップバー ── */}
      <div className="flex items-center justify-between gap-3 px-3 sm:px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base font-semibold truncate">
            {workspace.displayName || workspace.meCreatorUsername}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <NotificationBell />
          <Link
            href="/manager-desk"
            className="hidden sm:inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-subtle)] hover:text-[var(--text)] hover:border-[var(--accent-muted)] transition-colors"
          >
            Manager Desk
          </Link>
          <a
            href={publicPageHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-subtle)] hover:text-[var(--text)] hover:border-[var(--accent-muted)] transition-colors"
          >
            公開ページ ↗
          </a>
          <button
            type="button"
            className="btn btn-sm"
            onClick={props.onOpenPostingComposer}
          >
            投稿する
          </button>
        </div>
      </div>

      {/* ── 5タブナビゲーション ── */}
      <div className="nav-tab-bar">
        {displayTabs.map((view) => {
          const isActive =
            props.activeView === view.id ||
            (props.activeView === "settings" && view.id === "manage");
          return (
            <button
              key={view.id}
              type="button"
              className={`nav-tab${isActive ? " nav-tab-active" : ""}`}
              onClick={() => props.onNavigateToView(view.id)}
              aria-label={view.label}
            >
              {tabIcon(view.id)}
              <span className="hidden sm:inline">{view.label}</span>
              <span className="sm:hidden text-[0.6rem] leading-none">{view.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
