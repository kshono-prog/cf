import { NextRequest, NextResponse } from "next/server";
import {
  corsReadOnlyMethods,
  optionsPreflight,
  withCorsResponse,
} from "@/app/api/_lib/cors";
import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import {
  toBigIntOrThrow,
  toNonEmptyString,
} from "@/lib/api/guards";
import { requireOwnerSessionFromSearchParams } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";

function ok<T extends Record<string, unknown>>(
  req: NextRequest,
  data: T
): NextResponse<{ ok: true } & T> {
  return withCorsResponse(req, okJson(data), undefined, corsReadOnlyMethods);
}

function err(req: NextRequest, code: string, status: number): NextResponse {
  return withCorsResponse(req, errJson(code, status), undefined, corsReadOnlyMethods);
}

export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  return optionsPreflight(req, undefined, corsReadOnlyMethods);
}

type SnapshotRow = {
  platform: string;
  capturedAt: Date;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
};

function toDays(v: string | null): number {
  if (!v) return 7;
  const n = Number(v);
  if (!Number.isFinite(n)) return 7;
  const i = Math.trunc(n);
  if (i < 1) return 1;
  if (i > 30) return 30;
  return i;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toSafeInt(v: number | null): number {
  if (typeof v !== "number") return 0;
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.trunc(v));
}

async function resolveCreatorId(address: string): Promise<bigint | null> {
  const creator = await prisma.creatorProfile.findUnique({
    where: { walletAddress: address.toLowerCase() },
    select: { id: true },
  });
  return creator?.id ?? null;
}

function aggregateDaily(rows: SnapshotRow[]) {
  const daily = new Map<
    string,
    {
      views: number;
      likes: number;
      comments: number;
      shares: number;
      count: number;
      byPlatform: Map<string, { views: number; interactions: number; count: number }>;
    }
  >();

  for (const row of rows) {
    const key = dayKey(row.capturedAt);
    const item = daily.get(key) ?? {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      count: 0,
      byPlatform: new Map<string, { views: number; interactions: number; count: number }>(),
    };

    const views = toSafeInt(row.views);
    const likes = toSafeInt(row.likes);
    const comments = toSafeInt(row.comments);
    const shares = toSafeInt(row.shares);

    item.views += views;
    item.likes += likes;
    item.comments += comments;
    item.shares += shares;
    item.count += 1;

    const p = item.byPlatform.get(row.platform) ?? { views: 0, interactions: 0, count: 0 };
    p.views += views;
    p.interactions += likes + comments + shares;
    p.count += 1;
    item.byPlatform.set(row.platform, p);

    daily.set(key, item);
  }

  const sortedKeys = Array.from(daily.keys()).sort((a, b) => a.localeCompare(b));

  return sortedKeys.map((key) => {
    const item = daily.get(key)!;
    const interactions = item.likes + item.comments + item.shares;
    const rate = item.views > 0 ? interactions / item.views : 0;

    const topPlatform = Array.from(item.byPlatform.entries())
      .map(([platform, stat]) => ({
        platform,
        count: stat.count,
        rate: stat.views > 0 ? stat.interactions / stat.views : 0,
      }))
      .sort((a, b) => b.rate - a.rate)[0] ?? null;

    return {
      date: key,
      count: item.count,
      views: item.views,
      likes: item.likes,
      comments: item.comments,
      shares: item.shares,
      interactionRate: rate,
      topPlatform: topPlatform
        ? {
            platform: topPlatform.platform,
            rate: topPlatform.rate,
            count: topPlatform.count,
          }
        : null,
    };
  });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);

    const ownerSession = await requireOwnerSessionFromSearchParams(
      req,
      searchParams
    );
    if (!ownerSession.ok) {
      return withCorsResponse(
        req,
        ownerSession.response,
        undefined,
        corsReadOnlyMethods
      );
    }

    const creatorId = await resolveCreatorId(ownerSession.address);
    if (!creatorId) return err(req, "CREATOR_NOT_FOUND", 404);

    const projectIdRaw = toNonEmptyString(searchParams.get("projectId"));
    let projectId: bigint | null = null;
    if (projectIdRaw) {
      try {
        projectId = toBigIntOrThrow(projectIdRaw, "PROJECT_ID_INVALID");
      } catch {
        return err(req, "PROJECT_ID_INVALID", 400);
      }
    }

    const days = toDays(searchParams.get("days"));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = (await prisma.contentMetricSnapshot.findMany({
      where: {
        creatorProfileId: creatorId,
        ...(projectId ? { projectId } : {}),
        capturedAt: { gte: since },
      },
      orderBy: { capturedAt: "asc" },
      select: {
        platform: true,
        capturedAt: true,
        views: true,
        likes: true,
        comments: true,
        shares: true,
      },
    })) as SnapshotRow[];

    const daily = aggregateDaily(rows);

    return ok(req, {
      days,
      from: since.toISOString(),
      to: new Date().toISOString(),
      count: rows.length,
      projectId: projectId?.toString() ?? null,
      daily,
    });
  } catch (e) {
    console.error("METRICS_TRENDS_GET_FAILED", e);
    return err(req, "METRICS_TRENDS_GET_FAILED", 500);
  }
}
