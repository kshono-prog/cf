import type {
  AnnouncementChannel,
  DraftTone,
  SupporterMessagePurpose,
  TranslationLang,
} from "@/components/mypage/aiOfficeTypes";
import type { TaskType } from "@/lib/agentTaskParsers";
import {
  PRODUCT_TIER_ORDER,
  type ProductTier,
} from "@/lib/productTiers";

export type AiOfficeTaskChoice = {
  taskType: TaskType;
  eyebrow: string;
  whenToUse: string;
  tier: ProductTier;
};

export type AiOfficeTaskDraft = {
  taskType: TaskType;
  translationInput: string;
  translationLang: TranslationLang;
  reportingWindowDays: number;
  draftTone: DraftTone;
  announcementChannel: AnnouncementChannel;
  includeMetricsSummary: boolean;
  includeSupportSummary: boolean;
  supporterMessagePurpose: SupporterMessagePurpose;
};

export const AI_OFFICE_TASK_CHOICES: readonly AiOfficeTaskChoice[] = [
  {
    taskType: "MANAGER_NEXT_ACTIONS",
    eyebrow: "Manager",
    whenToUse: "いまの project 状態から次の一手を整理したいとき",
    tier: "MVP",
  },
  {
    taskType: "PROPOSE",
    eyebrow: "次の一手",
    whenToUse: "次に何を投稿・告知・改善するか迷っているとき",
    tier: "MVP",
  },
  {
    taskType: "ANALYZE",
    eyebrow: "振り返り",
    whenToUse: "最近の反応や変化を整理したいとき",
    tier: "MVP",
  },
  {
    taskType: "TRANSLATE",
    eyebrow: "翻訳",
    whenToUse: "既存の文章を別の言語向けに言い換えたいとき",
    tier: "MVP",
  },
  {
    taskType: "WEEKLY_REPORT",
    eyebrow: "週次共有",
    whenToUse: "今週の活動や進捗をまとめたいとき",
    tier: "BETA",
  },
  {
    taskType: "ANNOUNCEMENT_DRAFT",
    eyebrow: "告知",
    whenToUse: "支援者やフォロワー向けの告知文を作りたいとき",
    tier: "BETA",
  },
  {
    taskType: "SUPPORTER_MESSAGE_DRAFT",
    eyebrow: "下書きと承認",
    whenToUse: "お礼や再案内のメッセージを作りたいとき",
    tier: "BETA",
  },
] as const;

export const AI_OFFICE_TASK_TIER_HELPER: Record<ProductTier, string> = {
  MVP: "日々の運営で使う core task",
  BETA: "metrics や拡張下書きを使う実験枠",
};

export function getAiOfficeTaskChoice(
  taskType: TaskType
): AiOfficeTaskChoice | undefined {
  return AI_OFFICE_TASK_CHOICES.find((choice) => choice.taskType === taskType);
}

export function getAiOfficeTaskChoiceGroups(): Array<{
  tier: ProductTier;
  choices: AiOfficeTaskChoice[];
}> {
  return PRODUCT_TIER_ORDER.map((tier) => ({
    tier,
    choices: AI_OFFICE_TASK_CHOICES.filter((choice) => choice.tier === tier),
  })).filter((group) => group.choices.length > 0);
}

export function normalizeAiOfficeTaskDraft(
  draft: AiOfficeTaskDraft
): AiOfficeTaskDraft {
  if (draft.taskType === "WEEKLY_REPORT") {
    return {
      ...draft,
      reportingWindowDays: 7,
    };
  }

  if (draft.taskType === "ANNOUNCEMENT_DRAFT") {
    return {
      ...draft,
      reportingWindowDays: 7,
      announcementChannel: "SUPPORTERS",
      includeMetricsSummary: true,
      includeSupportSummary: true,
    };
  }

  if (draft.taskType === "SUPPORTER_MESSAGE_DRAFT") {
    return {
      ...draft,
      reportingWindowDays: 30,
      includeMetricsSummary: false,
      includeSupportSummary: true,
    };
  }

  return draft;
}

export function validateAiOfficeTaskDraft(
  draft: AiOfficeTaskDraft
): string | null {
  if (draft.taskType === "TRANSLATE" && draft.translationInput.trim().length === 0) {
    return "TRANSLATE タスクには翻訳テキストが必要です。";
  }

  return null;
}

export function buildAiOfficeTaskInput(
  draft: AiOfficeTaskDraft
): Record<string, unknown> {
  const normalizedDraft = normalizeAiOfficeTaskDraft(draft);
  const common = {
    source: "mypage",
    requestedAt: new Date().toISOString(),
  };

  switch (normalizedDraft.taskType) {
    case "TRANSLATE":
      return {
        ...common,
        text: normalizedDraft.translationInput.trim(),
        from: "auto",
        to: [normalizedDraft.translationLang],
      };
    case "WEEKLY_REPORT":
      return {
        ...common,
        reportingWindowDays: normalizedDraft.reportingWindowDays,
      };
    case "ANNOUNCEMENT_DRAFT":
      return {
        ...common,
        channel: normalizedDraft.announcementChannel,
        tone: normalizedDraft.draftTone,
        reportingWindowDays: normalizedDraft.reportingWindowDays,
        includeMetricsSummary: normalizedDraft.includeMetricsSummary,
        includeSupportSummary: normalizedDraft.includeSupportSummary,
      };
    case "SUPPORTER_MESSAGE_DRAFT":
      return {
        ...common,
        purpose: normalizedDraft.supporterMessagePurpose,
        tone: normalizedDraft.draftTone,
        reportingWindowDays: normalizedDraft.reportingWindowDays,
        includeMetricsSummary: normalizedDraft.includeMetricsSummary,
        includeSupportSummary: normalizedDraft.includeSupportSummary,
      };
    default:
      return common;
  }
}
