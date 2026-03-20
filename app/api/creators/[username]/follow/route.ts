import { NextRequest, NextResponse } from "next/server";

import { errJson } from "@/lib/api/responses";
import { isRecord, toAddressOrNull } from "@/lib/api/guards";
import {
  fetchCreatorFollowSummaryByUsername,
  mutateCreatorFollowByUsername,
} from "@/lib/followApi";
import {
  getOptionalOwnerSessionAddress,
  requireOwnerSession,
} from "@/lib/ownerAuthSession";

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
    return NextResponse.json(response.body, { status: response.status });
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
    const ownerSession = await requireOwnerSession(req, viewerAddress);
    if (!ownerSession.ok) return ownerSession.response;

    const response = await mutateCreatorFollowByUsername({
      action: "follow",
      username,
      viewerAddress: ownerSession.address,
    });
    return NextResponse.json(response.body, { status: response.status });
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
    const ownerSession = await requireOwnerSession(req, viewerAddress);
    if (!ownerSession.ok) return ownerSession.response;

    const response = await mutateCreatorFollowByUsername({
      action: "unfollow",
      username,
      viewerAddress: ownerSession.address,
    });
    return NextResponse.json(response.body, { status: response.status });
  } catch (error) {
    console.error("CREATOR_FOLLOW_DELETE_FAILED", error);
    return errJson("CREATOR_FOLLOW_DELETE_FAILED", 500);
  }
}
