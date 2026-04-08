import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/AppHeader";
import { PublicBottomNavLoader } from "@/components/layout/PublicBottomNavLoader";

type Props = {
  username: string;
  children: ReactNode;
  /** コンテンツ最大幅。デフォルト 1040px */
  maxWidth?: string;
  /**
   * true にすると水平パディング・maxWidth ラッパーを省略し、
   * AppHeader の高さ分だけ pt を付ける。
   * WorkspaceXLayout などフルブリードレイアウトに使う。
   */
  fullBleed?: boolean;
};

/**
 * 公開ページ共通シェル。
 * AppHeader (fixed) + スクロール領域 + BottomNav を提供する。
 * mypage ワークスペースは独自レイアウトを持つため、このコンポーネントを使わない。
 */
export function PublicPageShell({
  username,
  children,
  maxWidth = "1040px",
  fullBleed = false,
}: Props) {
  return (
    <>
      <AppHeader username={username} avatarUrl={null} />
      {fullBleed ? (
        <div className="pt-[60px] sm:pt-[66px]">{children}</div>
      ) : (
        <div className="px-3 pb-20 pt-[60px] sm:px-6 sm:pt-[66px] md:pb-10">
          <div className="mx-auto w-full" style={{ maxWidth }}>{children}</div>
        </div>
      )}
      {fullBleed ? (
        <div className="md:hidden">
          <PublicBottomNavLoader username={username} />
        </div>
      ) : (
        <PublicBottomNavLoader username={username} />
      )}
    </>
  );
}
