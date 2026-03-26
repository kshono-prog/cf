import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateJson } from "@/lib/ai";
import { deriveCreatorStage } from "@/lib/creatorStage";
import type { CreatorActivityCredibility } from "@/lib/creatorActivityCredibility";

type GrowthStep = {
  step: number;
  axis: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
};

const AXIS_LABELS: Record<string, string> = {
  output: "発信力（投稿数）",
  audience: "支援者基盤",
  business: "事業実績（目標達成）",
  continuity: "継続性（活動期間）",
};

const AXIS_GROWTH_ADVICE: Record<string, { title: string; description: string }> = {
  output: {
    title: "投稿ペースを週1件に引き上げる",
    description:
      "発信スコアを高めるには継続的な投稿が有効です。内容は短くてもよいので、週1件の定期発信を習慣にしましょう。",
  },
  audience: {
    title: "支援者との接点を増やす",
    description:
      "支援者数を伸ばすには、公開ページの整備と告知の工夫が効果的です。ファン向けのメッセージや進捗報告を定期的に行いましょう。",
  },
  business: {
    title: "次の目標設定と達成を目指す",
    description:
      "目標達成実績が事業スコアを引き上げます。現在の進捗を確認し、達成可能な目標金額と期日を設定しましょう。",
  },
  continuity: {
    title: "月1件以上の継続投稿を3ヶ月続ける",
    description:
      "継続性スコアは活動期間に連動します。小さくても定期的な活動記録が積み上がると、信頼性の基盤が育ちます。",
  },
};

async function loadCredibility(
  creatorProfileId: bigint
): Promise<CreatorActivityCredibility> {
  const firstPost = await prisma.post.findFirst({
    where: { creatorProfileId, status: "PUBLIC" },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  const [totalPostCount, goalAchievedCount, contributorAggregate, lastPost] =
    await Promise.all([
      prisma.post.count({
        where: { creatorProfileId, status: "PUBLIC" },
      }),
      prisma.goal.count({
        where: { project: { creatorProfileId }, achievedAt: { not: null } },
      }),
      prisma.contribution.groupBy({
        by: ["fromAddress"],
        where: { project: { creatorProfileId }, status: "CONFIRMED" },
        _count: { _all: true },
      }),
      prisma.post.findFirst({
        where: { creatorProfileId, status: "PUBLIC" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

  const now = new Date();
  const activeMonths = firstPost
    ? Math.max(
        1,
        Math.ceil(
          (now.getTime() - firstPost.createdAt.getTime()) /
            (1000 * 60 * 60 * 24 * 30)
        )
      )
    : 0;

  return {
    activeMonths,
    totalPostCount,
    goalAchievedCount,
    totalContributorCount: contributorAggregate.length,
    lastActiveAt: lastPost?.createdAt.toISOString() ?? null,
  };
}

export async function buildStageGrowthPlanOutput(params: {
  creatorProfileId: bigint;
  projectId: bigint | null;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  const credibility = await loadCredibility(params.creatorProfileId);
  const stageResult = deriveCreatorStage(credibility);
  const { maturity } = stageResult;

  // Identify weakest axis
  const axes = ["output", "audience", "business", "continuity"] as const;
  const weakestAxis = axes.reduce((minAxis, axis) =>
    maturity[axis] < maturity[minAxis] ? axis : minAxis
  );

  // Build growth steps focused on weakest axis + one secondary
  const secondaryAxis = axes
    .filter((a) => a !== weakestAxis)
    .reduce((minAxis, axis) =>
      maturity[axis] < maturity[minAxis] ? axis : minAxis
    );

  const steps: GrowthStep[] = [];

  const primaryAdvice = AXIS_GROWTH_ADVICE[weakestAxis];
  steps.push({
    step: 1,
    axis: weakestAxis,
    title: primaryAdvice.title,
    description: primaryAdvice.description,
    priority: "high",
  });

  const secondaryAdvice = AXIS_GROWTH_ADVICE[secondaryAxis];
  steps.push({
    step: 2,
    axis: secondaryAxis,
    title: secondaryAdvice.title,
    description: secondaryAdvice.description,
    priority: "medium",
  });

  // Stage-specific step
  if (stageResult.nextMilestone) {
    steps.push({
      step: 3,
      axis: "stage",
      title: "次のステージに向けた集中ポイント",
      description: stageResult.nextMilestone,
      priority: "medium",
    });
  }

  const weakestLabel = AXIS_LABELS[weakestAxis] ?? weakestAxis;
  const fallbackSummary = `現在のステージ「${stageResult.stageLabel}」において、最も伸びしろがある「${weakestLabel}」を中心に成長ステップを整理しました。`;

  const aiResult = await generateJson<{
    summary: string;
    growthSteps: GrowthStep[];
  }>(
    `クリエイターの成長プランを作成してください。
現在のステージ: ${stageResult.stageLabel}（${stageResult.stageDescription}）
成熟度スコア（0-100）:
- 発信力（投稿数）: ${maturity.output.toString()}
- 支援者基盤: ${maturity.audience.toString()}
- 事業実績（目標達成）: ${maturity.business.toString()}
- 継続性（活動期間）: ${maturity.continuity.toString()}

最も低いスコアの軸: ${weakestLabel}（${maturity[weakestAxis].toString()}点）

このクリエイターが現在のステージから前進するための具体的な成長ステップを3つ提案してください。
特に最も低いスコアの軸を改善するステップを優先してください。

以下のJSON形式のみで返してください:
{"summary":"現状と成長方針の一文","growthSteps":[{"step":1,"axis":"${weakestAxis}","title":"ステップタイトル","description":"具体的な説明（2文以内）","priority":"high"},{"step":2,"axis":"${secondaryAxis}","title":"...","description":"...","priority":"medium"},{"step":3,"axis":"stage","title":"...","description":"...","priority":"medium"}]}`,
    {
      systemPrompt:
        "あなたはクリエイターの成長戦略アドバイザーです。データに基づいた具体的で実行可能なアドバイスを日本語で返してください。",
      maxTokens: 512,
      temperature: 0.7,
    }
  );

  return {
    summary: aiResult?.summary ?? fallbackSummary,
    stage: stageResult.stage,
    stageLabel: stageResult.stageLabel,
    stageDescription: stageResult.stageDescription,
    maturity,
    weakestAxis,
    nextMilestone: stageResult.nextMilestone,
    growthSteps:
      aiResult?.growthSteps?.length ? aiResult.growthSteps : steps,
    context: {
      activeMonths: credibility.activeMonths,
      totalPostCount: credibility.totalPostCount,
      goalAchievedCount: credibility.goalAchievedCount,
      totalContributorCount: credibility.totalContributorCount,
    },
    basedOn: params.input,
  };
}
