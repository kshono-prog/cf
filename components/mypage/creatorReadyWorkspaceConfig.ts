import type { WorkspaceView } from "@/lib/mypage/workspaceView";

export const CREATOR_READY_WORKSPACE_VIEWS: Array<{
  id: WorkspaceView;
  label: string;
  description: string;
}> = [
  {
    id: "home",
    label: "今週の運営",
    description: "次にやることを決めます。",
  },
  {
    id: "support-page",
    label: "支援ページ",
    description: "公開情報と goal を整えます。",
  },
  {
    id: "supporters",
    label: "支援者対応",
    description: "下書きと承認待ちを扱います。",
  },
  {
    id: "public",
    label: "公開確認",
    description: "支援者からの見え方を確認します。",
  },
  {
    id: "advanced",
    label: "詳細設定",
    description: "高リスク操作を扱います。",
  },
];
