export const PRODUCT_TIER_ORDER = ["MVP", "BETA"] as const;

export type ProductTier = (typeof PRODUCT_TIER_ORDER)[number];

export const PRODUCT_TIER_META: Record<
  ProductTier,
  { label: string; description: string }
> = {
  MVP: {
    label: "MVP",
    description: "本命導線として日々使う機能",
  },
  BETA: {
    label: "Beta",
    description: "拡張機能や高リスク設定",
  },
};
