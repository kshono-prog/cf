import { NextRequest, NextResponse } from "next/server";

import { errJson, routeJson } from "@/lib/api/responses";
import { toAddressOrNull } from "@/lib/api/guards";
import {
  fetchCreatorFollowSummaryByUsername,
  mutateCreatorFollowByUsername,
} from "@/lib/followApi";
import {
  getOptionalOwnerSessionAddress,
  requireOwnerSessionFromBody,
} from "@/lib/ownerAuthSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ username: string }>;
};

export async function GET(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { username } = await context.params;
    const requestedViewerAddress = toAddressOrNull(
      new URL(req.url).searchParams.get("viewerAddress")
    );
    const viewerAddress = requestedViewerAddress
      ? await getOptionalOwnerSessionAddress(req, requestedViewerAddress)
      : null;
    const response = await fetchCreatorFollowSummaryByUsername({
      username,
      viewerAddress,
    });
    return routeJson(response);
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
    const raw: unknown = await req.json().catch(() => null);
    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return ownerSession.response;

    const response = await mutateCreatorFollowByUsername({
      action: "follow",
      username,
      viewerAddress: ownerSession.address,
    });
    return routeJson(response);
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
    const raw: unknown = await req.json().catch(() => null);
    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return ownerSession.response;

    const response = await mutateCreatorFollowByUsername({
      action: "unfollow",
      username,
      viewerAddress: ownerSession.address,
    });
    return routeJson(response);
  } catch (error) {
    console.error("CREATOR_FOLLOW_DELETE_FAILED", error);
    return errJson("CREATOR_FOLLOW_DELETE_FAILED", 500);
  }
}
