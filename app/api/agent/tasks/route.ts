import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  toAddressOrNull,
  toBigIntOrThrow,
  toNonEmptyString,
} from "@/lib/api/guards";
import {
  buildTranslationsOutput,
  parseTranslationTaskInput,
} from "@/lib/translation";

export const dynamic = "force-dynamic";

type TaskType = "ANALYZE" | "PROPOSE" | "TRANSLATE";
type TaskStatus = "QUEUED" | "RUNNING" | "WAITING_APPROVAL" | "DONE" | "FAILED";

const ALLOWED_TASK_TYPES: readonly TaskType[] = [
  "ANALYZE",
  "PROPOSE",
  "TRANSLATE",
] as const;
const ALLOWED_TASK_STATUS: readonly TaskStatus[] = [
  "QUEUED",
  "RUNNING",
  "WAITING_APPROVAL",
  "DONE",
  "FAILED",
] as const;

type PostBody = {
  address?: unknown;
  projectId?: unknown;
  taskType?: unknown;
  input?: unknown;
  requiresApproval?: unknown;
};

function toTaskType(v: unknown): TaskType | null {
  if (typeof v !== "string") return null;
  return ALLOWED_TASK_TYPES.includes(v as TaskType) ? (v as TaskType) : null;
}

function toTaskStatus(v: unknown): TaskStatus | null {
  if (typeof v !== "string") return null;
  return ALLOWED_TASK_STATUS.includes(v as TaskStatus)
    ? (v as TaskStatus)
    : null;
}

function toProjectIdOrNull(v: unknown): bigint | null {
  const s = toNonEmptyString(v);
  if (!s) return null;
  return toBigIntOrThrow(s, "PROJECT_ID_INVALID");
}

function isJsonValueForStorage(v: unknown): boolean {
  if (v === null) return true;
  if (typeof v === "string") return true;
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "boolean") return true;
  if (Array.isArray(v)) return true;
  return isRecord(v);
}

