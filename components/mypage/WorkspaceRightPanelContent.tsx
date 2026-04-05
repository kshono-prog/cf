"use client";

import React from "react";
import Link from "next/link";

import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";

type Props = {
  workspaceBasePath: string;
  onNavigateToView: (view: WorkspaceView) => void;
};

/**
 * 右パネルの中身。
 * WorkspaceContext から取得できる範囲の情報を表示する。
 * より詳細な収益統計は将来的に HomeRoute から context 経由で受け取る拡張を想定。
 */
export function WorkspaceRightPanelContent({
  workspaceBasePath,
  onNavigateToView,
}: Props) {
  const workspace = useCreatorReadyWorkspace();

  const aiOfficeHref = `${workspaceBasePath}/ai-office`;

  return (
    <div>
      {/* プロフィールカード */}
      <div className="ws-right-card">
        <div className="ws-right-card-header">クリエイター</div>
        <div className="p-4 flex items-center gap-3">
          {workspace.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={workspace.avatarUrl}
              alt={`${workspace.meCreatorUsername} のアイコン`}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-base font-bold flex-shrink-0">
              {(workspace.displayName || workspace.meCreatorUsername)
                .slice(0, 1)
                .toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">
              {workspace.displayName || workspace.meCreatorUsername}
            </p>
            <p className="text-xs text-[var(--text-subtle)] truncate">
              @{workspace.meCreatorUsername}
            </p>
          </div>
        </div>
        <div className="px-4 pb-4 flex gap-2">
          <a
            href={`/${workspace.meCreatorUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs font-semibold border border-[var(--line)] rounded-full py-1.5 text-[var(--text-subtle)] hover:text-[var(--text)] hover:border-[var(--accent-muted)] transition-colors"
          >
            公開ページ ↗
          </a>
          <button
            type="button"
            onClick={() => onNavigateToView("manage")}
            className="flex-1 text-center text-xs font-semibold border border-[var(--line)] rounded-full py-1.5 text-[var(--text-subtle)] hover:text-[var(--text)] hover:border-[var(--accent-muted)] transition-colors"
          >
            設定
          </button>
        </div>
      </div>

      {/* クイックナビ */}
      <div className="ws-right-card">
        <div className="ws-right-card-header">クイックアクセス</div>
        <button
          type="button"
          className="ws-right-row w-full text-left"
          onClick={() => onNavigateToView("ai-office")}
        >
          <span className="text-lg">🤖</span>
          <div>
            <p className="text-sm font-semibold">AI オフィス</p>
            <p className="text-xs text-[var(--text-subtle)]">承認待ちタスクを確認</p>
          </div>
        </button>
        <button
          type="button"
          className="ws-right-row w-full text-left"
          onClick={() => onNavigateToView("project")}
        >
          <span className="text-lg">📊</span>
          <div>
            <p className="text-sm font-semibold">プロジェクト</p>
            <p className="text-xs text-[var(--text-subtle)]">収益・Goal を確認</p>
          </div>
        </button>
        <button
          type="button"
          className="ws-right-row w-full text-left"
          onClick={() => onNavigateToView("fans")}
        >
          <span className="text-lg">💙</span>
          <div>
            <p className="text-sm font-semibold">ファン</p>
            <p className="text-xs text-[var(--text-subtle)]">サポーターを確認</p>
          </div>
        </button>
        <Link
          href="/manager-desk"
          className="ws-right-row"
        >
          <span className="text-lg">🖥️</span>
          <div>
            <p className="text-sm font-semibold">Manager Desk</p>
            <p className="text-xs text-[var(--text-subtle)]">上位管理画面</p>
          </div>
        </Link>
      </div>

      {/* AI オフィスへのリンク */}
      {workspace.isConnected ? (
        <div className="ws-right-card">
          <div className="p-4">
            <p className="text-xs text-[var(--text-subtle)] mb-3 leading-relaxed">
              AIマネージャーへの相談や、承認待ちタスクの確認は AI オフィスから行えます。
            </p>
            <a
              href={aiOfficeHref}
              className="btn btn-secondary w-full text-center text-sm"
            >
              AI オフィスを開く
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
