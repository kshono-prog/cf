import type { WorkspaceView } from "@/lib/mypage/workspaceView";

export const CREATOR_READY_WORKSPACE_VIEWS: Array<{
  id: WorkspaceView;
  label: string;
  description: string;
}> = [
  {
    id: "home",
    label: "やること一覧",
    description: "今やることを確認します。",
  },
  {
    id: "support-page",
    label: "公開ページと投稿",
    description: "公開ページ、支援導線、投稿を整えます。",
  },
  {
    id: "supporters",
    label: "下書きと承認",
    description: "告知やお礼の下書きを進めます。",
  },
  {
    id: "public",
    label: "公開ページ確認",
    description: "支援者からの見え方を確認します。",
  },
  {
    id: "advanced",
    label: "精算と詳細設定",
    description: "精算や上級設定を扱います。",
  },
];
