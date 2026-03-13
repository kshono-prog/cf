import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { isRecord, toAddressOrNull } from "@/lib/api/guards";
import { findCreatorByWalletAddress } from "@/lib/social";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ username: string }>;
};

type FollowMutationBody = {
  address?: unknown;
};

type CreatorPreviewRow = {
  id: bigint;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

function serializePreview(row: CreatorPreviewRow) {
  return {
    id: row.id.toString(),
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
  };
}

async function findTargetCreator(username: string): Promise<CreatorPreviewRow | null> {
  return prisma.creatorProfile.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  });
}

async function buildFollowSummary(args: {
  username: string;
  viewerAddress: string | null;
}) {
  const creator = await findTargetCreator(args.username);
  if (!creator) return null;

  const viewer =
    args.viewerAddress != null
      ? await findCreatorByWalletAddress(args.viewerAddress)
      : null;
  const isOwner = viewer?.id === creator.id;

  const [followerCount, followingCount, followerRows, viewerFollow] =
    await Promise.all([
      prisma.creatorFollow.count({
        where: { followingProfileId: creator.id },
      }),
      prisma.creatorFollow.count({
        where: { followerProfileId: creator.id },
      }),
      prisma.creatorFollow.findMany({
        where: { followingProfileId: creator.id },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          followerProfile: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      viewer && !isOwner
        ? prisma.creatorFollow.findUnique({
            where: {
              followerProfileId_followingProfileId: {
                followerProfileId: viewer.id,
                followingProfileId: creator.id,
              },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

  return {
    creator: serializePreview(creator),
    counts: {
      followers: followerCount,
      following: followingCount,
    },
    viewer: {
      hasUser: viewer !== null,
      isOwner,
      follows: viewerFollow !== null,
    },
    followers: followerRows.map((row) => serializePreview(row.followerProfile)),
  };
}

async function readViewerAddress(req: NextRequest): Promise<string | null> {
  const raw: unknown = await req.json().catch(() => null);
  if (!isRecord(raw)) return null;

  const body = raw as FollowMutationBody;
  const address = toAddressOrNull(body.address);
  return address ? address.toLowerCase() : null;
}

export async function GET(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { username } = await context.params;
    const viewerAddress = toAddressOrNull(
      new URL(req.url).searchParams.get("viewerAddress")
    );
    const payload = await buildFollowSummary({
      username,
      viewerAddress: viewerAddress ? viewerAddress.toLowerCase() : null,
    });
    if (!payload) return errJson("CREATOR_NOT_FOUND", 404);
    return okJson(payload);
  } catch (error) {
    console.error("CREATOR_FOLLOW_GET_FAILED", error);
    return errJson("CREATOR_FOLLOW_GET_FAILED", 500);
  }
}

export async function POST(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { username } = await context.params;
    const viewerAddress = await readViewerAddress(req);
    if (!viewerAddress) return errJson("ADDRESS_REQUIRED", 400);

    const [creator, viewer] = await Promise.all([
      findTargetCreator(username),
      findCreatorByWalletAddress(viewerAddress),
    ]);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);
    if (!viewer) return errJson("VIEWER_NOT_REGISTERED", 404);
    if (viewer.id === creator.id) return errJson("CANNOT_FOLLOW_SELF", 400);

    try {
      await prisma.creatorFollow.create({
        data: {
          followerProfileId: viewer.id,
          followingProfileId: creator.id,
        },
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2002"
      ) {
        throw error;
      }
    }

    const payload = await buildFollowSummary({
      username,
      viewerAddress,
    });
    if (!payload) return errJson("CREATOR_NOT_FOUND", 404);
    return okJson(payload);
  } catch (error) {
    console.error("CREATOR_FOLLOW_POST_FAILED", error);
    return errJson("CREATOR_FOLLOW_POST_FAILED", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { username } = await context.params;
    const viewerAddress = await readViewerAddress(req);
    if (!viewerAddress) return errJson("ADDRESS_REQUIRED", 400);

    const [creator, viewer] = await Promise.all([
      findTargetCreator(username),
      findCreatorByWalletAddress(viewerAddress),
    ]);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);
    if (!viewer) return errJson("VIEWER_NOT_REGISTERED", 404);

    await prisma.creatorFollow.deleteMany({
      where: {
        followerProfileId: viewer.id,
        followingProfileId: creator.id,
      },
    });

    const payload = await buildFollowSummary({
      username,
      viewerAddress,
    });
    if (!payload) return errJson("CREATOR_NOT_FOUND", 404);
    return okJson(payload);
  } catch (error) {
    console.error("CREATOR_FOLLOW_DELETE_FAILED", error);
    return errJson("CREATOR_FOLLOW_DELETE_FAILED", 500);
  }
}