function defaultOutput(
  taskType: TaskType,
  input: Prisma.InputJsonValue
): Prisma.InputJsonValue {
  if (taskType === "ANALYZE") {
    return {
      summary: "直近の投稿頻度と反応率を比較し、次の投稿タイミング候補を提示します。",
      nextActions: [
        "直近3投稿の共通タグを抽出",
        "コメント率の高い投稿を再編集して再投稿",
      ],
      basedOn: isJsonValueForStorage(input) ? input : {},
    };
  }

  if (taskType === "TRANSLATE") {
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
        "まず metrics収集 を実行してください",
        "SNS連携アカウントを追加してください",
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
    interactionRate: stat.views > 0 ? (stat.likes + stat.comments + stat.shares) / stat.views : 0,
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
    prev && curr && prev.views > 0
      ? (curr.views - prev.views) / prev.views
      : 0;
  const rateDeltaPct =
    prev && curr && prev.interactionRate > 0
      ? (curr.interactionRate - prev.interactionRate) / prev.interactionRate
      : 0;

  const trendActionByViews =
    viewsDeltaPct <= -0.2
      ? "再生数が減少中のため、投稿時間帯を変更してAB比較を実施"
      : viewsDeltaPct >= 0.2
      ? "再生数が伸長中のため、同フォーマットを短期間で再現"
      : "再生数は横ばいのため、サムネ/冒頭3秒の改善を優先";

  const trendActionByRate =
    rateDeltaPct <= -0.15
      ? "反応率が低下しているため、コメント誘導CTAを明示"
      : rateDeltaPct >= 0.15
      ? "反応率が上昇しているため、同テーマのシリーズ化を検討"
      : "反応率は安定しているため、投稿頻度の最適化を優先";

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
      trendActionByViews,
      trendActionByRate,
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

  const proposals = [
    top
      ? `${top.platform}向けに、反応率の高い形式を再利用した短尺投稿を3本作成`
      : "最も反応率の高い投稿形式を再利用して短尺投稿を3本作成",
    "コメント率の高い投稿テーマを深掘りし、次回配信タイトルに反映",
    "48時間間隔で告知→本編→振り返りの3連続投稿を試行して比較",
  ];

  return {
    summary: `直近${rows.length}件の反応データから、実行優先度の高い企画案を生成しました。`,
    proposals,
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

async function buildTaskOutput(params: {
  creatorProfileId: bigint;
  projectId: bigint | null;
  taskType: TaskType;
  input: Prisma.InputJsonValue;
}): Promise<Prisma.InputJsonValue> {
  if (params.taskType === "ANALYZE") {
    return buildAnalyzeOutput({
      creatorProfileId: params.creatorProfileId,
      projectId: params.projectId,
      input: params.input,
    });
  }
  if (params.taskType === "PROPOSE") {
    return buildProposeOutput({
      creatorProfileId: params.creatorProfileId,
      projectId: params.projectId,
      input: params.input,
    });
  }
  return defaultOutput(params.taskType, params.input);
}

async function resolveCreatorByAddress(address: string): Promise<{ id: bigint } | null> {
  return prisma.creatorProfile.findUnique({
    where: { walletAddress: address.toLowerCase() },
    select: { id: true },
  });
}

function toRequiresApproval(v: unknown): boolean {
  return v === true;
}

function toAction(v: unknown): "APPROVE" | "REJECT" | null {
  if (v === "APPROVE" || v === "REJECT") return v;
  return null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const address = toAddressOrNull(searchParams.get("address"));
    if (!address) return errJson("ADDRESS_REQUIRED", 400);
    const status = toTaskStatus(searchParams.get("status"));
    if (searchParams.get("status") && !status) {
      return errJson("STATUS_INVALID", 400);
    }

    const creator = await resolveCreatorByAddress(address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const rows = await prisma.agentTask.findMany({
      where: {
        creatorProfileId: creator.id,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 30,
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
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            action: true,
            actorAddress: true,
            metaJson: true,
            createdAt: true,
          },
        },
      },
    });

    return okJson({
      tasks: rows.map((row) => ({
        id: row.id,
        projectId: row.projectId?.toString() ?? null,
        taskType: row.taskType,
        status: row.status,
        requestedBy: row.requestedBy,
        approvedBy: row.approvedBy,
        approvedAt: row.approvedAt?.toISOString() ?? null,
        input: row.inputJson,
        output: row.outputJson,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        auditLogs: row.auditLogs.map((log) => ({
          id: log.id,
          action: log.action,
          actorAddress: log.actorAddress,
          meta: log.metaJson,
          createdAt: log.createdAt.toISOString(),
        })),
      })),
      count: rows.length,
      status: status ?? null,
    });
  } catch (e) {
    console.error("AGENT_TASKS_GET_FAILED", e);
    return errJson("AGENT_TASKS_GET_FAILED", 500);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const body = raw as PostBody;

    const address = toAddressOrNull(body.address);
    if (!address) return errJson("ADDRESS_REQUIRED", 400);

    const taskType = toTaskType(body.taskType);
    if (!taskType) return errJson("TASK_TYPE_INVALID", 400);

    let projectId: bigint | null = null;
    try {
      projectId = toProjectIdOrNull(body.projectId);
    } catch {
      return errJson("PROJECT_ID_INVALID", 400);
    }

    const creator = await resolveCreatorByAddress(address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    if (projectId) {
      const ownedProject = await prisma.project.findFirst({
        where: { id: projectId, creatorProfileId: creator.id },
        select: { id: true },
      });
      if (!ownedProject) return errJson("PROJECT_NOT_FOUND_OR_FORBIDDEN", 404);
    }

    const inputJson = (isJsonValueForStorage(body.input)
      ? body.input
      : {}) as Prisma.InputJsonValue;
    const requiresApproval = toRequiresApproval(body.requiresApproval);
    const outputJson = await buildTaskOutput({
      creatorProfileId: creator.id,
      projectId,
      taskType,
      input: inputJson,
    });
    const now = new Date();

    const row = await prisma.$transaction(async (tx) => {
      const created = await tx.agentTask.create({
        data: {
          creatorProfileId: creator.id,
          projectId,
          taskType,
          status: requiresApproval ? "WAITING_APPROVAL" : "DONE",
          inputJson,
          outputJson,
          requestedBy: address,
          approvedBy: requiresApproval ? null : address,
          approvedAt: requiresApproval ? null : now,
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
          creatorProfileId: creator.id,
          projectId,
          action: requiresApproval ? "TASK_CREATED_WAITING_APPROVAL" : "TASK_CREATED_DONE",
          actorAddress: address,
          metaJson: {
            taskType,
            requiresApproval,
          } as Prisma.InputJsonValue,
          createdAt: now,
        },
      });

      return created;
    });

    return okJson({
      task: {
        id: row.id,
        projectId: row.projectId?.toString() ?? null,
        taskType: row.taskType,
        status: row.status,
        requestedBy: row.requestedBy,
        approvedBy: row.approvedBy,
        approvedAt: row.approvedAt?.toISOString() ?? null,
        input: row.inputJson,
        output: row.outputJson,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("AGENT_TASKS_POST_FAILED", e);
    return errJson("AGENT_TASKS_POST_FAILED", 500);
  }
}

type PatchBody = {
  address?: unknown;
  taskId?: unknown;
  taskIds?: unknown;
  action?: unknown;
  note?: unknown;
};
const MAX_BATCH_TASK_IDS = 50;

function parseTaskIds(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const item of v) {
    const id = toNonEmptyString(item);
    if (!id) return null;
    out.push(id);
  }
  return out;
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const body = raw as PatchBody;
    const address = toAddressOrNull(body.address);
    if (!address) return errJson("ADDRESS_REQUIRED", 400);

    const taskId = toNonEmptyString(body.taskId);
    const taskIdsRaw = body.taskIds == null ? null : parseTaskIds(body.taskIds);
    if (body.taskIds != null && !taskIdsRaw) return errJson("TASK_IDS_INVALID", 400);
    if (taskId && taskIdsRaw && taskIdsRaw.length > 0) {
      return errJson("TASK_ID_CONFLICT", 400);
    }
    const targetTaskIds = taskId
      ? [taskId]
      : taskIdsRaw && taskIdsRaw.length > 0
      ? Array.from(new Set(taskIdsRaw))
      : [];
    if (targetTaskIds.length === 0) return errJson("TASK_ID_REQUIRED", 400);
    if (targetTaskIds.length > MAX_BATCH_TASK_IDS) {
      return errJson("TASK_IDS_TOO_MANY", 400);
    }

    const action = toAction(body.action);
    if (!action) return errJson("ACTION_INVALID", 400);
    const note = toNonEmptyString(body.note);
    if (note && note.length > 300) return errJson("NOTE_TOO_LONG", 400);
    if (action === "REJECT" && !note) return errJson("NOTE_REQUIRED_FOR_REJECT", 400);

    const creator = await resolveCreatorByAddress(address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const tasks = await prisma.agentTask.findMany({
      where: {
        id: { in: targetTaskIds },
        creatorProfileId: creator.id,
      },
      select: {
        id: true,
        projectId: true,
        taskType: true,
        status: true,
        inputJson: true,
      },
    });

    if (targetTaskIds.length === 1) {
      const only = tasks[0];
      if (!only) return errJson("TASK_NOT_FOUND", 404);
      if (only.status !== "WAITING_APPROVAL") {
        return errJson("TASK_NOT_WAITING_APPROVAL", 409);
      }
    }

    const waitingTasks = tasks.filter((task) => task.status === "WAITING_APPROVAL");
    if (waitingTasks.length === 0) return errJson("NO_WAITING_APPROVAL_TASKS", 409);

    const now = new Date();

    if (action === "REJECT") {
      const rejected = await prisma.$transaction(async (tx) => {
        const results: Array<{
          id: string;
          status: string;
          approvedBy: string | null;
          approvedAt: Date | null;
          updatedAt: Date;
        }> = [];
        for (const task of waitingTasks) {
          const updated = await tx.agentTask.update({
            where: { id: task.id },
            data: {
              status: "FAILED",
              approvedBy: address,
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
              creatorProfileId: creator.id,
              projectId: task.projectId,
              action: "TASK_REJECTED",
              actorAddress: address,
              metaJson: {
                taskType: task.taskType,
                note: note ?? null,
              } as Prisma.InputJsonValue,
              createdAt: now,
            },
          });
          results.push(updated);
        }
        return results;
      });

      if (targetTaskIds.length === 1) {
        const item = rejected[0];
        return okJson({
          task: {
            id: item.id,
            status: item.status,
            approvedBy: item.approvedBy,
            approvedAt: item.approvedAt?.toISOString() ?? null,
            updatedAt: item.updatedAt.toISOString(),
          },
        });
      }

      return okJson({
        batch: true,
        action,
        requested: targetTaskIds.length,
        updatedCount: rejected.length,
        updatedTaskIds: rejected.map((item) => item.id),
        skippedTaskIds: targetTaskIds.filter(
          (id) => !rejected.some((item) => item.id === id)
        ),
      });
    }

    const approved = await prisma.$transaction(async (tx) => {
      const results: Array<{
        id: string;
        status: string;
        approvedBy: string | null;
        approvedAt: Date | null;
        outputJson: Prisma.JsonValue;
        updatedAt: Date;
      }> = [];

      for (const task of waitingTasks) {
        const taskType = toTaskType(task.taskType);
        if (!taskType) continue;

        const outputJson = await buildTaskOutput({
          creatorProfileId: creator.id,
          projectId: task.projectId,
          taskType,
          input: task.inputJson as Prisma.InputJsonValue,
        });

        const updated = await tx.agentTask.update({
          where: { id: task.id },
          data: {
            status: "DONE",
            approvedBy: address,
            approvedAt: now,
            outputJson,
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
            creatorProfileId: creator.id,
            projectId: task.projectId,
            action: "TASK_APPROVED",
            actorAddress: address,
            metaJson: {
              taskType: task.taskType,
              note: note ?? null,
            } as Prisma.InputJsonValue,
            createdAt: now,
          },
        });

        results.push(updated);
      }

      return results;
    });

    if (targetTaskIds.length === 1) {
      const item = approved[0];
      return okJson({
        task: {
          id: item.id,
          status: item.status,
          approvedBy: item.approvedBy,
          approvedAt: item.approvedAt?.toISOString() ?? null,
          output: item.outputJson,
          updatedAt: item.updatedAt.toISOString(),
        },
      });
    }

    return okJson({
      batch: true,
      action,
      requested: targetTaskIds.length,
      updatedCount: approved.length,
      updatedTaskIds: approved.map((item) => item.id),
      skippedTaskIds: targetTaskIds.filter(
        (id) => !approved.some((item) => item.id === id)
      ),
    });
  } catch (e) {
    console.error("AGENT_TASKS_PATCH_FAILED", e);
    return errJson("AGENT_TASKS_PATCH_FAILED", 500);
  }
}
