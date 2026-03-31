import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateJson } from "@/lib/ai";
import { isRecord } from "@/lib/api/guards";

export function parseOpportunityApplicationDraftInput(
  input: Prisma.InputJsonValue
): { contactId?: string; opportunityDescription?: string; tone?: string } {
  const raw = input as unknown;
  if (!isRecord(raw)) return {};
  return {
    contactId: typeof raw.contactId === "string" ? raw.contactId : undefined,
    opportunityDescription:
      typeof raw.opportunityDescription === "string" ? raw.opportunityDescription : undefined,
    tone: typeof raw.tone === "string" ? raw.tone : undefined,
  };
}

export async function buildOpportunityApplicationDraftOutput(params: {
  creatorProfileId: bigint;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  const since365Days = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const parsed = parseOpportunityApplicationDraftInput(params.input);
  const { contactId, opportunityDescription, tone = "professional" } = parsed;

  const [creator, stageEvidences, revenueAgg, contributionCount, contact] =
    await Promise.all([
      prisma.creatorProfile.findUnique({
        where: { id: params.creatorProfileId },
        select: {
          displayName: true,
          creatorType: true,
          ecosystemRole: true,
          profileText: true,
          externalUrl: true,
        },
      }),
      prisma.stageEvidence.findMany({
        where: {
          creatorProfileId: params.creatorProfileId,
          verifiedAt: { gte: since365Days },
        },
        orderBy: { verifiedAt: "desc" },
        take: 5,
        select: { evidenceType: true, value: true, stageId: true },
      }),
      prisma.revenueRecord.aggregate({
        where: { creatorProfileId: params.creatorProfileId },
        _count: { _all: true },
        _sum: { amountDecimal: true },
      }),
      prisma.contribution.count({
        where: {
          project: { creatorProfileId: params.creatorProfileId },
          status: "CONFIRMED",
        },
      }),
      contactId
        ? prisma.externalContact.findFirst({
            where: { id: contactId, creatorProfileId: params.creatorProfileId },
            select: {
              organizationName: true,
              personName: true,
              contactType: true,
              notes: true,
            },
          })
        : Promise.resolve(null),
    ]);

  const creatorLabel = creator?.displayName ?? "クリエイター";
  const creatorType = creator?.creatorType ?? null;
  const profileSnippet = creator?.profileText?.slice(0, 300) ?? null;
  const totalRevenue = Number(revenueAgg._sum.amountDecimal ?? 0);
  const revenueRecordCount = revenueAgg._count._all;

  const evidenceLines = stageEvidences
    .map((e) => `- [${e.evidenceType}] ${e.value}`)
    .join("\n");

  const opportunityLabel =
    contact?.organizationName ?? opportunityDescription ?? "案件";
  const recipientLabel = contact?.personName
    ? `${contact.organizationName ?? ""} ${contact.personName}`.trim()
    : contact?.organizationName ?? "担当者";

  const toneInstruction =
    tone === "formal"
      ? "丁寧で格式のある文体"
      : tone === "friendly"
        ? "親しみやすく温かい文体"
        : "プロフェッショナルで誠実な文体";

  const fallbackDraft = `${recipientLabel} 様

はじめてご連絡差し上げます。${creatorLabel}と申します。

${opportunityDescription ? `${opportunityDescription}について` : "案件について"}ご連絡いたしました。

これまでの活動実績と今後の展望についてご説明させていただきたく、
ご都合の良い際にお話しの機会をいただけますと幸いです。

どうぞよろしくお願いいたします。

${creatorLabel}`;

  const fallbackStrengths = [
    contributionCount > 0 ? `累計 ${contributionCount} 件の支援実績` : "活動継続中",
    stageEvidences.length > 0 ? `実績エビデンス ${stageEvidences.length} 件あり` : "実績蓄積中",
    profileSnippet ? "活動概要・プロフィール整備済み" : "プロフィール整備中",
  ];

  const aiResult = await generateJson<{
    summary: string;
    draftMessage: string;
    strengths: string[];
    followUpSuggestion: string;
  }>(
    `クリエイターの案件応募・問い合わせ文を作成してください。

## クリエイター情報
名前: ${creatorLabel}
${creatorType ? `活動ジャンル: ${creatorType}` : ""}
${profileSnippet ? `活動概要: ${profileSnippet}` : ""}
累計支援件数: ${contributionCount} 件
${revenueRecordCount > 0 ? `収益実績: ${revenueRecordCount} 件の収益記録（合計 ${Math.round(totalRevenue).toLocaleString()} 円相当）` : ""}

## 実績エビデンス（直近1年）
${evidenceLines || "（記録なし）"}

## 応募先
${contact ? `${contact.organizationName ?? ""}${contact.contactType ? ` (${contact.contactType})` : ""}` : ""}
${opportunityDescription ? `案件内容: ${opportunityDescription}` : ""}
文体: ${toneInstruction}

以下のJSON形式のみで返してください:
{"summary":"この応募の目的を一文で","draftMessage":"応募・問い合わせの本文（400文字程度）","strengths":["アピールポイント1","アピールポイント2","アピールポイント3"],"followUpSuggestion":"返信がない場合のフォローアップ提案"}`,
    {
      systemPrompt:
        "あなたはクリエイターの営業・案件応募を支援するAIアシスタントです。実績を活かした、具体的で誠実な日本語の応募文を作成してください。",
      maxTokens: 800,
      temperature: 0.6,
    }
  ).catch(() => null);

  return {
    summary:
      aiResult?.summary ??
      `${opportunityLabel}への応募文下書きを作成しました。`,
    draftMessage: aiResult?.draftMessage ?? fallbackDraft,
    tone,
    strengths: aiResult?.strengths?.length ? aiResult.strengths : fallbackStrengths,
    followUpSuggestion:
      aiResult?.followUpSuggestion ??
      "1週間後に簡潔なフォローアップメッセージを送ることを検討してください。",
    context: {
      contactId: contactId ?? null,
      opportunityLabel,
      contributionCount,
      evidenceCount: stageEvidences.length,
    },
    basedOn: params.input,
  };
}
