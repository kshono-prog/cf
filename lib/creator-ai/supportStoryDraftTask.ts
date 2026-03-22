import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateJson } from "@/lib/ai";

type StorySections = {
  why: string;
  what: string;
  progress: string;
};

export async function buildSupportStoryDraftOutput(params: {
  creatorProfileId: bigint;
  projectId: bigint | null;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  const [creator, project, goal, purposes, contributions] = await Promise.all([
    prisma.creatorProfile.findUnique({
      where: { id: params.creatorProfileId },
      select: {
        displayName: true,
        username: true,
        profileText: true,
        creatorType: true,
      },
    }),
    params.projectId
      ? prisma.project.findUnique({
          where: { id: params.projectId },
          select: {
            title: true,
            description: true,
            currency: true,
            status: true,
          },
        })
      : Promise.resolve(null),
    params.projectId
      ? prisma.goal.findFirst({
          where: { projectId: params.projectId },
          select: {
            targetAmount: true,
            achievedAt: true,
            deadline: true,
          },
        })
      : Promise.resolve(null),
    params.projectId
      ? prisma.purpose.findMany({
          where: { projectId: params.projectId },
          select: { label: true, description: true, targetAmount: true },
          orderBy: { orderIndex: "asc" },
          take: 5,
        })
      : Promise.resolve([]),
    params.projectId
      ? prisma.contribution.aggregate({
          where: {
            projectId: params.projectId,
            status: "CONFIRMED",
          },
          _count: { _all: true },
          _sum: { amountDecimal: true },
        })
      : Promise.resolve(null),
  ]);

  const creatorLabel =
    creator?.displayName || creator?.username || "クリエイター";
  const projectLabel = project?.title || "現在の活動";
  const currency = project?.currency ?? "JPYC";
  const confirmedAmount = contributions?._sum.amountDecimal
    ? Number(contributions._sum.amountDecimal)
    : 0;
  const targetAmount = goal?.targetAmount ?? null;
  const progressPct =
    targetAmount && targetAmount > 0
      ? Math.min(100, Math.floor((confirmedAmount / targetAmount) * 100))
      : null;

  // Why section: 何のために支援を集めるのか
  const purposeLabels = purposes.map((p) => p.label).filter(Boolean);
  const whyFallback =
    purposeLabels.length > 0
      ? `${creatorLabel}は「${projectLabel}」を通じて、${purposeLabels.slice(0, 3).join("・")}のために支援を集めています。`
      : project?.description
        ? `${creatorLabel}は「${projectLabel}」として活動しており、次のステップに向けて支援を集めています。`
        : `${creatorLabel}は「${projectLabel}」を通じて活動を続けるための支援を集めています。`;

  // What section: 支援が実現すること
  const whatFallback =
    targetAmount && targetAmount > 0
      ? `目標の ${targetAmount.toLocaleString()} ${currency} が集まると、活動が次の段階へ進みます。`
      : "支援が集まるごとに、活動の継続と次のステップが可能になります。";

  // Progress section: 現在の状況
  const progressFallback =
    progressPct !== null
      ? `現在 ${progressPct.toString()}%（${confirmedAmount.toLocaleString()} ${currency}）達成しており、あと ${(
          (targetAmount ?? 0) - confirmedAmount
        ).toLocaleString()} ${currency} で目標に到達します。`
      : contributions?._count._all && contributions._count._all > 0
        ? `これまでに ${contributions._count._all.toString()} 名の方が支援してくれています。`
        : "まだ支援を受け付け始めたばかりです。最初の応援が次の歩みを生みます。";

  // Try AI-generated story sections
  const aiPrompt = `クリエイター「${creatorLabel}」のプロジェクト「${projectLabel}」の支援ストーリーを3つのセクションで書いてください。
プロジェクト説明: ${project?.description ?? "なし"}
活動用途: ${purposeLabels.join("、") || "未設定"}
目標金額: ${targetAmount ? `${targetAmount.toLocaleString()} ${currency}` : "未設定"}
現在の達成率: ${progressPct !== null ? `${progressPct.toString()}%` : "未集計"}
支援者数: ${contributions?._count._all ?? 0}名

以下のJSON形式のみで返してください（コードブロック不要）:
{"why":"なぜ支援が必要か（2〜3文）","what":"支援で実現すること（1〜2文）","progress":"現在の進捗（1〜2文）"}`;

  const aiSections = await generateJson<StorySections>(aiPrompt, {
    systemPrompt:
      "あなたはクリエイター支援プラットフォームのコピーライターです。温かみがあり共感を呼ぶ日本語で書いてください。",
    maxTokens: 512,
    temperature: 0.8,
  });

  const whyText = aiSections?.why ?? whyFallback;
  const whatText = aiSections?.what ?? whatFallback;
  const progressText = aiSections?.progress ?? progressFallback;
  const storyText = [whyText, whatText, progressText].join("\n\n");

  return {
    summary: `「${projectLabel}」の支援ストーリーを生成しました。`,
    storyText,
    sections: {
      why: whyText,
      what: whatText,
      progress: progressText,
    },
    context: {
      creatorLabel,
      projectLabel,
      currency,
      confirmedAmount,
      targetAmount,
      progressPct,
      contributionCount: contributions?._count._all ?? 0,
      purposes: purposeLabels,
    },
    basedOn: params.input,
  };
}
