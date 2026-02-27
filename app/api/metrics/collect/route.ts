import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  toAddressOrNull,
  toBigIntOrThrow,
  toBool,
  toNonEmptyString,
} from "@/lib/api/guards";

export const dynamic = "force-dynamic";

type PostBody = {
  address?: unknown;
  projectId?: unknown;
  dryRun?: unknown;
};

type CandidateSnapshot = {
  platform: string;
  contentExternalId: string;
  contentUrl: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  rawJson: Prisma.InputJsonValue;
  socialConnectionId: string;
};

async function resolveCreatorByAddress(address: string): Promise<{
  id: bigint;
  username: string;
} | null> {
  return prisma.creatorProfile.findUnique({
    where: { walletAddress: address.toLowerCase() },
    select: { id: true, username: true },
  });
}

function toProjectIdOrNull(v: unknown): bigint | null {
  const s = toNonEmptyString(v);
  if (!s) return null;
  return toBigIntOrThrow(s, "PROJECT_ID_INVALID");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const body = raw as PostBody;

    const address = toAddressOrNull(body.address);
    if (!address) return errJson("ADDRESS_REQUIRED", 400);

    let projectId: bigint | null = null;
    try {
      projectId = toProjectIdOrNull(body.projectId);
    } catch {
      return errJson("PROJECT_ID_INVALID", 400);
    }

    const dryRun = toBool(body.dryRun);

    const creator = await resolveCreatorByAddress(address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    if (projectId) {
      const ownedProject = await prisma.project.findFirst({
        where: {
          id: projectId,
          creatorProfileId: creator.id,
        },
        select: { id: true },
      });
      if (!ownedProject) return errJson("PROJECT_NOT_FOUND_OR_FORBIDDEN", 404);
    }

    const [connections, latestVideos, contributionAgg] = await Promise.all([
      prisma.socialConnection.findMany({
        where: {
          creatorProfileId: creator.id,
          status: "ACTIVE",
        },
        select: {
          id: true,
          platform: true,
          accountHandle: true,
          accountId: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.creatorYoutubeVideo.findMany({
        where: { profileId: creator.id },
        select: { url: true },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      prisma.contribution.aggregate({
        where: {
          ...(projectId ? { projectId } : {}),
          status: "CONFIRMED",
        },
        _count: { _all: true },
      }),
    ]);

    if (connections.length === 0) {
      return okJson({
        collected: 0,
        snapshots: [],
        note: "NO_ACTIVE_SOCIAL_CONNECTIONS",
      });
    }

    const baseCount = contributionAgg._count._all;

    const candidates: CandidateSnapshot[] = connections.map((conn, idx) => {
      const contentUrl = latestVideos[idx % Math.max(latestVideos.length, 1)]?.url ?? null;
      const seed = baseCount + idx + 1;

      const views = seed * 100;
      const likes = seed * 12;
      const comments = seed * 4;
      const shares = seed * 2;

      return {
        platform: conn.platform,
        contentExternalId: `${conn.platform}:${conn.accountHandle}:${Date.now().toString()}:${idx.toString()}`,
        contentUrl,
        views,
        likes,
        comments,
        shares,
        rawJson: {
          source: "internal-seed",
          accountHandle: conn.accountHandle,
          accountId: conn.accountId,
          baseConfirmedContributionCount: baseCount,
        } as Prisma.InputJsonValue,
        socialConnectionId: conn.id,
      };
    });

    if (dryRun) {
      return okJson({
        collected: candidates.length,
        snapshots: candidates,
        dryRun: true,
      });
    }

    const createdRows = await prisma.$transaction(
      candidates.map((candidate) =>
        prisma.contentMetricSnapshot.create({
          data: {
            creatorProfileId: creator.id,
            projectId,
            socialConnectionId: candidate.socialConnectionId,
            platform: candidate.platform,
            contentExternalId: candidate.contentExternalId,
            contentUrl: candidate.contentUrl,
            views: candidate.views,
            likes: candidate.likes,
            comments: candidate.comments,
            shares: candidate.shares,
            rawJson: candidate.rawJson,
          },
          select: {
            id: true,
            platform: true,
            contentExternalId: true,
            capturedAt: true,
          },
        })
      )
    );

    return okJson({
      collected: createdRows.length,
      snapshots: createdRows.map((row) => ({
        id: row.id,
        platform: row.platform,
        contentExternalId: row.contentExternalId,
        capturedAt: row.capturedAt.toISOString(),
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    console.error("METRICS_COLLECT_POST_FAILED", e);
    return errJson("METRICS_COLLECT_POST_FAILED", 500);
  }
}
