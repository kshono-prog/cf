import type { WorkspaceView } from "@/lib/mypage/workspaceView";

export type CreatorReadyWorkspaceConfig = {
  id: WorkspaceView;
  label: string;
  description: string;
};

export const CREATOR_READY_WORKSPACE_VIEWS: CreatorReadyWorkspaceConfig[] = [
  {
    id: "daily-work",
    label: "ホーム",
    description: "AIアシスタントの受信トレイを確認し、下書きを依頼します。",
  },
  {
    id: "settings",
    label: "設定",
    description: "プロフィール・プロジェクト・ウォレット・精算を管理します。",
  },
];

export function getCreatorReadyWorkspaceConfig(
  view: WorkspaceView
): CreatorReadyWorkspaceConfig | undefined {
  return CREATOR_READY_WORKSPACE_VIEWS.find((entry) => entry.id === view);
}
