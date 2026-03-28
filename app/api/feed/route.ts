import { NextRequest, NextResponse } from "next/server";
import { errJson, okJson } from "@/lib/api/responses";
import { toBigIntOrThrow } from "@/lib/api/guards";
import {
  decodeFeedCursor,
  FEED_DEFAULT_LIMIT,
  FEED_MAX_LIMIT,
  parsePositiveInt,
} from "@/lib/social";
import { getFeedListView } from "@/lib/feedList";
import { getOptionalOwnerSessionAddress } from "@/lib/ownerAuthSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);

    const limit = parsePositiveInt(
      searchParams.get("limit"),
      FEED_DEFAULT_LIMIT,
      FEED_MAX_LIMIT
    );
    const cursor = decodeFeedCursor(searchParams.get("cursor"));
    if (searchParams.get("cursor") && !cursor) {
      return errJson("CURSOR_INVALID", 400);
    }

    const creatorUsername = searchParams.get("creatorUsername")?.trim() ?? null;
    const creatorIdRaw = searchParams.get("creatorId");
    const projectIdRaw = searchParams.get("projectId");
    const viewerAddress = searchParams.get("viewerAddress");
    const authenticatedViewerAddress = viewerAddress
      ? await getOptionalOwnerSessionAddress(req, viewerAddress)
      : null;

    let creatorId: bigint | null = null;
    if (creatorIdRaw) {
      try {
        creatorId = toBigIntOrThrow(creatorIdRaw, "CREATOR_ID_INVALID");
      } catch {
        return errJson("CREATOR_ID_INVALID", 400);
      }
    }

    let projectId: bigint | null = null;
    if (projectIdRaw) {
      try {
        projectId = toBigIntOrThrow(projectIdRaw, "PROJECT_ID_INVALID");
      } catch {
        return errJson("PROJECT_ID_INVALID", 400);
      }
    }

    const result = await getFeedListView({
      limit,
      cursor,
      creatorUsername,
      creatorId,
      projectId,
      viewerAddress: authenticatedViewerAddress,
    });

    const res = okJson(result);
    if (!authenticatedViewerAddress) {
      // Anonymous requests: allow CDN and browser caching for 15 s (matches unstable_cache TTL).
      res.headers.set("Cache-Control", "public, max-age=15, stale-while-revalidate=60");
    } else {
      // Personalised (liked-by-viewer) responses: private, short-lived.
      res.headers.set("Cache-Control", "private, max-age=15");
    }
    return res;
  } catch (error) {
    console.error("FEED_GET_FAILED", error);
    return errJson("FEED_GET_FAILED", 500);
  }
}
