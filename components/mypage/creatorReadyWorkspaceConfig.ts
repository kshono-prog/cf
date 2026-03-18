import type { WorkspaceView } from "@/lib/mypage/workspaceView";
import {
  PRODUCT_TIER_ORDER,
  type ProductTier,
} from "@/lib/productTiers";

export type CreatorReadyWorkspaceConfig = {
  id: WorkspaceView;
  label: string;
  description: string;
  tier: ProductTier;
  betaNote?: string;
};

export type CreatorReadyWorkspaceGroup = {
  tier: ProductTier;
  views: CreatorReadyWorkspaceConfig[];
};

export const CREATOR_READY_WORKSPACE_VIEWS: CreatorReadyWorkspaceConfig[] = [
  {
    id: "home",
    label: "ホーム",
    description: "今の状況と次にやることを確認します。",
    tier: "MVP",
  },
  {
    id: "support-page",
    label: "公開ページ・投稿",
    description: "公開ページのプロフィールや支援設定を整えます。",
    tier: "MVP",
    betaNote: "イベント機能は試験提供中です。",
  },
  {
    id: "supporters",
    label: "AIの提案と確認",
    description: "AIが作った下書きや提案を確認・承認します。",
    tier: "MVP",
    betaNote: "分析機能は試験提供中です。",
  },
  {
    id: "public",
    label: "公開ページを見る",
    description: "支援者からの見え方をそのまま確認します。",
    tier: "MVP",
  },
  {
    id: "advanced",
    label: "精算・詳細設定",
    description: "目標達成後の精算や上級設定を扱います。",
    tier: "BETA",
    betaNote: "ブリッジ・送金機能は試験提供中です。",
  },
];

export function getCreatorReadyWorkspaceConfig(
  view: WorkspaceView
): CreatorReadyWorkspaceConfig | undefined {
  return CREATOR_READY_WORKSPACE_VIEWS.find((entry) => entry.id === view);
}

export function getCreatorReadyWorkspaceGroups(): CreatorReadyWorkspaceGroup[] {
  return PRODUCT_TIER_ORDER.map((tier) => ({
    tier,
    views: CREATOR_READY_WORKSPACE_VIEWS.filter((view) => view.tier === tier),
  })).filter((group) => group.views.length > 0);
}
