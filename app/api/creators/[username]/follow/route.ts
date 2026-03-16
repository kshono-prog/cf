import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { errJson, okJson } from "@/lib/api/responses";
import { isRecord, toAddressOrNull } from "@/lib/api/guards";
import {
  findTargetCreator,
  getCreatorFollowSummary,
} from "@/lib/creatorFollow";
import { findCreatorByWalletAddress } from "@/lib/social";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ username: string }>;
};

type FollowMutationBody = {
  address?: unknown;
};

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
    const payload = await getCreatorFollowSummary({
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

    const payload = await getCreatorFollowSummary({
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

    const payload = await getCreatorFollowSummary({
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
