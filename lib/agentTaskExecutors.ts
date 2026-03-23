import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { isRecord } from "@/lib/api/guards";
import {
  buildCreateAuditMeta,
  buildDecisionAuditMeta,
  getCreateAuditAction,
  AGENT_TASK_AUDIT_ACTION,
} from "@/lib/agentTaskAudit";
import type { TaskType } from "@/lib/agentTaskParsers";
import { isJsonValueForStorage, toTaskType } from "@/lib/agentTaskParsers";
import {
  buildDistributionPlanDraftTaskOutput,
  normalizeDistributionPlanDraftTaskInput,
} from "@/lib/creator-ai/distributionPlanDraftTask";
import {
  buildManagerAgentTaskOutput,
  normalizeManagerAgentTaskInput,
} from "@/lib/creator-ai/managerAgentTask";
import { buildProfileUpdateProposalOutput } from "@/lib/creator-ai/profileUpdateProposalTask";
import { buildDailyActionPlanOutput } from "@/lib/creator-ai/dailyActionPlanTask";
import { buildActivityRestartProposalOutput } from "@/lib/creator-ai/activityRestartProposalTask";
import { buildSupportStoryDraftOutput } from "@/lib/creator-ai/supportStoryDraftTask";
import { buildSupporterResultReportOutput } from "@/lib/creator-ai/supporterResultReportTask";
import { buildCareerPlanDraftOutput } from "@/lib/creator-ai/careerPlanDraftTask";
import { buildGrowthOpportunityAlertOutput } from "@/lib/creator-ai/growthOpportunityAlertTask";
import type { CreatorAiAgentRole } from "@/lib/creator-ai/agentRoleRegistry";
import { getProjectSummaryView } from "@/lib/projectSummary";
import { getProjectSettlementView } from "@/lib/projectSettlementView";
import {
  buildTranslationsOutput,
  parseTranslationTaskInput,
} from "@/lib/translation";
import { generateJson } from "@/lib/ai";

type TaskExecutorParams = {
  creatorProfileId: bigint;
  projectId: bigint | null;
  input: Prisma.InputJsonValue;
};

type TaskExecutor = (
  params: TaskExecutorParams
) => Promise<Prisma.InputJsonValue> | Prisma.InputJsonValue;

type TaskInputValidationResult =
  | { ok: true; value: Prisma.InputJsonValue }
  | { ok: false; error: string };

type TaskOutputSchemaField = {
  type: "string" | "number" | "array" | "object" | "unknown";
  required: boolean;
  description: string;
};

type TaskOutputSchema = {
  kind: TaskType;
  fields: Record<string, TaskOutputSchemaField>;
};

type TaskDefinition = {
  validateInput: (input: unknown) => TaskInputValidationResult;
  outputSchema: TaskOutputSchema;
  execute: TaskExecutor;
};

function buildTranslateOutput(input: Prisma.InputJsonValue): Prisma.InputJsonValue {
  const translateInput = parseTranslationTaskInput(input);
  if (!translateInput) {
    return {
      summary: "翻訳入力が不正です。",
      nextActions: ["text/from/to を確認してください。"],
      basedOn: input,
    };
  }
  return {
    summary: "翻訳案を生成しました。",
    translations: buildTranslationsOutput(translateInput),
    basedOn: input,
  };
}

function buildDefaultProposeLikeOutput(
  input: Prisma.InputJsonValue
): Prisma.InputJsonValue {
  return {
    summary: "次回企画案を3案生成しました。",
    proposals: [
      "短尺動画: 制作の舞台裏を30秒で紹介",
      "配信企画: 視聴者参加型Q&A",
      "告知投稿: 進捗+次回予定の定期フォーマット",
    ],
    basedOn: isJsonValueForStorage(input) ? input : {},
  };
}

function validateGenericJsonInput(input: unknown): TaskInputValidationResult {
  if (input == null) {
    return { ok: true, value: {} as Prisma.InputJsonValue };
  }
  if (!isJsonValueForStorage(input)) {
    return { ok: false, error: "TASK_INPUT_INVALID" };
  }
  return { ok: true, value: input as Prisma.InputJsonValue };
}

function validateTranslateInput(input: unknown): TaskInputValidationResult {
  const parsed = parseTranslationTaskInput(input);
  if (!parsed) {
    return { ok: false, error: "TASK_INPUT_INVALID" };
  }
  return { ok: true, value: parsed as Prisma.InputJsonValue };
}

function validateWeeklyReportInput(input: unknown): TaskInputValidationResult {
  if (input == null) {
    return {
      ok: true,
      value: {
        source: "mypage",
        requestedAt: new Date().toISOString(),
        reportingWindowDays: 7,
      } as Prisma.InputJsonValue,
    };
  }
  if (!isJsonValueForStorage(input) || typeof input !== "object" || input === null) {
    return { ok: false, error: "TASK_INPUT_INVALID" };
  }

  const record = input as Record<string, unknown>;
  const reportingWindowDaysRaw = record.reportingWindowDays;
  const reportingWindowDays =
    typeof reportingWindowDaysRaw === "number" &&
    Number.isFinite(reportingWindowDaysRaw) &&
    reportingWindowDaysRaw > 0 &&
    reportingWindowDaysRaw <= 31
      ? Math.floor(reportingWindowDaysRaw)
      : 7;

  return {
    ok: true,
    value: {
      source: typeof record.source === "string" ? record.source : "mypage",
      requestedAt:
        typeof record.requestedAt === "string"
          ? record.requestedAt
          : new Date().toISOString(),
      reportingWindowDays,
    } as Prisma.InputJsonValue,
  };
}

function validateManagerNextActionsInput(
  input: unknown
): TaskInputValidationResult {
  const normalized = normalizeManagerAgentTaskInput(input);
  if (!normalized) {
    return { ok: false, error: "TASK_INPUT_INVALID" };
  }

  return {
    ok: true,
    value: {
      source: normalized.source,
      requestedAt: normalized.requestedAt,
    },
  };
}

function validateDistributionPlanDraftInput(
  input: unknown
): TaskInputValidationResult {
  const normalized = normalizeDistributionPlanDraftTaskInput(input);
  if (!normalized) {
    return { ok: false, error: "TASK_INPUT_INVALID" };
  }

  return {
    ok: true,
    value: {
      source: normalized.source,
      requestedAt: normalized.requestedAt,
    },
  };
}

function validateAnnouncementDraftInput(input: unknown): TaskInputValidationResult {
  if (input == null) {
    return {
      ok: true,
      value: {
        source: "mypage",
        requestedAt: new Date().toISOString(),
        channel: "SUPPORTERS",
        tone: "warm",
        reportingWindowDays: 7,
        includeMetricsSummary: true,
        includeSupportSummary: true,
      } as Prisma.InputJsonValue,
    };
  }
  if (!isJsonValueForStorage(input) || typeof input !== "object" || input === null) {
    return { ok: false, error: "TASK_INPUT_INVALID" };
  }

  const record = input as Record<string, unknown>;
  const channel = record.channel === "GENERAL" ? "GENERAL" : "SUPPORTERS";
  const tone =
    typeof record.tone === "string" && record.tone.trim().length > 0
      ? record.tone.trim().slice(0, 40)
      : "warm";
  const reportingWindowDaysRaw = record.reportingWindowDays;
  const reportingWindowDays =
    typeof reportingWindowDaysRaw === "number" &&
    Number.isFinite(reportingWindowDaysRaw) &&
    reportingWindowDaysRaw > 0 &&
    reportingWindowDaysRaw <= 31
      ? Math.floor(reportingWindowDaysRaw)
      : 7;

  return {
    ok: true,
    value: {
      source: typeof record.source === "string" ? record.source : "mypage",
      requestedAt:
        typeof record.requestedAt === "string"
          ? record.requestedAt
          : new Date().toISOString(),
      channel,
      tone,
      reportingWindowDays,
      includeMetricsSummary: record.includeMetricsSummary !== false,
      includeSupportSummary: record.includeSupportSummary !== false,
    } as Prisma.InputJsonValue,
  };
}

