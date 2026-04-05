"use client";

import React from "react";

type Props = {
  headerColor?: string;
  children: React.ReactNode;
  showPromo?: boolean;
};

/**
 * かつて PromoCreatorFounding + MyPageFooter を表示していたシェル。
 * X スタイルレイアウト移行に伴い、children をそのまま返すパススルーに簡略化。
 * headerColor / showPromo は後方互換のため props として残すが使用しない。
 */
export function MyPageShell({ children }: Props) {
  return <>{children}</>;
}
