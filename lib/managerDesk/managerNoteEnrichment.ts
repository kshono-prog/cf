import type { ManagerNoteType } from "@prisma/client";

import { generateJson } from "@/lib/ai";

type ManagerNoteEnrichmentInput = {
  title: string;
  body: string;
  noteType: ManagerNoteType;
  projectTitle?: string | null;
  externalContactName?: string | null;
  externalContactNextAction?: string | null;
  meetingTitle?: string | null;
  meetingNextActionsSummary?: string | null;
};

type ManagerNoteEnrichmentResult = {
  aiSummary: string;
  aiTags: string[];
  followUpNeeded: boolean;
  followUpDueAt: Date | null;
  urgencyScore: number | null;
};

type ManagerNoteAiResponse = {
  summary?: unknown;
  tags?: unknown;
  followUpNeeded?: unknown;
  followUpDueAt?: unknown;
  urgencyScore?: unknown;
};

const FOLLOW_UP_KEYWORDS = [
  "要確認",
  "確認",
  "再連絡",
  "返信待ち",
  "フォロー",
  "次回",
  "宿題",
  "連絡",
  "送付",
  "共有",
  "依頼",
  "日程",
  "会議",
  "期限",
  "対応",
];

const TAG_KEYWORDS: Array<{ tag: string; patterns: string[] }> = [
  { tag: "会場", patterns: ["会場", "下見", "搬入", "音響"] },
  { tag: "営業", patterns: ["営業", "提案", "商談"] },
  { tag: "交渉", patterns: ["交渉", "条件", "見積"] },
  { tag: "リスク", patterns: ["リスク", "懸念", "注意"] },
  { tag: "進行", patterns: ["進行", "段取り", "当日"] },
  { tag: "返信待ち", patterns: ["返信待ち", "返事待ち"] },
  { tag: "要確認", patterns: ["要確認", "確認"] },
  { tag: "日程", patterns: ["日程", "スケジュール", "会議"] },
  { tag: "クリエイター状況", patterns: ["体調", "状況", "負荷", "コンディション"] },
];

function truncateSentence(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const sentenceEnd = normalized.search(/[。.!?！？]/);
  if (sentenceEnd >= 0 && sentenceEnd + 1 <= maxLength) {
    return normalized.slice(0, sentenceEnd + 1);
  }

  return `${normalized.slice(0, maxLength).trim()}…`;
}

function pushUnique(values: string[], value: string): void {
  if (value.length === 0) return;
  if (values.includes(value)) return;
  values.push(value);
}

function noteTypeLabel(noteType: ManagerNoteType): string {
  switch (noteType) {
    case "VENUE_SCOUT":
      return "会場下見";
    case "SALES_MEETING":
      return "営業面談";
    case "NEGOTIATION":
      return "交渉";
    case "CREATOR_STATUS":
      return "Creator状況";
    case "EVENT_OPERATION":
      return "当日運営";
    case "RISK":
      return "リスク";
    case "FOLLOW_UP":
      return "フォローアップ";
    default:
      return "一般";
  }
}

function buildFallbackTags(input: ManagerNoteEnrichmentInput): string[] {
  const combinedText = `${input.title} ${input.body}`;
  const tags: string[] = [];

  pushUnique(tags, noteTypeLabel(input.noteType));

  for (const candidate of TAG_KEYWORDS) {
    if (candidate.patterns.some((pattern) => combinedText.includes(pattern))) {
      pushUnique(tags, candidate.tag);
    }
  }

  if (input.externalContactName) {
    pushUnique(tags, "対外先");
  }
  if (input.meetingTitle) {
    pushUnique(tags, "会議");
  }
  if (input.projectTitle) {
    pushUnique(tags, "Project");
  }

  return tags.slice(0, 5);
}

function buildFallbackSummary(input: ManagerNoteEnrichmentInput): string {
  const contexts = [
    input.projectTitle ? `Project: ${input.projectTitle}` : null,
    input.externalContactName ? `対外先: ${input.externalContactName}` : null,
    input.meetingTitle ? `会議: ${input.meetingTitle}` : null,
  ].filter((value): value is string => value !== null);

  const prefix = contexts.length > 0 ? `${contexts.join(" / ")}。` : "";
  return `${prefix}${truncateSentence(input.body, 90)}`;
}