function validateSupporterMessageDraftInput(input: unknown): TaskInputValidationResult {
  if (input == null) {
    return {
      ok: true,
      value: {
        source: "mypage",
        requestedAt: new Date().toISOString(),
        purpose: "THANK_YOU",
        tone: "warm",
        reportingWindowDays: 30,
        includeMetricsSummary: false,
        includeSupportSummary: true,
      } as Prisma.InputJsonValue,
    };
  }
  if (!isJsonValueForStorage(input) || typeof input !== "object" || input === null) {
    return { ok: false, error: "TASK_INPUT_INVALID" };
  }

  const record = input as Record<string, unknown>;
  const purpose =
    record.purpose === "REENGAGEMENT" ? "REENGAGEMENT" : "THANK_YOU";
  const tone =
    typeof record.tone === "string" && record.tone.trim().length > 0
      ? record.tone.trim().slice(0, 40)
      : "warm";
  const reportingWindowDaysRaw = record.reportingWindowDays;
  const reportingWindowDays =
    typeof reportingWindowDaysRaw === "number" &&
    Number.isFinite(reportingWindowDaysRaw) &&
    reportingWindowDaysRaw > 0 &&
    reportingWindowDaysRaw <= 90
      ? Math.floor(reportingWindowDaysRaw)
      : 30;

  return {
    ok: true,
    value: {
      source: typeof record.source === "string" ? record.source : "mypage",
      requestedAt:
        typeof record.requestedAt === "string"
          ? record.requestedAt
          : new Date().toISOString(),
      purpose,
      tone,
      reportingWindowDays,
      includeMetricsSummary: record.includeMetricsSummary === true,
      includeSupportSummary: record.includeSupportSummary !== false,
    } as Prisma.InputJsonValue,
  };
}

