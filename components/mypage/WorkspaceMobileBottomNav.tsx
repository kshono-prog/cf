"use client";

import React from "react";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";

// ── アイコン ────────────────────────────────────────────────

function IconToday() {
  return (
    <svg viewBox="0 0 20 20" className="ws-bn-icon" fill="none" aria-hidden="true">
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
    <svg viewBox="0 0 20 20" className="ws-bn-icon" fill="none" aria-hidden="true">
      <path d="M3 14l4-4 3 3 4-5 3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="3" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconComposeFab() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ width: 22, height: 22 }}>
      <path d="M10 4H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14.5 2.5l3 3-7 7H7.5v-3l7-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function IconAi() {
  return (
    <svg viewBox="0 0 20 20" className="ws-bn-icon" fill="none" aria-hidden="true">
      <path d="M10 3a7 7 0 1 1 0 14A7 7 0 0 1 10 3z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.5 10.5c.5 1.2 1.5 2 2.5 2s2-.8 2.5-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7.5" cy="8.5" r="0.75" fill="currentColor" />
      <circle cx="12.5" cy="8.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

function IconManage() {
  return (
    <svg viewBox="0 0 20 20" className="ws-bn-icon" fill="none" aria-hidden="true">
      <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 17c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── コンポーネント ─────────────────────────────────────────

type NavEntry = {
  id: WorkspaceView;
  label: string;
  icon: React.ReactNode;
};

const NAV_ENTRIES: NavEntry[] = [
  { id: "daily-work", label: "今日",       icon: <IconToday /> },
  { id: "project",    label: "プロジェクト", icon: <IconProject /> },
  { id: "ai-office",  label: "AI",          icon: <IconAi /> },
  { id: "manage",     label: "管理",        icon: <IconManage /> },
];

type Props = {
  activeView: WorkspaceView;
  onNavigateToView: (view: WorkspaceView) => void;
  onOpenPostingComposer: () => void;
};

export function WorkspaceMobileBottomNav({
  activeView,
  onNavigateToView,
  onOpenPostingComposer,
}: Props) {
  // 5項目: 今日 / プロジェクト / [FAB] / AI / 管理
  const left  = NAV_ENTRIES.slice(0, 2);
  const right = NAV_ENTRIES.slice(2);

  const isActive = (id: WorkspaceView) =>
    activeView === id || (activeView === "settings" && id === "manage");

  return (
    <nav className="ws-bottom-nav" aria-label="メインナビゲーション">
      {left.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className={`ws-bn-item${isActive(entry.id) ? " active" : ""}`}
          onClick={() => onNavigateToView(entry.id)}
          aria-label={entry.label}
          aria-current={isActive(entry.id) ? "page" : undefined}
        >
          {entry.icon}
          <span>{entry.label}</span>
        </button>
      ))}

      {/* FAB — 投稿する */}
      <button
        type="button"
        className="ws-bn-fab"
        onClick={onOpenPostingComposer}
        aria-label="投稿する"
      >
        <IconComposeFab />
      </button>

      {right.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className={`ws-bn-item${isActive(entry.id) ? " active" : ""}`}
          onClick={() => onNavigateToView(entry.id)}
          aria-label={entry.label}
          aria-current={isActive(entry.id) ? "page" : undefined}
        >
          {entry.icon}
          <span>{entry.label}</span>
        </button>
      ))}
    </nav>
  );
}
