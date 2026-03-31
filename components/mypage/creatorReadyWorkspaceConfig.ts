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
    description: "AIマネージャーと今日の優先タスクを確認し、その場で完了します。",
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
