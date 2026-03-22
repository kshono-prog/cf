// lib/creator-ai/growthOpportunityAlertTask.ts
// GROWTH_OPPORTUNITY_ALERT executor
// Analyzes the last 7 days of ContentMetricSnapshot data and surfaces
// actionable growth opportunities with week-over-week comparison.

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateJson } from "@/lib/ai";

export type GrowthOpportunity = {
  type: "platform_growth" | "timing" | "engagement_boost" | "content_gap";
  title: string;
  insight: string;
  action: string;
  priority: "high" | "medium" | "low";
};

function toSafeInt(v: number | null | undefined): number {
  if (typeof v !== "number") return 0;
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.trunc(v));
}

type PlatformStat = { views: number; interactions: number; count: number };

function aggregateByPlatform(
  rows: Array<{
    platform: string;
    views: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
  }>
): Map<string, PlatformStat> {
  const map = new Map<string, PlatformStat>();
  for (const row of rows) {
    const v = toSafeInt(row.views);
    const i =
      toSafeInt(row.likes) +
      toSafeInt(row.comments) +
      toSafeInt(row.shares);
    const cur = map.get(row.platform) ?? { views: 0, interactions: 0, count: 0 };
    cur.views += v;
    cur.interactions += i;
    cur.count += 1;
    map.set(row.platform, cur);
  }
  return map;
}