function inferFallbackFollowUpNeeded(input: ManagerNoteEnrichmentInput): boolean {
  if (input.noteType === "FOLLOW_UP" || input.noteType === "RISK") return true;
  const combinedText = `${input.title} ${input.body}`;
  return FOLLOW_UP_KEYWORDS.some((keyword) => combinedText.includes(keyword));
}

function inferFallbackUrgencyScore(
  input: ManagerNoteEnrichmentInput
): number | null {
  const combinedText = `${input.title} ${input.body}`;
  if (combinedText.includes("至急") || combinedText.includes("緊急")) return 5;
  if (input.noteType === "RISK") return 4;
  if (
    input.noteType === "NEGOTIATION" ||
    input.noteType === "EVENT_OPERATION" ||
    input.noteType === "FOLLOW_UP"
  ) {
    return 3;
  }
  if (input.noteType === "CREATOR_STATUS") return 2;
  return null;
}

function toOptionalStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const tags = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return tags.length > 0 ? tags.slice(0, 5) : null;
}

function toOptionalDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function toOptionalUrgencyScore(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const truncated = Math.trunc(value);
  if (truncated < 1 || truncated > 5) return null;
  return truncated;
}

export async function enrichManagerNote(
  input: ManagerNoteEnrichmentInput
): Promise<ManagerNoteEnrichmentResult> {
  const fallback: ManagerNoteEnrichmentResult = {
    aiSummary: buildFallbackSummary(input),
    aiTags: buildFallbackTags(input),
    followUpNeeded: inferFallbackFollowUpNeeded(input),
    followUpDueAt: null,
    urgencyScore: inferFallbackUrgencyScore(input),
  };

  const aiResult = await generateJson<ManagerNoteAiResponse>(
    `あなたはクリエイター運営の内勤補助です。Manager Note を短く要約し、follow-up 補助情報を抽出してください。
今日は 2026-03-26、タイムゾーンは Asia/Tokyo です。

noteType: ${input.noteType}
title: ${input.title}
body: ${input.body}
projectTitle: ${input.projectTitle ?? "なし"}
externalContactName: ${input.externalContactName ?? "なし"}
externalContactNextAction: ${input.externalContactNextAction ?? "なし"}
meetingTitle: ${input.meetingTitle ?? "なし"}
meetingNextActionsSummary: ${input.meetingNextActionsSummary ?? "なし"}

ルール:
- summary は 1-2 文の日本語で、実務に使える短い要約にする
- tags は短い日本語ラベルを最大5個
- followUpNeeded は、次の確認や行動が必要なら true
- followUpDueAt は本文や文脈から明確に読める場合だけ ISO 8601 で返す。曖昧なら null
- urgencyScore は 1-5。緊急でなければ null でもよい
- 推測しすぎない

以下の JSON だけを返してください:
{"summary":"要約","tags":["タグ1"],"followUpNeeded":true,"followUpDueAt":null,"urgencyScore":3}`,
    {
      systemPrompt:
        "あなたは Creator Founding の AI Office です。短く、具体的で、現場の実務に使える日本語で返してください。",
      maxTokens: 320,
      temperature: 0.2,
    }
  );

  const aiSummary =
    typeof aiResult?.summary === "string" && aiResult.summary.trim().length > 0
      ? aiResult.summary.trim()
      : fallback.aiSummary;
  const aiTags = toOptionalStringArray(aiResult?.tags) ?? fallback.aiTags;
  const followUpNeeded =
    typeof aiResult?.followUpNeeded === "boolean"
      ? aiResult.followUpNeeded
      : fallback.followUpNeeded;
  const followUpDueAt = toOptionalDate(aiResult?.followUpDueAt) ?? fallback.followUpDueAt;
  const urgencyScore =
    toOptionalUrgencyScore(aiResult?.urgencyScore) ?? fallback.urgencyScore;

  return {
    aiSummary,
    aiTags,
    followUpNeeded,
    followUpDueAt,
    urgencyScore,
  };
}
