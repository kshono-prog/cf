// app/[username]/mypage/layout.tsx
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/**
 * Mypage ワークスペースレイアウト。
 * - AppHeader なし（WorkspaceSidebar が代替ナビを担う）
 * - 幅制限なし（WorkspaceXLayout が全幅を管理する）
 * - 親 [username]/layout.tsx の providers（AppKit / ThemeProvider）を継承
 */
export default function MypageLayout({ children }: Props) {
  return <>{children}</>;
}