export async function buildGrowthOpportunityAlertOutput(params: {
  creatorProfileId: bigint;
  projectId: bigint | null;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  const now = Date.now();
  const since7 = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const since14 = new Date(now - 14 * 24 * 60 * 60 * 1000);

  const snapshotWhere = {
    creatorProfileId: params.creatorProfileId,
    ...(params.projectId ? { projectId: params.projectId } : {}),
  };

  const [recent, previous] = await Promise.all([
    prisma.contentMetricSnapshot.findMany({
      where: { ...snapshotWhere, capturedAt: { gte: since7 } },
      select: {
        platform: true,
        views: true,
        likes: true,
        comments: true,
        shares: true,
        capturedAt: true,
      },
      orderBy: { capturedAt: "desc" },
      take: 50,
    }),
    prisma.contentMetricSnapshot.findMany({
      where: { ...snapshotWhere, capturedAt: { gte: since14, lt: since7 } },
      select: { platform: true, views: true, likes: true, comments: true, shares: true },
      orderBy: { capturedAt: "desc" },
      take: 50,
    }),
  ]);

  if (recent.length === 0) {
    return {
      summary:
        "直近7日の指標データがありません。投稿セクションで指標を記録すると成長機会の分析が可能になります。",
      opportunities: [],
      metricsContext: { snapshotCount: 0, windowDays: 7 },
      basedOn: params.input,
    };
  }

  const recentByPlatform = aggregateByPlatform(recent);
  const prevByPlatform = aggregateByPlatform(previous);

  let totalViews = 0;
  let totalInteractions = 0;
  for (const s of recentByPlatform.values()) {
    totalViews += s.views;
    totalInteractions += s.interactions;
  }
  const engagementRate = totalViews > 0 ? totalInteractions / totalViews : 0;

  const ranked = Array.from(recentByPlatform.entries())
    .map(([platform, s]) => ({
      platform,
      views: s.views,
      interactions: s.interactions,
      rate: s.views > 0 ? s.interactions / s.views : 0,
      count: s.count,
    }))
    .sort((a, b) => b.rate - a.rate);

  const topPlatform = ranked[0] ?? null;

  // Week-over-week: platforms whose interaction rate grew ≥ 15%
  const growingPlatforms: string[] = [];
  for (const [platform, cur] of recentByPlatform.entries()) {
    const prev = prevByPlatform.get(platform);
    if (!prev || prev.views === 0) continue;
    const curRate = cur.views > 0 ? cur.interactions / cur.views : 0;
    const prevRate = prev.views > 0 ? prev.interactions / prev.views : 0;
    if (curRate > prevRate * 1.15) growingPlatforms.push(platform);
  }

  // Rule-based fallback opportunities
  const fallback: GrowthOpportunity[] = [];

  if (growingPlatforms.length > 0) {
    fallback.push({
      type: "platform_growth",
      title: `${growingPlatforms.join("・")} で反応率が上昇中`,
      insight: `直近7日で反応率が前週比15%以上増加しています。`,
      action: `${growingPlatforms[0]} での投稿を優先し、反応の良い形式を繰り返しましょう。`,
      priority: "high",
    });
  }

  if (topPlatform && !growingPlatforms.includes(topPlatform.platform)) {
    fallback.push({
      type: "platform_growth",
      title: `${topPlatform.platform} が最も反応率が高い`,
      insight: `反応率 ${(topPlatform.rate * 100).toFixed(2)}% でトップです。`,
      action: `${topPlatform.platform} への投稿を週1〜2件増やしてみましょう。`,
      priority: "medium",
    });
  }

  if (engagementRate < 0.03 && totalViews > 50) {
    fallback.push({
      type: "engagement_boost",
      title: "エンゲージメント率の改善余地があります",
      insight: `平均反応率 ${(engagementRate * 100).toFixed(2)}% は改善できます。`,
      action: "投稿末尾にひとつ質問を加えてコメントを促しましょう。",
      priority: "medium",
    });
  }

  if (fallback.length === 0) {
    fallback.push({
      type: "content_gap",
      title: "定期投稿でデータを積み上げましょう",
      insight: `直近7日のデータは ${recent.length.toString()} 件。継続が分析精度を上げます。`,
      action: "週2件以上の投稿ペースを維持して指標データを充実させましょう。",
      priority: "low",
    });
  }

  // AI enhancement
  const platformSummary = ranked
    .slice(0, 3)
    .map((r) => `${r.platform}(反応率${(r.rate * 100).toFixed(1)}%)`)
    .join(", ");

  const aiResult = await generateJson<{ opportunities: GrowthOpportunity[] }>(
    `クリエイターの直近7日間の活動指標を分析してください。
総再生/表示: ${totalViews.toLocaleString()} / 総反応: ${totalInteractions.toLocaleString()} / 反応率: ${(engagementRate * 100).toFixed(2)}%
プラットフォーム別: ${platformSummary || "なし"}
成長中のプラットフォーム: ${growingPlatforms.join("、") || "なし"}

今すぐ実行できる成長機会を3つ提案してください。以下のJSON形式のみで返してください:
{"opportunities":[{"type":"platform_growth","title":"タイトル（20文字以内）","insight":"データに基づく洞察（50文字以内）","action":"今日できる具体的なアクション（50文字以内）","priority":"high"},{"type":"engagement_boost","title":"...","insight":"...","action":"...","priority":"medium"},{"type":"content_gap","title":"...","insight":"...","action":"...","priority":"low"}]}`,
    {
      systemPrompt:
        "あなたはクリエイターのコンテンツ戦略アナリストです。データに基づいた具体的で実行可能な提案を日本語で返してください。",
      maxTokens: 600,
      temperature: 0.7,
    }
  );

  const opportunities =
    aiResult?.opportunities?.length ? aiResult.opportunities.slice(0, 5) : fallback;

  const highCount = opportunities.filter((o) => o.priority === "high").length;
  const summary =
    highCount > 0
      ? `直近7日の指標から ${highCount.toString()}件 の高優先度な成長機会を検出しました。`
      : `直近7日の指標から ${opportunities.length.toString()}件 の成長機会を整理しました。`;

  return {
    summary,
    opportunities,
    metricsContext: {
      totalViews,
      totalInteractions,
      engagementRate,
      topPlatform: topPlatform?.platform ?? null,
      snapshotCount: recent.length,
      windowDays: 7,
    },
    basedOn: params.input,
  };
}
