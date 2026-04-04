import type { WorkspaceView } from "@/lib/mypage/workspaceView";

export type CreatorReadyWorkspaceConfig = {
  id: WorkspaceView;
  label: string;
  description: string;
};

export const CREATOR_READY_WORKSPACE_VIEWS: CreatorReadyWorkspaceConfig[] = [
  {
    id: "daily-work",
    label: "今日",
    description: "今日の状況・優先タスク・マネージャーからの連絡を確認します。",
  },
  {
    id: "project",
    label: "プロジェクト",
    description: "Goal・収益・収支・精算など資金まわりをまとめて管理します。",
  },
  {
    id: "ai-office",
    label: "AI",
    description: "AIへの相談・承認待ちタスクの確認・AI利用状況を管理します。",
  },
  {
    id: "fans",
    label: "ファン",
    description: "サポーター・ファンとのエンゲージメントを確認・管理します。",
  },
  {
    id: "manage",
    label: "管理",
    description: "プロフィール・ウォレット・AIマネージャー設定を管理します。",
  },
];

export function getCreatorReadyWorkspaceConfig(
  view: WorkspaceView
): CreatorReadyWorkspaceConfig | undefined {
  return CREATOR_READY_WORKSPACE_VIEWS.find((entry) => entry.id === view);
}
