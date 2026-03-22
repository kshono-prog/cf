import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateJson } from "@/lib/ai";

function toSafeInt(v: number | null | undefined): number {
  if (typeof v !== "number") return 0;
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.trunc(v));
}

export async function buildCareerPlanDraftOutput(params: {
  creatorProfileId: bigint;
  projectId: bigint | null;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  const since90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [recentPosts, achievedGoalCount, recentContribution, metricRows] =
    await Promise.all([
      prisma.post.findMany({
        where: {
          creatorProfileId: params.creatorProfileId,
          createdAt: { gte: since90Days },
        },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.goal.count({
        where: {
          project: { creatorProfileId: params.creatorProfileId },
          achievedAt: { not: null },
        },
      }),
      params.projectId
        ? prisma.contribution.aggregate({
            where: {
              projectId: params.projectId,
              status: "CONFIRMED",
              confirmedAt: { gte: since90Days },
            },
            _count: { _all: true },
            _sum: { amountDecimal: true },
          })
        : Promise.resolve(null),
      prisma.contentMetricSnapshot.findMany({
        where: {
          creatorProfileId: params.creatorProfileId,
          capturedAt: { gte: since90Days },
        },
        select: {
          platform: true,
          views: true,
          likes: true,
          comments: true,
          shares: true,
        },
        orderBy: { capturedAt: "desc" },
        take: 50,
      }),
    ]);

  const publishedCount = recentPosts.filter((p) => p.status === "PUBLIC").length;
  const weeklyPostRate =
    publishedCount > 0 ? Math.round((publishedCount / 13) * 10) / 10 : 0;

  const recentContributionCount = recentContribution?._count._all ?? 0;
  const recentContributionTotal = recentContribution?._sum.amountDecimal
    ? Number(recentContribution._sum.amountDecimal)
    : 0;

  let totalViews = 0;
  let totalInteractions = 0;
  const platformMap = new Map<string, { views: number; interactions: number }>();
  for (const row of metricRows) {
    const views = toSafeInt(row.views);
    const interactions =
      toSafeInt(row.likes) + toSafeInt(row.comments) + toSafeInt(row.shares);
    totalViews += views;
    totalInteractions += interactions;
    const curr = platformMap.get(row.platform) ?? { views: 0, interactions: 0 };
    curr.views += views;
    curr.interactions += interactions;
    platformMap.set(row.platform, curr);
  }
  const topPlatform =
    Array.from(platformMap.entries())
      .sort((a, b) => {
        const rateA = a[1].views > 0 ? a[1].interactions / a[1].views : 0;
        const rateB = b[1].views > 0 ? b[1].interactions / b[1].views : 0;
        return rateB - rateA;
      })[0]?.[0] ?? null;

  // Determine current phase
  const currentPhase =
    achievedGoalCount >= 2
      ? "定着期"
      : achievedGoalCount === 1
        ? "成長期"
        : publishedCount >= 10
          ? "活動継続期"
          : "活動初期";

  // Build 3-month milestones
  const milestones3mo: string[] = [];
  if (weeklyPostRate < 1) {
    milestones3mo.push("週1件の定期投稿ペースを確立する");
  } else {
    milestones3mo.push(
      `現在の週${weeklyPostRate.toString()}件ペースを維持しながら質を向上させる`
    );
  }
  if (achievedGoalCount === 0) {
    milestones3mo.push("最初の目標金額を設定して支援者を迎える準備を整える");
  } else {
    milestones3mo.push("次の目標金額を設定して活動の継続性を示す");
  }
  milestones3mo.push(
    topPlatform
      ? `${topPlatform}での反応率を現状から10%以上改善する`
      : "主要プラットフォームを1つに絞って投稿効果を集中させる"
  );

  // Build 6-month milestones
  const milestones6mo: string[] = [
    recentContributionCount > 0
      ? `支援者数を現在の${recentContributionCount.toString()}名から2倍に増やす（90日間ベース）`
      : "初めての支援者を獲得し、継続的な関係を築く",
    achievedGoalCount >= 1
      ? "2件目以上の目標達成で活動継続の実績を積む"
      : "最初の目標達成で活動の信頼性を示す",
    "公開プロフィールの活動実績バッジが2項目以上に達する",
  ];

  // Focus areas
  const focusAreas: string[] = [];
  if (publishedCount < 5) {
    focusAreas.push("まず投稿を増やして活動の存在感を作る");
  }
  if (metricRows.length === 0) {
    focusAreas.push("指標データが少ないため、まず活動量を増やして基準値を作る");
  } else if (totalViews > 0 && totalInteractions / totalViews < 0.05) {
    focusAreas.push("コメント誘導や質問投稿でエンゲージメント率を高める");
  }
  if (achievedGoalCount === 0) {
    focusAreas.push("目標設定と支援導線の整備を優先する");
  }
  if (focusAreas.length === 0) {
    focusAreas.push("安定した投稿ペースを維持しながら支援者との継続的な関係を深める");
  }

  const weeklyPace =
    weeklyPostRate >= 2
      ? "週2件以上の投稿ペースを維持できています。次は質の向上と告知の強化に注力しましょう。"
      : weeklyPostRate >= 1
        ? "週1件ペースが定着しています。支援者への告知と活動報告を合わせて発信しましょう。"
        : "まず週1件の投稿を習慣化することが最優先です。短くても継続することが重要です。";

  const fallbackSummary = `現在の活動状況（${currentPhase}）をもとに、3ヶ月・6ヶ月の成長戦略をまとめました。`;

  // AI enhancement: generate better milestone text
  const aiResult = await generateJson<{
    summary: string;
    milestones_3mo: string[];
    milestones_6mo: string[];
    focusAreas: string[];
    weeklyPace: string;
  }>(
    `クリエイターの活動フェーズ「${currentPhase}」をもとに3ヶ月・6ヶ月の成長計画を作成してください。
過去90日の公開投稿数: ${publishedCount.toString()}件（週${weeklyPostRate.toString()}件ペース）
達成済みゴール数: ${achievedGoalCount.toString()}件
直近90日の支援者数: ${recentContributionCount.toString()}名
トッププラットフォーム: ${topPlatform ?? "未計測"}

クリエイターが実際に実行できる具体的なマイルストーンを提案してください。
以下のJSON形式のみで返してください:
{"summary":"現在フェーズとプランの概要（1文）","milestones_3mo":["3ヶ月目標1","3ヶ月目標2","3ヶ月目標3"],"milestones_6mo":["6ヶ月目標1","6ヶ月目標2","6ヶ月目標3"],"focusAreas":["注力領域1","注力領域2"],"weeklyPace":"週次ペースへのアドバイス（1〜2文）"}`,
    {
      systemPrompt:
        "あなたはクリエイターのキャリア戦略アドバイザーです。実践的で具体的な日本語で計画を立ててください。",
      maxTokens: 600,
      temperature: 0.7,
    }
  );

  return {
    summary: aiResult?.summary ?? fallbackSummary,
    currentPhase,
    milestones_3mo: aiResult?.milestones_3mo?.length ? aiResult.milestones_3mo : milestones3mo,
    milestones_6mo: aiResult?.milestones_6mo?.length ? aiResult.milestones_6mo : milestones6mo,
    focusAreas: aiResult?.focusAreas?.length ? aiResult.focusAreas : focusAreas,
    weeklyPace: aiResult?.weeklyPace ?? weeklyPace,
    context: {
      publishedPostCount90Days: publishedCount,
      weeklyPostRate,
      achievedGoalCount,
      recentContributionCount,
      recentContributionTotal,
      totalViews,
      totalInteractions,
      topPlatform,
    },
    basedOn: params.input,
  };
}
