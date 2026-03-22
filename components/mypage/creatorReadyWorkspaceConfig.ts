import type { WorkspaceView } from "@/lib/mypage/workspaceView";

export type CreatorReadyWorkspaceConfig = {
  id: WorkspaceView;
  label: string;
  description: string;
};

export const CREATOR_READY_WORKSPACE_VIEWS: CreatorReadyWorkspaceConfig[] = [
  {
    id: "daily-work",
    label: "今日の仕事",
    description: "AI事務所の承認待ちを確認し、AIに依頼します。",
  },
  {
    id: "settings",
    label: "設定・準備",
    description: "プロフィール・プロジェクト・ウォレット・精算を管理します。",
  },
];

export function getCreatorReadyWorkspaceConfig(
  view: WorkspaceView
): CreatorReadyWorkspaceConfig | undefined {
  return CREATOR_READY_WORKSPACE_VIEWS.find((entry) => entry.id === view);
}
