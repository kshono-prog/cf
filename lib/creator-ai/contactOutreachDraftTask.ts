import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateJson } from "@/lib/ai";
import { isRecord } from "@/lib/api/guards";

type OutreachTone = "formal" | "professional" | "friendly";

export function parseContactOutreachDraftInput(
  input: Prisma.InputJsonValue
): { contactId?: string; purpose?: string; tone?: OutreachTone } {
  const raw = input as unknown;
  if (!isRecord(raw)) return {};
  const tone =
    raw.tone === "formal" || raw.tone === "professional" || raw.tone === "friendly"
      ? (raw.tone as OutreachTone)
      : undefined;
  return {
    contactId: typeof raw.contactId === "string" ? raw.contactId : undefined,
    purpose: typeof raw.purpose === "string" ? raw.purpose : undefined,
    tone,
  };
}

export async function buildContactOutreachDraftOutput(params: {
  creatorProfileId: bigint;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  const now = new Date();
  const since30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const parsed = parseContactOutreachDraftInput(params.input);
  const { contactId, purpose, tone = "professional" } = parsed;

  const [contact, creator, recentNotes] = await Promise.all([
    contactId
      ? prisma.externalContact.findFirst({
          where: {
            id: contactId,
            creatorProfileId: params.creatorProfileId,
          },
          select: {
            organizationName: true,
            personName: true,
            roleTitle: true,
            contactType: true,
            status: true,
            temperature: true,
            notes: true,
            lastOutcome: true,
          },
        })
      : Promise.resolve(null),
    prisma.creatorProfile.findUnique({
      where: { id: params.creatorProfileId },
      select: {
        displayName: true,
        creatorType: true,
        profileText: true,
      },
    }),
    prisma.managerNote.findMany({
      where: {
        creatorProfileId: params.creatorProfileId,
        ...(contactId ? { externalContactId: contactId } : {}),
        createdAt: { gte: since30Days },
        isArchived: false,
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { title: true, aiSummary: true, noteType: true },
    }),
  ]);

  const contactLabel = contact?.organizationName ?? "相手先";
  const recipientLabel = contact?.personName
    ? `${contact.organizationName} ${contact.personName}${contact.roleTitle ? ` (${contact.roleTitle})` : ""}`
    : contact?.organizationName ?? "相手先";

  const creatorLabel =
    creator?.displayName ?? "クリエイター";
  const outreachPurpose = purpose ?? "ご挨拶・連絡";

  const notesContext = recentNotes
    .map((n) => `- ${n.title ?? ""}${n.aiSummary ? `: ${n.aiSummary}` : ""}`)
    .join("\n");

  // Fallback draft
  const toneInstruction =
    tone === "formal"
      ? "丁寧で格式のある文体"
      : tone === "friendly"
        ? "親しみやすく温かい文体"
        : "プロフェッショナルで誠実な文体";

  const fallbackDraft = `${recipientLabel} 様

はじめてご連絡差し上げます。${creatorLabel}と申します。

このたびは${outreachPurpose}についてご連絡いたしました。

ご都合の良い際にお話しさせていただければ幸いです。
どうぞよろしくお願いいたします。

${creatorLabel}`;

  const fallbackKeyPoints = [
    `${outreachPurpose}の意図を明確に伝える`,
    `${creatorLabel}の活動・実績を簡潔に紹介する`,
    "具体的な次のステップ（日程調整など）を提案する",
  ];

  const aiResult = await generateJson<{
    summary: string;
    draftMessage: string;
    keyPoints: string[];
    followUpSuggestion: string;
  }>(
    `以下の情報をもとに、対外連絡のメッセージ下書きを作成してください。

送信者: ${creatorLabel}${creator?.creatorType ? ` (${creator.creatorType})` : ""}
${creator?.profileText ? `活動内容: ${creator.profileText.slice(0, 200)}` : ""}
宛先: ${recipientLabel}
${contact ? `組織種別: ${contact.contactType}` : ""}
${contact ? `現在のステータス: ${contact.status}` : ""}
連絡目的: ${outreachPurpose}
文体: ${toneInstruction}
${notesContext ? `\n直近のメモ:\n${notesContext}` : ""}

以下のJSON形式のみで返してください:
{"summary":"この連絡の目的を一文で","draftMessage":"実際のメッセージ本文（300文字程度）","keyPoints":["押さえるべきポイント1","ポイント2","ポイント3"],"followUpSuggestion":"返信がない場合のフォローアップ提案"}`,
    {
      systemPrompt:
        "あなたはビジネス文書の作成をサポートするAIアシスタントです。クリエイターの立場で、誠実かつ実用的な日本語の連絡文を作成してください。",
      maxTokens: 768,
      temperature: 0.6,
    }
  );

  return {
    summary: aiResult?.summary ?? `${contactLabel}への${outreachPurpose}の下書きを作成しました。`,
    draftMessage: aiResult?.draftMessage ?? fallbackDraft,
    tone,
    keyPoints: aiResult?.keyPoints?.length ? aiResult.keyPoints : fallbackKeyPoints,
    followUpSuggestion:
      aiResult?.followUpSuggestion ??
      "1週間後に簡潔なフォローアップメッセージを送ることを検討してください。",
    context: {
      contactId: contactId ?? null,
      contactLabel,
      purpose: outreachPurpose,
      recentNoteCount: recentNotes.length,
    },
    basedOn: params.input,
  };
}
