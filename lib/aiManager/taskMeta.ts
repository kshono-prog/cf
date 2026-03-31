/**
 * UX-1: AIマネージャー Top3 タスク — 型定義とカテゴリメタデータ
 */

export type AiManagerTaskEstimate = 2 | 5 | 10;
export type AiManagerTaskDifficulty = 1 | 2 | 3;
export type AiManagerTaskCategory = "growth" | "trust" | "revenue" | "relationship";
export type AiManagerTaskActionKind = "settings" | "href" | "inline";
export type AiManagerInlinePanelKind = "profile-edit" | "posting-draft";

export type AiManagerTop3Task = {
  id: string;
  title: string;
  /** なぜ今やるか */
  purpose: string;
  estimatedMinutes: AiManagerTaskEstimate;
  difficulty: AiManagerTaskDifficulty;
  category: AiManagerTaskCategory;
  /** 完了後の効果テキスト */
  outcomeLabel: string;
  actionKind: AiManagerTaskActionKind;
  actionLabel: string;
  href?: string;
  /** inline アクション時のパネル種別 */
  inlinePanelKind?: AiManagerInlinePanelKind;
  /** 完了後フィードバック */
  completionFeedback?: {
    message: string;
    growthLabel: string;
  };
};

export const CATEGORY_LABELS: Record<AiManagerTaskCategory, string> = {
  growth: "成長",
  trust: "信頼",
  revenue: "収益",
  relationship: "関係性",
};

export const CATEGORY_COLORS: Record<AiManagerTaskCategory, string> = {
  growth: "text-emerald-700 bg-emerald-50 border-emerald-200",
  trust: "text-blue-700 bg-blue-50 border-blue-200",
  revenue: "text-amber-700 bg-amber-50 border-amber-200",
  relationship: "text-violet-700 bg-violet-50 border-violet-200",
};

export function difficultyStars(difficulty: AiManagerTaskDifficulty): string {
  return "★".repeat(difficulty) + "☆".repeat(3 - difficulty);
}
