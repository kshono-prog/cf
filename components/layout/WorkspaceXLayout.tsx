import React from "react";

type Props = {
  sidebar: React.ReactNode;
  rightPanel?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * X (Twitter) スタイルの3カラムレイアウトラッパー。
 * - モバイル (〜767px): フィードのみ / ボトムナビはコンポーネント側で fixed 配置
 * - タブレット (768–1023px): アイコンサイドバー (72px) + フィード
 * - デスクトップ (1024px+): サイドバー (240px) + フィード (max 600px) + 右パネル (320px)
 */
export function WorkspaceXLayout({ sidebar, rightPanel, children }: Props) {
  return (
    <div className="workspace-layout">
      <aside className="workspace-sidebar">{sidebar}</aside>
      <main className="workspace-feed">{children}</main>
      {rightPanel ? (
        <aside className="workspace-right">{rightPanel}</aside>
      ) : null}
    </div>
  );
}
