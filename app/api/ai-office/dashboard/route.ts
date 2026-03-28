import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import {
  toBigIntOrThrow,
  toNonEmptyString,
} from "@/lib/api/guards";
import {
  getAiOfficeDashboard,
  toAiOfficeTaskStatus,
} from "@/lib/aiOfficeDashboard";
import { requireOwnerSessionFromSearchParams } from "@/lib/ownerAuthSession";
import { isPrismaUnavailableError } from "@/lib/prismaRetry";

export const dynamic = "force-dynamic";

function toMetricLimit(v: string | null): number {
  if (!v) return 20;
  const n = Number(v);
  if (!Number.isFinite(n)) return 20;
  const i = Math.trunc(n);
  if (i < 1) return 1;
  if (i > 100) return 100;
  return i;
}

function toTrendDays(v: string | null): number {
  if (!v) return 7;
  const n = Number(v);
  if (!Number.isFinite(n)) return 7;
  const i = Math.trunc(n);
  if (i < 1) return 1;
  if (i > 30) return 30;
  return i;
}

function toTaskLimit(v: string | null): number {
  if (!v) return 30;
  const n = Number(v);
  if (!Number.isFinite(n)) return 30;
  const i = Math.trunc(n);
  if (i < 1) return 1;
  if (i > 100) return 100;
  return i;
}

function buildEmptyAiOfficeDashboard(args: {
  metricLimit: number;
  trendDays: number;
  projectId: bigint | null;
  taskStatus: ReturnType<typeof toAiOfficeTaskStatus>;
}) {
  const now = new Date().toISOString();

  return {
    creatorId: null,
    tasks: [],
    usefulness: {
      windowDays: 30,
      staleAfterHours: 72,
      createdCount: 0,
      actionableCount: 0,
      autoCompletedCount: 0,
      trackedReadyCount: 0,
      waitingApprovalCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      ignoredCount: 0,
      followThroughCount: 0,
      followThroughRate: 0,
      usedCount: 0,
      usedRate: 0,
      approvalRate: 0,
      rejectionRate: 0,
      medianDecisionHours: null,
      roleBreakdown: [],
    },
    metrics: {
      count: 0,
      limit: args.metricLimit,
      projectId: args.projectId?.toString() ?? null,
      totals: {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
      },
      snapshots: [],
    },
    content: {
      totalPosts: 0,
      publishedPosts: 0,
      draftPosts: 0,
      archivedPosts: 0,
      aiGeneratedPosts: 0,
      lastPostAt: null,
      lastPublishedAt: null,
    },
    trends: {
      days: args.trendDays,
      from: now,
      to: now,
      count: 0,
      projectId: args.projectId?.toString() ?? null,
      daily: [],
    },
    taskStatus: args.taskStatus,
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  let taskStatus: ReturnType<typeof toAiOfficeTaskStatus> = null;
  let projectId: bigint | null = null;
  let metricLimit = 20;
  let trendDays = 7;
  try {
    const { searchParams } = new URL(req.url);

    const ownerSession = await requireOwnerSessionFromSearchParams(
      req,
      searchParams
    );
    if (!ownerSession.ok) return ownerSession.response;

    const statusRaw = searchParams.get("status");
    taskStatus = toAiOfficeTaskStatus(statusRaw);
    if (statusRaw && !taskStatus) {
      return errJson("STATUS_INVALID", 400);
    }

    const projectIdRaw = toNonEmptyString(searchParams.get("projectId"));
    if (projectIdRaw) {
      try {
        projectId = toBigIntOrThrow(projectIdRaw, "PROJECT_ID_INVALID");
      } catch {
        return errJson("PROJECT_ID_INVALID", 400);
      }
    }

    metricLimit = toMetricLimit(searchParams.get("metricLimit"));
    trendDays = toTrendDays(searchParams.get("trendDays"));

    const dashboard = await getAiOfficeDashboard({
      address: ownerSession.address,
      projectId,
      taskStatus,
      metricLimit,
      trendDays,
      taskLimit: toTaskLimit(searchParams.get("taskLimit")),
    });

    if (!dashboard) return errJson("CREATOR_NOT_FOUND", 404);

    return okJson(dashboard);
  } catch (e) {
    if (isPrismaUnavailableError(e)) {
      return okJson(
        buildEmptyAiOfficeDashboard({
          metricLimit,
          trendDays,
          projectId,
          taskStatus,
        })
      );
    }
    console.error("AI_OFFICE_DASHBOARD_GET_FAILED", e);
    return errJson("AI_OFFICE_DASHBOARD_GET_FAILED", 500);
  }
}
