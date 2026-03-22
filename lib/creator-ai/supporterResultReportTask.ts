import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateJson } from "@/lib/ai";

export async function buildSupporterResultReportOutput(params: {
  creatorProfileId: bigint;
  projectId: bigint | null;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  if (!params.projectId) {
    return {
      summary:
        "プロジェクトが指定されていないため、支援結果レポートを生成できませんでした。",
      basedOn: params.input,
    };
  }

  const [project, goal, purposes, contributionsByPurpose] = await Promise.all([
    prisma.project.findUnique({
      where: { id: params.projectId },
      select: { title: true, currency: true },
    }),
    prisma.goal.findFirst({
      where: { projectId: params.projectId },
      select: { targetAmount: true, achievedAt: true },
    }),
    prisma.purpose.findMany({
      where: { projectId: params.projectId },
      select: { id: true, label: true },
      orderBy: { orderIndex: "asc" },
    }),
    prisma.contribution.groupBy({
      by: ["purposeId"],
      where: {
        projectId: params.projectId,
        status: "CONFIRMED",
      },
      _count: { _all: true },
      _sum: { amountDecimal: true },
    }),
  ]);

  const [distributionRunCount, activityPostCount] = await Promise.all([
    prisma.distributionRun.count({
      where: { projectId: params.projectId },
    }),
    goal?.achievedAt
      ? prisma.post.count({
          where: {
            creatorProfileId: params.creatorProfileId,
            createdAt: { gte: goal.achievedAt },
          },
        })
      : Promise.resolve(0),
  ]);

  const currency = project?.currency ?? "JPYC";
  const goalLabel = project?.title ?? "このプロジェクト";
  const achievedAt = goal?.achievedAt?.toISOString() ?? null;

  const purposeMap = new Map(purposes.map((p) => [p.id, p.label]));

  const purposeBreakdown: Array<{
    purposeLabel: string;
    confirmedAmount: number;
    contributionCount: number;
  }> = [];

  let totalAmount = 0;

  for (const c of contributionsByPurpose) {
    const amount = c._sum.amountDecimal ? Number(c._sum.amountDecimal) : 0;
    totalAmount += amount;
    if (c.purposeId === null) {
      if (amount > 0 || c._count._all > 0) {
        purposeBreakdown.push({
          purposeLabel: "用途未割当て",
          confirmedAmount: amount,
          contributionCount: c._count._all,
        });
      }
    } else {
      purposeBreakdown.push({
        purposeLabel: purposeMap.get(c.purposeId) ?? "その他",
        confirmedAmount: amount,
        contributionCount: c._count._all,
      });
    }
  }

  purposeBreakdown.sort((a, b) => b.confirmedAmount - a.confirmedAmount);

  const distributionNote =
    distributionRunCount > 0
      ? `${distributionRunCount.toString()}回の配分が実行されました。`
      : "配分はまだ実行されていません。";

  const activityAfterNote = achievedAt
    ? activityPostCount > 0
      ? `目標達成後に${activityPostCount.toString()}件の投稿がありました。`
      : "目標達成後の投稿はまだありません。"
    : "目標はまだ達成されていません。";

  const fallbackSummary = achievedAt
    ? `「${goalLabel}」への支援結果をまとめました。合計${totalAmount.toLocaleString()} ${currency} が集まり${
        purposeBreakdown.length > 0
          ? `、${purposeBreakdown.length.toString()}つの用途に活用されました。`
          : "ました。"
      }`
    : `「${goalLabel}」はまだ達成されていません。現時点での支援状況をまとめました。`;

  // AI enhancement: generate a warmer, more human summary
  const purposeLabels = purposeBreakdown
    .slice(0, 3)
    .map((p) => `${p.purposeLabel}(${p.confirmedAmount.toLocaleString()} ${currency})`)
    .join("、");

  const aiResult = await generateJson<{ summary: string }>(
    `クリエイターの支援結果レポートのサマリー文を書いてください。
プロジェクト名: ${goalLabel}
達成状況: ${achievedAt ? `達成済み（${new Date(achievedAt).toLocaleDateString("ja-JP")}）` : "未達成"}
合計支援金額: ${totalAmount.toLocaleString()} ${currency}
支援の使われ方: ${purposeLabels || "未分類"}
${distributionNote} ${activityAfterNote}

支援者への感謝と活動の成果が伝わる温かい文章を1〜2文で書いてください。
以下のJSON形式のみで返してください:
{"summary":"サマリー文"}`,
    {
      systemPrompt:
        "あなたはクリエイター支援プラットフォームのライターです。支援者が貢献を実感できる温かい日本語で書いてください。",
      maxTokens: 256,
      temperature: 0.8,
    }
  );

  return {
    summary: aiResult?.summary ?? fallbackSummary,
    goalLabel,
    achievedAt,
    currency,
    purposeBreakdown,
    totalAmount,
    distributionNote,
    activityAfterNote,
    basedOn: params.input,
  };
}
