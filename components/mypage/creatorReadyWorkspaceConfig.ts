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
    label: "やること一覧",
    description: "今やることを確認します。",
    tier: "MVP",
  },
  {
    id: "support-page",
    label: "公開ページと投稿",
    description: "公開ページ、支援導線、投稿を整えます。",
    tier: "MVP",
    betaNote: "Event 機能は beta 扱いです。",
  },
  {
    id: "supporters",
    label: "下書きと承認",
    description: "告知やお礼の下書きを進めます。",
    tier: "MVP",
    betaNote: "metrics と拡張下書きは beta 扱いです。",
  },
  {
    id: "public",
    label: "公開ページ確認",
    description: "支援者からの見え方を確認します。",
    tier: "MVP",
  },
  {
    id: "advanced",
    label: "精算と詳細設定",
    description: "精算や上級設定を扱います。",
    tier: "BETA",
    betaNote: "Gas support と高度な bridge / CCTP は beta 扱いです。",
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
