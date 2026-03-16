import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import {
  toAddressOrNull,
  toBigIntOrThrow,
  toNonEmptyString,
} from "@/lib/api/guards";
import { requireOwnerSession } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";

function toLimit(v: string | null): number {
  if (!v) return 20;
  const n = Number(v);
  if (!Number.isFinite(n)) return 20;
  const i = Math.trunc(n);
  if (i < 1) return 1;
  if (i > 100) return 100;
  return i;
}

async function resolveCreatorId(address: string): Promise<bigint | null> {
  const creator = await prisma.creatorProfile.findUnique({
    where: { walletAddress: address.toLowerCase() },
    select: { id: true },
  });
  return creator?.id ?? null;
}

function sumInt(values: Array<number | null>): number {
  let total = 0;
  for (const value of values) {
    if (typeof value !== "number") continue;
    if (!Number.isFinite(value)) continue;
    total += Math.max(0, Math.trunc(value));
  }
  return total;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);

    const ownerSession = await requireOwnerSession(
      req,
      searchParams.get("address") ?? undefined
    );
    if (!ownerSession.ok) return ownerSession.response;

    const address = toAddressOrNull(ownerSession.address);
    if (!address) return errJson("ADDRESS_REQUIRED", 400);

    const creatorId = await resolveCreatorId(address);
    if (!creatorId) return errJson("CREATOR_NOT_FOUND", 404);

    const projectIdRaw = toNonEmptyString(searchParams.get("projectId"));
    let projectId: bigint | null = null;
    if (projectIdRaw) {
      try {
        projectId = toBigIntOrThrow(projectIdRaw, "PROJECT_ID_INVALID");
      } catch {
        return errJson("PROJECT_ID_INVALID", 400);
      }
    }

    const limit = toLimit(searchParams.get("limit"));

    const rows = await prisma.contentMetricSnapshot.findMany({
      where: {
        creatorProfileId: creatorId,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { capturedAt: "desc" },
      take: limit,
      select: {
        id: true,
        projectId: true,
        platform: true,
        contentExternalId: true,
        contentUrl: true,
        postedAt: true,
        capturedAt: true,
        views: true,
        likes: true,
        comments: true,
        shares: true,
      },
    });

    const viewsTotal = sumInt(rows.map((row) => row.views));
    const likesTotal = sumInt(rows.map((row) => row.likes));
    const commentsTotal = sumInt(rows.map((row) => row.comments));
    const sharesTotal = sumInt(rows.map((row) => row.shares));

    return okJson({
      count: rows.length,
      limit,
      projectId: projectId?.toString() ?? null,
      totals: {
        views: viewsTotal,
        likes: likesTotal,
        comments: commentsTotal,
        shares: sharesTotal,
      },
      snapshots: rows.map((row) => ({
        id: row.id,
        projectId: row.projectId?.toString() ?? null,
        platform: row.platform,
        contentExternalId: row.contentExternalId,
        contentUrl: row.contentUrl,
        postedAt: row.postedAt?.toISOString() ?? null,
        capturedAt: row.capturedAt.toISOString(),
        views: row.views,
        likes: row.likes,
        comments: row.comments,
        shares: row.shares,
      })),
    });
  } catch (e) {
    console.error("METRICS_SNAPSHOTS_GET_FAILED", e);
    return errJson("METRICS_SNAPSHOTS_GET_FAILED", 500);
  }
}
