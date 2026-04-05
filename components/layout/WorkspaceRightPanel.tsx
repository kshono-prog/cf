import React from "react";

type Props = {
  children: React.ReactNode;
};

/**
 * 右パネルの薄いラッパー。
 * CSS クラス `.workspace-right` の制御で 1024px 未満では非表示。
 * 中身は children として渡す。
 */
export function WorkspaceRightPanel({ children }: Props) {
  return <>{children}</>;
}