function validateProfileUpdateProposalInput(input: unknown): TaskInputValidationResult {
  if (input == null) {
    return {
      ok: true,
      value: {
        source: "mypage",
        requestedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    };
  }
  if (!isJsonValueForStorage(input) || typeof input !== "object" || input === null) {
    return { ok: false, error: "TASK_INPUT_INVALID" };
  }
  const record = input as Record<string, unknown>;
  return {
    ok: true,
    value: {
      source: typeof record.source === "string" ? record.source : "mypage",
      requestedAt:
        typeof record.requestedAt === "string"
          ? record.requestedAt
          : new Date().toISOString(),
    } as Prisma.InputJsonValue,
  };
}

function buildFallbackAnalyzeOutput(
  input: Prisma.InputJsonValue
): Prisma.InputJsonValue {
  return {
    summary: "直近の投稿頻度と反応率を比較し、次の投稿タイミング候補を提示します。",
    nextActions: [
      "直近3投稿の共通タグを抽出",
      "コメント率の高い投稿を再編集して再投稿",
    ],
    basedOn: isJsonValueForStorage(input) ? input : {},
  };
}

function toSafeInt(v: number | null | undefined): number {
  if (typeof v !== "number") return 0;
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.trunc(v));
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function buildAnalyzeOutput(params: {
  creatorProfileId: bigint;
  projectId: bigint | null;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  const rows = await prisma.contentMetricSnapshot.findMany({
    where: {
      creatorProfileId: params.creatorProfileId,
      ...(params.projectId ? { projectId: params.projectId } : {}),
    },
    orderBy: { capturedAt: "desc" },
    take: 20,
    select: {
      platform: true,
      views: true,
      likes: true,
      comments: true,
      shares: true,
      capturedAt: true,
    },
  });

  if (rows.length === 0) {
    return {
      summary: "分析対象のmetricsがまだありません。",
      nextActions: [
        "Creator Founding の投稿指標を更新してください",
        "必要なら Creator Founding 内で投稿を1本追加してください",
      ],
      basedOn: params.input,
    };
  }

  let viewsTotal = 0;
  let likesTotal = 0;
  let commentsTotal = 0;
  let sharesTotal = 0;
  const byPlatform = new Map<
    string,
    { views: number; likes: number; comments: number; shares: number; count: number }
  >();

  for (const row of rows) {
    const views = toSafeInt(row.views);
    const likes = toSafeInt(row.likes);
    const comments = toSafeInt(row.comments);
    const shares = toSafeInt(row.shares);

    viewsTotal += views;
    likesTotal += likes;
    commentsTotal += comments;
    sharesTotal += shares;

    const current = byPlatform.get(row.platform) ?? {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      count: 0,
    };
    current.views += views;
    current.likes += likes;
    current.comments += comments;
    current.shares += shares;
    current.count += 1;
    byPlatform.set(row.platform, current);
  }

  const interactionsTotal = likesTotal + commentsTotal + sharesTotal;
  const engagementRate = viewsTotal > 0 ? interactionsTotal / viewsTotal : 0;

  const platformStats = Array.from(byPlatform.entries()).map(([platform, stat]) => ({
    platform,
    count: stat.count,
    views: stat.views,
    likes: stat.likes,
    comments: stat.comments,
    shares: stat.shares,
    interactionRate:
      stat.views > 0
        ? (stat.likes + stat.comments + stat.shares) / stat.views
        : 0,
  }));
  platformStats.sort((a, b) => b.interactionRate - a.interactionRate);
  const top = platformStats[0];

  const daily = new Map<
    string,
    { views: number; interactions: number; count: number }
  >();
  for (const row of rows) {
    const key = dayKey(row.capturedAt);
    const current = daily.get(key) ?? { views: 0, interactions: 0, count: 0 };
    const views = toSafeInt(row.views);
    const interactions =
      toSafeInt(row.likes) + toSafeInt(row.comments) + toSafeInt(row.shares);
    current.views += views;
    current.interactions += interactions;
    current.count += 1;
    daily.set(key, current);
  }

  const trendSeries = Array.from(daily.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7)
    .map(([date, stat]) => ({
      date,
      views: stat.views,
      interactions: stat.interactions,
      interactionRate: stat.views > 0 ? stat.interactions / stat.views : 0,
      count: stat.count,
    }));

  const prev = trendSeries.length >= 2 ? trendSeries[trendSeries.length - 2] : null;
  const curr = trendSeries.length >= 1 ? trendSeries[trendSeries.length - 1] : null;
  const viewsDeltaPct =
    prev && curr && prev.views > 0 ? (curr.views - prev.views) / prev.views : 0;
  const rateDeltaPct =
    prev && curr && prev.interactionRate > 0
      ? (curr.interactionRate - prev.interactionRate) / prev.interactionRate
      : 0;

  return {
    summary: `直近${rows.length}件を分析。総再生 ${viewsTotal}、総反応 ${interactionsTotal}、反応率 ${(
      engagementRate * 100
    ).toFixed(2)}%。`,
    keyInsights: [
      top
        ? `最も反応率が高いのは ${top.platform}（${(top.interactionRate * 100).toFixed(
            2
          )}%）`
        : "プラットフォーム別比較データなし",
      `いいね ${likesTotal} / コメント ${commentsTotal} / シェア ${sharesTotal}`,
      prev && curr
        ? `前日比: 再生 ${viewsDeltaPct >= 0 ? "+" : ""}${(
            viewsDeltaPct * 100
          ).toFixed(1)}% / 反応率 ${rateDeltaPct >= 0 ? "+" : ""}${(
            rateDeltaPct * 100
          ).toFixed(1)}%`
        : "前日比較に必要な日次データが不足",
    ],
    nextActions: [
      viewsDeltaPct <= -0.2
        ? "再生数が減少中のため、投稿時間帯を変更してAB比較を実施"
        : viewsDeltaPct >= 0.2
          ? "再生数が伸長中のため、同フォーマットを短期間で再現"
          : "再生数は横ばいのため、サムネ/冒頭3秒の改善を優先",
      rateDeltaPct <= -0.15
        ? "反応率が低下しているため、コメント誘導CTAを明示"
        : rateDeltaPct >= 0.15
          ? "反応率が上昇しているため、同テーマのシリーズ化を検討"
          : "反応率は安定しているため、投稿頻度の最適化を優先",
      "反応率上位プラットフォーム向けの投稿案を優先生成",
    ],
    metrics: {
      count: rows.length,
      totals: {
        views: viewsTotal,
        likes: likesTotal,
        comments: commentsTotal,
        shares: sharesTotal,
      },
      byPlatform: platformStats,
      trend: {
        points: trendSeries,
        viewsDeltaPct,
        rateDeltaPct,
      },
    },
    basedOn: params.input,
  };
}

async function buildProposeOutput(params: {
  creatorProfileId: bigint;
  projectId: bigint | null;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  const rows = await prisma.contentMetricSnapshot.findMany({
    where: {
      creatorProfileId: params.creatorProfileId,
      ...(params.projectId ? { projectId: params.projectId } : {}),
    },
    orderBy: { capturedAt: "desc" },
    take: 20,
    select: {
      platform: true,
      views: true,
      likes: true,
      comments: true,
      shares: true,
    },
  });

  if (rows.length === 0) {
    return {
      summary: "metricsがまだ少ないため、初期提案を生成しました。",
      proposals: [
        "自己紹介ショート動画を固定フォーマットで週2本投稿",
        "直近活動の進捗告知を毎週同曜日・同時刻に投稿",
        "コメント返信をまとめたQ&A投稿を1本作成",
      ],
      basedOn: params.input,
    };
  }

  const byPlatform = new Map<
    string,
    { views: number; interactions: number; count: number }
  >();
  for (const row of rows) {
    const views = toSafeInt(row.views);
    const interactions =
      toSafeInt(row.likes) + toSafeInt(row.comments) + toSafeInt(row.shares);
    const curr = byPlatform.get(row.platform) ?? {
      views: 0,
      interactions: 0,
      count: 0,
    };
    curr.views += views;
    curr.interactions += interactions;
    curr.count += 1;
    byPlatform.set(row.platform, curr);
  }

  const ranked = Array.from(byPlatform.entries()).map(([platform, stat]) => ({
    platform,
    count: stat.count,
    views: stat.views,
    interactions: stat.interactions,
    rate: stat.views > 0 ? stat.interactions / stat.views : 0,
  }));
  ranked.sort((a, b) => b.rate - a.rate);
  const top = ranked[0];

  const fallbackProposals = [
    top
      ? `${top.platform}向けに、反応率の高い形式を再利用した短尺投稿を3本作成`
      : "最も反応率の高い投稿形式を再利用して短尺投稿を3本作成",
    "コメント率の高い投稿テーマを深掘りし、次回配信タイトルに反映",
    "48時間間隔で告知→本編→振り返りの3連続投稿を試行して比較",
  ];

  const platformSummary = ranked
    .slice(0, 3)
    .map((r) => `${r.platform}: 反応率${(r.rate * 100).toFixed(2)}% / ${r.count}本`)
    .join(", ");

  const aiResult = await generateJson<{ proposals: string[] }>(
    `クリエイターの直近${rows.length.toString()}投稿を分析しました。\nプラットフォーム別反応率: ${platformSummary || "データなし"}\n\n実行優先度の高いコンテンツ企画案を3つ提案してください。具体的かつ実行可能な内容で。\n\n以下のJSON形式のみで返してください:\n{"proposals":["提案1","提案2","提案3"]}`,
    {
      systemPrompt: "あなたはクリエイターのコンテンツ戦略アドバイザーです。データに基づいた実践的な提案を日本語で返してください。",
      maxTokens: 400,
      temperature: 0.7,
    }
  );

  return {
    summary: `直近${rows.length.toString()}件の反応データから、実行優先度の高い企画案を生成しました。`,
    proposals: aiResult?.proposals?.length ? aiResult.proposals : fallbackProposals,
    metricsHint: ranked.slice(0, 3).map((r) => ({
      platform: r.platform,
      posts: r.count,
      interactionRate: r.rate,
      interactions: r.interactions,
      views: r.views,
    })),
    basedOn: params.input,
  };
}

async function buildWeeklyReportOutput(params: {
  creatorProfileId: bigint;
  projectId: bigint | null;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  const inputRecord =
    typeof params.input === "object" && params.input !== null && !Array.isArray(params.input)
      ? (params.input as Record<string, unknown>)
      : {};
  const windowDaysRaw = inputRecord.reportingWindowDays;
  const windowDays =
    typeof windowDaysRaw === "number" &&
    Number.isFinite(windowDaysRaw) &&
    windowDaysRaw > 0 &&
    windowDaysRaw <= 31
      ? Math.floor(windowDaysRaw)
      : 7;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - windowDays);

  const metricRows = await prisma.contentMetricSnapshot.findMany({
    where: {
      creatorProfileId: params.creatorProfileId,
      capturedAt: { gte: since },
      ...(params.projectId ? { projectId: params.projectId } : {}),
    },
    orderBy: { capturedAt: "desc" },
    take: 50,
    select: {
      platform: true,
      views: true,
      likes: true,
      comments: true,
      shares: true,
      capturedAt: true,
    },
  });

  const contributionAgg = params.projectId
    ? await prisma.contribution.aggregate({
        where: {
          projectId: params.projectId,
          status: "CONFIRMED",
          createdAt: { gte: since },
        },
        _sum: { amountDecimal: true },
        _count: { _all: true },
      })
    : null;

  let totalViews = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;
  const platformSummary = new Map<
    string,
    { views: number; interactions: number; count: number }
  >();

  for (const row of metricRows) {
    const views = toSafeInt(row.views);
    const likes = toSafeInt(row.likes);
    const comments = toSafeInt(row.comments);
    const shares = toSafeInt(row.shares);
    const interactions = likes + comments + shares;

    totalViews += views;
    totalLikes += likes;
    totalComments += comments;
    totalShares += shares;

    const current = platformSummary.get(row.platform) ?? {
      views: 0,
      interactions: 0,
      count: 0,
    };
    current.views += views;
    current.interactions += interactions;
    current.count += 1;
    platformSummary.set(row.platform, current);
  }

  const rankedPlatforms = Array.from(platformSummary.entries()).map(
    ([platform, stat]) => ({
      platform,
      count: stat.count,
      views: stat.views,
      interactions: stat.interactions,
      interactionRate: stat.views > 0 ? stat.interactions / stat.views : 0,
    })
  );
  rankedPlatforms.sort((a, b) => b.interactionRate - a.interactionRate);
  const topPlatform = rankedPlatforms[0] ?? null;

  const totalInteractions = totalLikes + totalComments + totalShares;
  const interactionRate = totalViews > 0 ? totalInteractions / totalViews : 0;
  const contributionTotal = contributionAgg?._sum.amountDecimal
    ? Number(contributionAgg._sum.amountDecimal.toString())
    : 0;
  const contributionCount = contributionAgg?._count._all ?? 0;

  const highlights: string[] = [];
  const actionItems: string[] = [];

  if (metricRows.length === 0) {
    highlights.push("過去7日間の metrics データはまだありません。");
    actionItems.push(
      "Creator Founding の投稿指標を更新して週次レポートの精度を上げる。"
    );
  } else {
    highlights.push(
      `${windowDays}日間で views ${totalViews}、interactions ${totalInteractions}、反応率 ${(interactionRate * 100).toFixed(2)}%。`
    );
    if (topPlatform) {
      highlights.push(
        `最も反応率が高いのは ${topPlatform.platform}（${(
          topPlatform.interactionRate * 100
        ).toFixed(2)}%）。`
      );
      actionItems.push(
        `${topPlatform.platform} で成果の良かった形式を来週も再利用する。`
      );
    }
    if (totalComments > 0) {
      actionItems.push("反応があった投稿に対する返信や follow-up を作成する。");
    } else {
      actionItems.push("コメント誘導 CTA を含む投稿を1本追加する。");
    }
  }

  if (params.projectId) {
    highlights.push(
      `同期間の支援は ${contributionCount}件、合計 ${contributionTotal.toLocaleString()}。`
    );
    actionItems.push("支援進捗を踏まえた週次のお礼または進捗共有文を作る。");
  }

  return {
    summary:
      metricRows.length === 0
        ? `過去${windowDays}日間の活動レポートを作成しました。現時点では metrics が不足しています。`
        : `過去${windowDays}日間の活動レポートを作成しました。`,
    reportingPeriod: {
      days: windowDays,
      since: since.toISOString(),
      until: new Date().toISOString(),
    },
    highlights,
    actionItems,
    metricsSummary: {
      snapshotCount: metricRows.length,
      totals: {
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
      },
      interactionRate,
      topPlatform: topPlatform
        ? {
            platform: topPlatform.platform,
            interactionRate: topPlatform.interactionRate,
            views: topPlatform.views,
            interactions: topPlatform.interactions,
          }
        : null,
    },
    supportSummary: params.projectId
      ? {
          contributionCount,
          confirmedAmountTotal: contributionTotal,
        }
      : null,
    basedOn: params.input,
  };
}

async function buildAnnouncementDraftOutput(params: {
  creatorProfileId: bigint;
  projectId: bigint | null;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  const record =
    typeof params.input === "object" && params.input !== null && !Array.isArray(params.input)
      ? (params.input as Record<string, unknown>)
      : {};
  const windowDaysRaw = record.reportingWindowDays;
  const windowDays =
    typeof windowDaysRaw === "number" &&
    Number.isFinite(windowDaysRaw) &&
    windowDaysRaw > 0 &&
    windowDaysRaw <= 31
      ? Math.floor(windowDaysRaw)
      : 7;
  const channel = record.channel === "GENERAL" ? "GENERAL" : "SUPPORTERS";
  const includeMetricsSummary = record.includeMetricsSummary !== false;
  const includeSupportSummary = record.includeSupportSummary !== false;
  const tone =
    typeof record.tone === "string" && record.tone.trim().length > 0
      ? record.tone.trim()
      : "warm";

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [creator, project, metricRows, contributionAggregate] = await Promise.all([
    prisma.creatorProfile.findUnique({
      where: { id: params.creatorProfileId },
      select: { displayName: true, username: true },
    }),
    params.projectId
      ? prisma.project.findUnique({
          where: { id: params.projectId },
          select: { title: true, description: true, currency: true },
        })
      : Promise.resolve(null),
    prisma.contentMetricSnapshot.findMany({
      where: {
        creatorProfileId: params.creatorProfileId,
        ...(params.projectId ? { projectId: params.projectId } : {}),
        capturedAt: { gte: since },
      },
      orderBy: { capturedAt: "desc" },
      take: 30,
      select: {
        platform: true,
        views: true,
        likes: true,
        comments: true,
        shares: true,
      },
    }),
    params.projectId
      ? prisma.contribution.aggregate({
          where: {
            projectId: params.projectId,
            status: "CONFIRMED",
            confirmedAt: { gte: since },
          },
          _count: { _all: true },
          _sum: { amountDecimal: true },
        })
      : Promise.resolve(null),
  ]);

  const creatorLabel = creator?.displayName || creator?.username || "クリエイター";
  const projectLabel = project?.title || "現在の活動";

  let totalViews = 0;
  let totalInteractions = 0;
  const byPlatform = new Map<
    string,
    { views: number; interactions: number }
  >();
  for (const row of metricRows) {
    const views = toSafeInt(row.views);
    const interactions =
      toSafeInt(row.likes) + toSafeInt(row.comments) + toSafeInt(row.shares);
    totalViews += views;
    totalInteractions += interactions;
    const current = byPlatform.get(row.platform) ?? { views: 0, interactions: 0 };
    current.views += views;
    current.interactions += interactions;
    byPlatform.set(row.platform, current);
  }

  const topPlatform = Array.from(byPlatform.entries())
    .map(([platform, stat]) => ({
      platform,
      views: stat.views,
      interactions: stat.interactions,
      interactionRate: stat.views > 0 ? stat.interactions / stat.views : 0,
    }))
    .sort((a, b) => b.interactionRate - a.interactionRate)[0] ?? null;

  const contributionCount = contributionAggregate?._count._all ?? 0;
  const contributionTotal = contributionAggregate?._sum.amountDecimal
    ? Number(contributionAggregate._sum.amountDecimal)
    : 0;

  const supportingPoints: string[] = [];
  if (includeMetricsSummary && metricRows.length > 0) {
    supportingPoints.push(
      `直近${windowDays}日で views ${totalViews.toLocaleString()} / interactions ${totalInteractions.toLocaleString()}`
    );
    if (topPlatform) {
      supportingPoints.push(
        `${topPlatform.platform} の反応率が最も高く、${(
          topPlatform.interactionRate * 100
        ).toFixed(2)}%`
      );
    }
  }
  if (includeSupportSummary && params.projectId) {
    supportingPoints.push(
      `同期間の支援は ${contributionCount}件 / 合計 ${contributionTotal.toLocaleString()} ${project?.currency ?? ""}`.trim()
    );
  }
  if (project?.description) {
    supportingPoints.push(project.description.slice(0, 120));
  }

  const headlineFallback =
    channel === "SUPPORTERS"
      ? `${projectLabel} の進捗とお礼をお届けします`
      : `${projectLabel} の最新状況をお知らせします`;
  const introFallback =
    channel === "SUPPORTERS"
      ? `${creatorLabel}です。いつも支援ありがとうございます。`
      : `${creatorLabel}です。最近の活動状況をまとめました。`;
  const metricsLineFallback =
    includeMetricsSummary && metricRows.length > 0
      ? `この${windowDays.toString()}日で ${totalViews.toLocaleString()} views、${totalInteractions.toLocaleString()} interactions がありました。`
      : "今週は次の発信に向けた準備を進めています。";
  const supportLineFallback =
    includeSupportSummary && params.projectId
      ? contributionCount > 0
        ? `${contributionCount.toString()}件の支援を受け取り、合計 ${contributionTotal.toLocaleString()} ${
            project?.currency ?? ""
          } が集まりました。`
        : "今週は大きな支援変動はありませんでしたが、次の告知に向けて導線を整えています。"
      : "";
  const nextLineFallback = topPlatform
    ? `次は ${topPlatform.platform} で反応の良かった切り口を中心に展開します。`
    : "次は進捗共有と次回予告をセットで出す予定です。";
  const callToActionFallback =
    channel === "SUPPORTERS"
      ? "感想や応援コメントをもらえると次の改善に反映しやすいです。"
      : "気になった方はプロフィールや支援ページも見てもらえるとうれしいです。";
  const fallbackBody = [introFallback, metricsLineFallback, supportLineFallback, nextLineFallback]
    .filter(Boolean)
    .join("\n\n");

  const aiResult = await generateJson<{ headline: string; body: string; callToAction: string }>(
    `クリエイター「${creatorLabel}」のプロジェクト「${projectLabel}」向けの告知文を書いてください。
対象: ${channel === "SUPPORTERS" ? "既存支援者" : "一般公開"}
トーン: ${tone}
直近${windowDays.toString()}日の活動データ: ${supportingPoints.join(" / ") || "データなし"}

以下のJSON形式のみで返してください:
{"headline":"タイトル（20文字以内）","body":"本文（150〜250文字）","callToAction":"行動喚起（30文字以内）"}`,
    {
      systemPrompt:
        "あなたはクリエイター支援プラットフォームのコピーライターです。自然な日本語で、読者が応援したくなる文章を書いてください。",
      maxTokens: 512,
      temperature: 0.8,
    }
  );

  return {
    summary:
      channel === "SUPPORTERS"
        ? "支援者向け告知文案を生成しました。"
        : "公開向け告知文案を生成しました。",
    headline: aiResult?.headline ?? headlineFallback,
    channel,
    body: aiResult?.body ?? fallbackBody,
    callToAction: aiResult?.callToAction ?? callToActionFallback,
    tone,
    supportingPoints,
    basedOn: params.input,
  };
}

async function buildSupporterMessageDraftOutput(params: {
  creatorProfileId: bigint;
  projectId: bigint | null;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  const record =
    typeof params.input === "object" && params.input !== null && !Array.isArray(params.input)
      ? (params.input as Record<string, unknown>)
      : {};
  const purpose = record.purpose === "REENGAGEMENT" ? "REENGAGEMENT" : "THANK_YOU";
  const tone =
    typeof record.tone === "string" && record.tone.trim().length > 0
      ? record.tone.trim()
      : "warm";
  const includeMetricsSummary = record.includeMetricsSummary === true;
  const includeSupportSummary = record.includeSupportSummary !== false;
  const windowDaysRaw = record.reportingWindowDays;
  const windowDays =
    typeof windowDaysRaw === "number" &&
    Number.isFinite(windowDaysRaw) &&
    windowDaysRaw > 0 &&
    windowDaysRaw <= 90
      ? Math.floor(windowDaysRaw)
      : 30;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [creator, project, contributionAggregate, metricRows] = await Promise.all([
    prisma.creatorProfile.findUnique({
      where: { id: params.creatorProfileId },
      select: { displayName: true, username: true },
    }),
    params.projectId
      ? prisma.project.findUnique({
          where: { id: params.projectId },
          select: { title: true, currency: true },
        })
      : Promise.resolve(null),
    params.projectId
      ? prisma.contribution.aggregate({
          where: {
            projectId: params.projectId,
            status: "CONFIRMED",
            confirmedAt: { gte: since },
          },
          _count: { _all: true },
          _sum: { amountDecimal: true },
        })
      : Promise.resolve(null),
    includeMetricsSummary
      ? prisma.contentMetricSnapshot.findMany({
          where: {
            creatorProfileId: params.creatorProfileId,
            ...(params.projectId ? { projectId: params.projectId } : {}),
            capturedAt: { gte: since },
          },
          orderBy: { capturedAt: "desc" },
          take: 20,
          select: {
            platform: true,
            views: true,
            likes: true,
            comments: true,
            shares: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const creatorLabel = creator?.displayName || creator?.username || "クリエイター";
  const projectLabel = project?.title || "最近の活動";
  const contributionCount = contributionAggregate?._count._all ?? 0;
  const contributionTotal = contributionAggregate?._sum.amountDecimal
    ? Number(contributionAggregate._sum.amountDecimal)
    : 0;

  let totalViews = 0;
  let totalInteractions = 0;
  for (const row of metricRows) {
    totalViews += toSafeInt(row.views);
    totalInteractions +=
      toSafeInt(row.likes) + toSafeInt(row.comments) + toSafeInt(row.shares);
  }

  const supportingPoints: string[] = [];
  if (includeSupportSummary && params.projectId) {
    supportingPoints.push(
      `直近${windowDays}日で ${contributionCount}件 / ${contributionTotal.toLocaleString()} ${
        project?.currency ?? ""
      } の支援`
    );
  }
  if (includeMetricsSummary && metricRows.length > 0) {
    supportingPoints.push(
      `活動指標は ${totalViews.toLocaleString()} views / ${totalInteractions.toLocaleString()} interactions`
    );
  }

  const subjectFallback =
    purpose === "THANK_YOU"
      ? `${projectLabel} を支えてくれてありがとうございます`
      : `${projectLabel} の近況をあらためて共有します`;
  const openingFallback =
    purpose === "THANK_YOU"
      ? `${creatorLabel}です。いつも応援ありがとうございます。`
      : `${creatorLabel}です。最近の活動状況を共有させてください。`;
  const supportLineFallback =
    includeSupportSummary && params.projectId
      ? contributionCount > 0
        ? `この${windowDays.toString()}日で ${contributionCount.toString()}件の支援を受け取り、合計 ${contributionTotal.toLocaleString()} ${
            project?.currency ?? ""
          } が集まりました。`
        : `この${windowDays.toString()}日では大きな支援変動はありませんでしたが、次の動きに向けて準備を進めています。`
      : "";
  const metricsLineFallback =
    includeMetricsSummary && metricRows.length > 0
      ? `活動面では ${totalViews.toLocaleString()} views、${totalInteractions.toLocaleString()} interactions がありました。`
      : "";
  const closingFallback =
    purpose === "THANK_YOU"
      ? "これからも活動を前に進めていくので、引き続き見守ってもらえるとうれしいです。"
      : "よければ近況への感想や、気になっていることを教えてください。";
  const fallbackBody = [openingFallback, supportLineFallback, metricsLineFallback, closingFallback]
    .filter(Boolean)
    .join("\n\n");

  const aiResult = await generateJson<{ subject: string; body: string; closing: string }>(
    `クリエイター「${creatorLabel}」のプロジェクト「${projectLabel}」の支援者へのメッセージを書いてください。
目的: ${purpose === "THANK_YOU" ? "感謝のお礼" : "再接続・近況報告"}
トーン: ${tone}
直近${windowDays.toString()}日のデータ: ${supportingPoints.join(" / ") || "データなし"}

以下のJSON形式のみで返してください:
{"subject":"件名（30文字以内）","body":"本文（150〜200文字）","closing":"締めの一文（40文字以内）"}`,
    {
      systemPrompt:
        "あなたはクリエイター支援プラットフォームのコピーライターです。支援者との関係を大切にする温かい日本語で書いてください。",
      maxTokens: 512,
      temperature: 0.8,
    }
  );

  return {
    summary:
      purpose === "THANK_YOU"
        ? "支援者向けお礼メッセージ案を生成しました。"
        : "支援者向け再接続メッセージ案を生成しました。",
    audience: "SUPPORTERS",
    purpose,
    subject: aiResult?.subject ?? subjectFallback,
    body: aiResult?.body ?? fallbackBody,
    closing: aiResult?.closing ?? closingFallback,
    tone,
    supportingPoints,
    basedOn: params.input,
  };
}

const TASK_DEFINITIONS: Record<TaskType, TaskDefinition> = {
  MANAGER_NEXT_ACTIONS: {
    validateInput: validateManagerNextActionsInput,
    outputSchema: {
      kind: "MANAGER_NEXT_ACTIONS",
      fields: {
        summary: {
          type: "string",
          required: true,
          description: "Manager Agent による次アクション要約",
        },
        suggestedActions: {
          type: "array",
          required: true,
          description: "summary をもとに整理した next action 候補",
        },
        evidence: {
          type: "object",
          required: true,
          description: "判断根拠となる project summary の圧縮情報",
        },
        projectSnapshot: {
          type: "object",
          required: false,
          description: "参照した project / goal / progress の要約",
        },
        basedOn: {
          type: "unknown",
          required: true,
          description: "正規化済み入力",
        },
      },
    },
    execute: async (params) => {
      const normalizedInput =
        normalizeManagerAgentTaskInput(params.input) ?? {
          source: "mypage",
          requestedAt: new Date().toISOString(),
        };
      const summary = params.projectId
        ? await getProjectSummaryView(params.projectId)
        : null;

      return buildManagerAgentTaskOutput({
        summary,
        input: normalizedInput,
        isOwner: true,
      });
    },
  },
  DISTRIBUTION_PLAN_DRAFT: {
    validateInput: validateDistributionPlanDraftInput,
    outputSchema: {
      kind: "DISTRIBUTION_PLAN_DRAFT",
      fields: {
        summary: {
          type: "string",
          required: true,
          description: "Finance Agent による配分下書き要約",
        },
        draftPayload: {
          type: "object",
          required: false,
          description: "Draft step へ handoff できる approval-only payload",
        },
        projectSnapshot: {
          type: "object",
          required: false,
          description: "参照した project / settlement の要約",
        },
        basedOn: {
          type: "unknown",
          required: true,
          description: "正規化済み入力",
        },
      },
    },
    execute: async (params) => {
      const normalizedInput =
        normalizeDistributionPlanDraftTaskInput(params.input) ?? {
          source: "mypage",
          requestedAt: new Date().toISOString(),
        };
      const summary = params.projectId
        ? await getProjectSummaryView(params.projectId)
        : null;
      const settlement = params.projectId
        ? await getProjectSettlementView(params.projectId)
        : null;

      return buildDistributionPlanDraftTaskOutput({
        summary,
        settlement,
        input: normalizedInput,
      });
    },
  },
  ANALYZE: {
    validateInput: validateGenericJsonInput,
    outputSchema: {
      kind: "ANALYZE",
      fields: {
        summary: {
          type: "string",
          required: true,
          description: "分析要約",
        },
        keyInsights: {
          type: "array",
          required: true,
          description: "主要インサイト一覧",
        },
        nextActions: {
          type: "array",
          required: true,
          description: "次の推奨アクション",
        },
        metrics: {
          type: "object",
          required: true,
          description: "集計済み metrics",
        },
        basedOn: {
          type: "unknown",
          required: true,
          description: "入力コンテキスト",
        },
      },
    },
    execute: async (params) => {
      if (!params.creatorProfileId) {
        return buildFallbackAnalyzeOutput(params.input);
      }
      return buildAnalyzeOutput(params);
    },
  },
  PROPOSE: {
    validateInput: validateGenericJsonInput,
    outputSchema: {
      kind: "PROPOSE",
      fields: {
        summary: {
          type: "string",
          required: true,
          description: "提案要約",
        },
        proposals: {
          type: "array",
          required: true,
          description: "提案候補一覧",
        },
        metricsHint: {
          type: "array",
          required: false,
          description: "提案根拠の metrics 補助情報",
        },
        basedOn: {
          type: "unknown",
          required: true,
          description: "入力コンテキスト",
        },
      },
    },
    execute: async (params) => {
      if (!params.creatorProfileId) {
        return buildDefaultProposeLikeOutput(params.input);
      }
      return buildProposeOutput(params);
    },
  },
  TRANSLATE: {
    validateInput: validateTranslateInput,
    outputSchema: {
      kind: "TRANSLATE",
      fields: {
        summary: {
          type: "string",
          required: true,
          description: "翻訳タスクの要約",
        },
        translations: {
          type: "array",
          required: true,
          description: "言語ごとの翻訳結果",
        },
        basedOn: {
          type: "unknown",
          required: true,
          description: "正規化済み入力",
        },
      },
    },
    execute: (params) => buildTranslateOutput(params.input),
  },
  WEEKLY_REPORT: {
    validateInput: validateWeeklyReportInput,
    outputSchema: {
      kind: "WEEKLY_REPORT",
      fields: {
        summary: {
          type: "string",
          required: true,
          description: "週次レポート要約",
        },
        reportingPeriod: {
          type: "object",
          required: true,
          description: "レポート対象期間",
        },
        highlights: {
          type: "array",
          required: true,
          description: "主要ハイライト",
        },
        actionItems: {
          type: "array",
          required: true,
          description: "次に取るべき行動",
        },
        metricsSummary: {
          type: "object",
          required: true,
          description: "活動 metrics の週次サマリ",
        },
        supportSummary: {
          type: "object",
          required: false,
          description: "支援状況の週次サマリ",
        },
        basedOn: {
          type: "unknown",
          required: true,
          description: "正規化済み入力",
        },
      },
    },
    execute: async (params) => buildWeeklyReportOutput(params),
  },
  ANNOUNCEMENT_DRAFT: {
    validateInput: validateAnnouncementDraftInput,
    outputSchema: {
      kind: "ANNOUNCEMENT_DRAFT",
      fields: {
        summary: {
          type: "string",
          required: true,
          description: "告知文案の要約",
        },
        headline: {
          type: "string",
          required: true,
          description: "見出し案",
        },
        channel: {
          type: "string",
          required: true,
          description: "告知先チャネル",
        },
        body: {
          type: "string",
          required: true,
          description: "本文ドラフト",
        },
        callToAction: {
          type: "string",
          required: false,
          description: "末尾のCTA案",
        },
        supportingPoints: {
          type: "array",
          required: true,
          description: "本文の根拠となる補助ポイント",
        },
        basedOn: {
          type: "unknown",
          required: true,
          description: "正規化済み入力",
        },
      },
    },
    execute: async (params) => buildAnnouncementDraftOutput(params),
  },
  SUPPORTER_MESSAGE_DRAFT: {
    validateInput: validateSupporterMessageDraftInput,
    outputSchema: {
      kind: "SUPPORTER_MESSAGE_DRAFT",
      fields: {
        summary: {
          type: "string",
          required: true,
          description: "支援者向けメッセージの要約",
        },
        audience: {
          type: "string",
          required: true,
          description: "送信対象",
        },
        purpose: {
          type: "string",
          required: true,
          description: "メッセージの目的",
        },
        subject: {
          type: "string",
          required: true,
          description: "件名案",
        },
        body: {
          type: "string",
          required: true,
          description: "本文ドラフト",
        },
        closing: {
          type: "string",
          required: true,
          description: "締めの文案",
        },
        supportingPoints: {
          type: "array",
          required: true,
          description: "根拠となる補助ポイント",
        },
        basedOn: {
          type: "unknown",
          required: true,
          description: "正規化済み入力",
        },
      },
    },
    execute: async (params) => buildSupporterMessageDraftOutput(params),
  },
  PROFILE_UPDATE_PROPOSAL: {
    validateInput: validateProfileUpdateProposalInput,
    outputSchema: {
      kind: "PROFILE_UPDATE_PROPOSAL",
      fields: {
        summary: {
          type: "string",
          required: true,
          description: "プロフィール評価の要約",
        },
        profileSnapshot: {
          type: "object",
          required: true,
          description: "現在のプロフィール充足状況",
        },
        proposals: {
          type: "array",
          required: true,
          description: "改善提案のリスト",
        },
        nextActions: {
          type: "array",
          required: true,
          description: "優先度の高い改善アクション",
        },
        missingFields: {
          type: "array",
          required: true,
          description: "未設定または不十分なフィールド名",
        },
        basedOn: {
          type: "unknown",
          required: true,
          description: "正規化済み入力",
        },
      },
    },
    execute: async (params) =>
      buildProfileUpdateProposalOutput({
        creatorProfileId: params.creatorProfileId,
        input: params.input,
      }),
  },
  DAILY_ACTION_PLAN: {
    validateInput: validateGenericJsonInput,
    outputSchema: {
      kind: "DAILY_ACTION_PLAN",
      fields: {
        summary: {
          type: "string",
          required: true,
          description: "今日の行動計画の要約",
        },
        actions: {
          type: "array",
          required: true,
          description: "優先度付きの今日のアクションリスト",
        },
        generatedAt: {
          type: "string",
          required: true,
          description: "生成日時 (ISO 8601)",
        },
        context: {
          type: "object",
          required: true,
          description: "生成根拠となるコンテキスト情報",
        },
        basedOn: {
          type: "unknown",
          required: true,
          description: "正規化済み入力",
        },
      },
    },
    execute: async (params) => buildDailyActionPlanOutput(params),
  },
  ACTIVITY_RESTART_PROPOSAL: {
    validateInput: validateGenericJsonInput,
    outputSchema: {
      kind: "ACTIVITY_RESTART_PROPOSAL",
      fields: {
        summary: {
          type: "string",
          required: true,
          description: "再起動提案の要約",
        },
        inactivityContext: {
          type: "object",
          required: true,
          description: "非活動状況の文脈情報",
        },
        successPatterns: {
          type: "array",
          required: true,
          description: "過去の成功パターン",
        },
        restartSteps: {
          type: "array",
          required: true,
          description: "再起動のための段階的なステップ",
        },
        supportContext: {
          type: "object",
          required: false,
          description: "直近の支援状況",
        },
        basedOn: {
          type: "unknown",
          required: true,
          description: "正規化済み入力",
        },
      },
    },
    execute: async (params) => buildActivityRestartProposalOutput(params),
  },
  SUPPORT_STORY_DRAFT: {
    validateInput: validateGenericJsonInput,
    outputSchema: {
      kind: "SUPPORT_STORY_DRAFT",
      fields: {
        summary: {
          type: "string",
          required: true,
          description: "支援ストーリー生成の要約",
        },
        storyText: {
          type: "string",
          required: true,
          description: "支援ストーリーの全文",
        },
        sections: {
          type: "object",
          required: true,
          description: "why / what / progress の 3 セクション",
        },
        context: {
          type: "object",
          required: true,
          description: "生成根拠のスナップショット",
        },
        basedOn: {
          type: "unknown",
          required: true,
          description: "正規化済み入力",
        },
      },
    },
    execute: async (params) => buildSupportStoryDraftOutput(params),
  },
  SUPPORTER_RESULT_REPORT: {
    validateInput: validateGenericJsonInput,
    outputSchema: {
      kind: "SUPPORTER_RESULT_REPORT",
      fields: {
        summary: {
          type: "string",
          required: true,
          description: "支援結果レポートの要約",
        },
        goalLabel: {
          type: "string",
          required: true,
          description: "対象プロジェクト名",
        },
        achievedAt: {
          type: "string",
          required: false,
          description: "目標達成日時 (ISO 8601)",
        },
        purposeBreakdown: {
          type: "array",
          required: true,
          description: "用途別支援金集計",
        },
        totalAmount: {
          type: "number",
          required: true,
          description: "合計支援金額",
        },
        distributionNote: {
          type: "string",
          required: true,
          description: "配分実行状況の説明",
        },
        activityAfterNote: {
          type: "string",
          required: true,
          description: "達成後の活動状況",
        },
        basedOn: {
          type: "unknown",
          required: true,
          description: "正規化済み入力",
        },
      },
    },
    execute: async (params) => buildSupporterResultReportOutput(params),
  },
  CAREER_PLAN_DRAFT: {
    validateInput: validateGenericJsonInput,
    outputSchema: {
      kind: "CAREER_PLAN_DRAFT",
      fields: {
        summary: {
          type: "string",
          required: true,
          description: "キャリアプランの要約",
        },
        currentPhase: {
          type: "string",
          required: true,
          description: "現在の活動フェーズ",
        },
        milestones_3mo: {
          type: "array",
          required: true,
          description: "3ヶ月マイルストーン",
        },
        milestones_6mo: {
          type: "array",
          required: true,
          description: "6ヶ月マイルストーン",
        },
        focusAreas: {
          type: "array",
          required: true,
          description: "注力すべき領域",
        },
        weeklyPace: {
          type: "string",
          required: true,
          description: "週次ペースの推奨",
        },
        context: {
          type: "object",
          required: true,
          description: "生成根拠のスナップショット",
        },
        basedOn: {
          type: "unknown",
          required: true,
          description: "正規化済み入力",
        },
      },
    },
    execute: async (params) => buildCareerPlanDraftOutput(params),
  },
  GROWTH_OPPORTUNITY_ALERT: {
    validateInput: validateGenericJsonInput,
    outputSchema: {
      kind: "GROWTH_OPPORTUNITY_ALERT",
      fields: {
        summary: {
          type: "string",
          required: true,
          description: "成長機会アラートの要約",
        },
        opportunities: {
          type: "array",
          required: true,
          description: "成長機会一覧（type / title / insight / action / priority）",
        },
        metricsContext: {
          type: "object",
          required: true,
          description: "分析に使用した指標の集計値",
        },
        basedOn: {
          type: "unknown",
          required: true,
          description: "正規化済み入力",
        },
      },
    },
    execute: async (params) => buildGrowthOpportunityAlertOutput(params),
  },
};

export function validateTaskInput(
  taskType: TaskType,
  input: unknown
): TaskInputValidationResult {
  return TASK_DEFINITIONS[taskType].validateInput(input);
}

export function getTaskOutputSchema(taskType: TaskType): TaskOutputSchema {
  return TASK_DEFINITIONS[taskType].outputSchema;
}

export async function buildTaskOutput(params: {
  creatorProfileId: bigint;
  projectId: bigint | null;
  taskType: TaskType;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  return TASK_DEFINITIONS[params.taskType].execute(params);
}

type WaitingTask = {
  id: string;
  projectId: bigint | null;
  taskType: string;
  inputJson: Prisma.JsonValue;
  outputJson?: Prisma.JsonValue;
};

// ─── Auto-post helpers ────────────────────────────────────────────────────────

/** Task types whose output can be turned into a public Post body. */
const AUTO_POSTABLE_TASK_TYPES = new Set([
  "ANNOUNCEMENT_DRAFT",
  "TRANSLATE",
  "SUPPORT_STORY_DRAFT",
  "PROPOSE",
  "WEEKLY_REPORT",
  "SUPPORTER_MESSAGE_DRAFT",
]);

/**
 * Extract a publishable text body from a completed task's output JSON.
 * Returns null when the task type is not auto-postable or the output is malformed.
 */
function extractPostBodyFromTaskOutput(
  taskType: string,
  output: unknown
): string | null {
  if (!isRecord(output)) return null;

  switch (taskType) {
    case "ANNOUNCEMENT_DRAFT": {
      const headline =
        typeof output.headline === "string" ? output.headline : null;
      const body = typeof output.body === "string" ? output.body : null;
      if (!body) return null;
      return headline ? `${headline}\n\n${body}` : body;
    }
    case "TRANSLATE": {
      const translations = Array.isArray(output.translations)
        ? output.translations
        : [];
      const first = translations[0];
      if (!isRecord(first) || typeof first.text !== "string") return null;
      return first.text;
    }
    case "SUPPORT_STORY_DRAFT": {
      const storyText =
        typeof output.storyText === "string" ? output.storyText : null;
      return storyText;
    }
    case "PROPOSE": {
      const proposals = Array.isArray(output.proposals)
        ? output.proposals
        : [];
      const first = proposals[0];
      return typeof first === "string" ? first : null;
    }
    case "WEEKLY_REPORT": {
      const summary =
        typeof output.summary === "string" ? output.summary : null;
      return summary;
    }
    case "SUPPORTER_MESSAGE_DRAFT": {
      const subject =
        typeof output.subject === "string" ? output.subject : null;
      const body = typeof output.body === "string" ? output.body : null;
      if (!body) return null;
      return subject ? `${subject}\n\n${body}` : body;
    }
    default:
      return null;
  }
}

/** Returns true when the task input JSON has autoPost: true. */
function shouldAutoPost(inputJson: unknown): boolean {
  return isRecord(inputJson) && inputJson.autoPost === true;
}

/**
 * Create a published AI-generated Post from a completed agent task.
 * Silently skips when the task type is not postable or the output is malformed.
 */
async function createAutoPost(
  tx: Prisma.TransactionClient,
  params: {
    creatorProfileId: bigint;
    projectId: bigint | null;
    taskType: string;
    outputJson: unknown;
    now: Date;
  }
): Promise<void> {
  if (!AUTO_POSTABLE_TASK_TYPES.has(params.taskType)) return;
  const body = extractPostBodyFromTaskOutput(params.taskType, params.outputJson);
  if (!body || body.trim().length === 0) return;

  await tx.post.create({
    data: {
      creatorProfileId: params.creatorProfileId,
      projectId: params.projectId,
      authorType: "AI_AGENT",
      body: body.trim().slice(0, 2000),
      visibility: "PUBLIC",
      status: "PUBLISHED",
      aiGenerated: true,
      createdAt: params.now,
      updatedAt: params.now,
    },
    select: { id: true },
  });
}

// ─── Task creation / approval ─────────────────────────────────────────────────

export async function createAgentTask(params: {
  creatorProfileId: bigint;
  projectId: bigint | null;
  taskType: TaskType;
  inputJson: Prisma.InputJsonValue;
  requiresApproval: boolean;
  autoPost: boolean;
  requestedBy: string;
  roleId: CreatorAiAgentRole | null;
}) {
  const outputJson = await buildTaskOutput({
    creatorProfileId: params.creatorProfileId,
    projectId: params.projectId,
    taskType: params.taskType,
    input: params.inputJson,
  });
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const created = await tx.agentTask.create({
      data: {
        creatorProfileId: params.creatorProfileId,
        projectId: params.projectId,
        taskType: params.taskType,
        status: params.requiresApproval ? "WAITING_APPROVAL" : "DONE",
        inputJson: params.inputJson,
        outputJson,
        requestedBy: params.requestedBy,
        approvedBy: params.requiresApproval ? null : params.requestedBy,
        approvedAt: params.requiresApproval ? null : now,
        createdAt: now,
        updatedAt: now,
      },
      select: {
        id: true,
        projectId: true,
        taskType: true,
        status: true,
        requestedBy: true,
        approvedBy: true,
        approvedAt: true,
        inputJson: true,
        outputJson: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await tx.agentTaskAuditLog.create({
      data: {
        agentTaskId: created.id,
        creatorProfileId: params.creatorProfileId,
        projectId: params.projectId,
        action: getCreateAuditAction(params.requiresApproval),
        actorAddress: params.requestedBy,
        metaJson: buildCreateAuditMeta({
          taskType: params.taskType,
          requiresApproval: params.requiresApproval,
          roleId: params.roleId,
        }),
        createdAt: now,
      },
    });

    // Auto-post when no approval is needed and the creator opted in
    if (!params.requiresApproval && params.autoPost) {
      await createAutoPost(tx, {
        creatorProfileId: params.creatorProfileId,
        projectId: params.projectId,
        taskType: params.taskType,
        outputJson,
        now,
      });
    }

    return created;
  });
}

export async function rejectWaitingTasks(params: {
  creatorProfileId: bigint;
  waitingTasks: WaitingTask[];
  actorAddress: string;
  note: string | null;
}) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const results: Array<{
      id: string;
      status: string;
      approvedBy: string | null;
      approvedAt: Date | null;
      updatedAt: Date;
    }> = [];

    for (const task of params.waitingTasks) {
      const updated = await tx.agentTask.update({
        where: { id: task.id },
        data: {
          status: "FAILED",
          approvedBy: params.actorAddress,
          approvedAt: now,
          outputJson: {
            summary: "Task rejected by owner",
          } as Prisma.InputJsonValue,
          updatedAt: now,
        },
        select: {
          id: true,
          status: true,
          approvedBy: true,
          approvedAt: true,
          updatedAt: true,
        },
      });

      await tx.agentTaskAuditLog.create({
        data: {
          agentTaskId: task.id,
          creatorProfileId: params.creatorProfileId,
          projectId: task.projectId,
          action: AGENT_TASK_AUDIT_ACTION.REJECTED,
          actorAddress: params.actorAddress,
          metaJson: buildDecisionAuditMeta({
            taskType: task.taskType,
            note: params.note,
          }),
          createdAt: now,
        },
      });

      results.push(updated);
    }

    return results;
  });
}

export async function approveWaitingTasks(params: {
  creatorProfileId: bigint;
  waitingTasks: WaitingTask[];
  actorAddress: string;
  note: string | null;
}) {
  const now = new Date();
  const preparedTasks = (
    await Promise.all(
      params.waitingTasks.map(async (task) => {
        const taskType = toTaskType(task.taskType);
        if (!taskType) return null;

        const outputJson = await buildTaskOutput({
          creatorProfileId: params.creatorProfileId,
          projectId: task.projectId,
          taskType,
          input: task.inputJson as Prisma.InputJsonValue,
        });

        return {
          ...task,
          outputJson,
        };
      })
    )
  ).filter(
    (
      task
    ): task is WaitingTask & {
      outputJson: Prisma.InputJsonValue;
    } => task !== null
  );

  return prisma.$transaction(async (tx) => {
    const results: Array<{
      id: string;
      status: string;
      approvedBy: string | null;
      approvedAt: Date | null;
      outputJson: Prisma.JsonValue;
      updatedAt: Date;
    }> = [];

    for (const task of preparedTasks) {
      const updated = await tx.agentTask.update({
        where: { id: task.id },
        data: {
          status: "DONE",
          approvedBy: params.actorAddress,
          approvedAt: now,
          outputJson: task.outputJson,
          updatedAt: now,
        },
        select: {
          id: true,
          status: true,
          approvedBy: true,
          approvedAt: true,
          outputJson: true,
          updatedAt: true,
        },
      });

      await tx.agentTaskAuditLog.create({
        data: {
          agentTaskId: task.id,
          creatorProfileId: params.creatorProfileId,
          projectId: task.projectId,
          action: AGENT_TASK_AUDIT_ACTION.APPROVED,
          actorAddress: params.actorAddress,
          metaJson: buildDecisionAuditMeta({
            taskType: task.taskType,
            note: params.note,
          }),
          createdAt: now,
        },
      });

      // Auto-post when the task was created with autoPost: true
      if (shouldAutoPost(task.inputJson)) {
        await createAutoPost(tx, {
          creatorProfileId: params.creatorProfileId,
          projectId: task.projectId,
          taskType: task.taskType,
          outputJson: updated.outputJson,
          now,
        });
      }

      results.push(updated);
    }

    return results;
  });
}
