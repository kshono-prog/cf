import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  toBigIntOrThrow,
  toBool,
  toNonEmptyString,
} from "@/lib/api/guards";
import { requireOwnerSessionFromBody } from "@/lib/ownerAuthSession";

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
  postedAt: Date | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  rawJson: Prisma.InputJsonValue;
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
    const ownerSession = await requireOwnerSessionFromBody(req, body);
    if (!ownerSession.ok) return ownerSession.response;

    let projectId: bigint | null = null;
    try {
      projectId = toProjectIdOrNull(body.projectId);
    } catch {
      return errJson("PROJECT_ID_INVALID", 400);
    }

    const dryRun = toBool(body.dryRun);

    const creator = await resolveCreatorByAddress(ownerSession.address);
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

    const [posts, contributionAgg] = await Promise.all([
      prisma.post.findMany({
        where: {
          creatorProfileId: creator.id,
          ...(projectId ? { projectId } : {}),
          status: { in: ["PUBLISHED", "DRAFT"] },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          body: true,
          status: true,
          visibility: true,
          mediaUrl: true,
          likeCount: true,
          replyCount: true,
          tipCount: true,
          aiGenerated: true,
          createdAt: true,
          analytics: {
            select: {
              impressionCount: true,
              profileClickCount: true,
              engagementScore: true,
              updatedAt: true,
            },
          },
        },
      }),
      prisma.contribution.aggregate({
        where: {
          ...(projectId ? { projectId } : {}),
          status: "CONFIRMED",
        },
        _count: { _all: true },
      }),
    ]);

    if (posts.length === 0) {
      return okJson({
        collected: 0,
        snapshots: [],
        note: "NO_CREATOR_POSTS",
      });
    }

    const baseCount = contributionAgg._count._all;
    const candidates: CandidateSnapshot[] = posts.map((post, idx) => {
      const impressions = post.analytics?.impressionCount ?? 0;
      const profileClicks = post.analytics?.profileClickCount ?? 0;
      const views = Math.max(
        impressions,
        (post.likeCount + post.replyCount + post.tipCount + baseCount + idx + 1) * 10
      );

      return {
        platform: "Creator Founding",
        contentExternalId: `post:${post.id}`,
        contentUrl: post.mediaUrl ?? `/${creator.username}`,
        postedAt: post.createdAt,
        views,
        likes: post.likeCount,
        comments: post.replyCount,
        shares: 0,
        rawJson: {
          source: "creator-founding-posts",
          postId: post.id,
          postStatus: post.status,
          visibility: post.visibility,
          aiGenerated: post.aiGenerated,
          profileClickCount: profileClicks,
          tipCount: post.tipCount,
          baseConfirmedContributionCount: baseCount,
        } as Prisma.InputJsonValue,
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
            socialConnectionId: null,
            platform: candidate.platform,
            contentExternalId: candidate.contentExternalId,
            contentUrl: candidate.contentUrl,
            postedAt: candidate.postedAt,
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
