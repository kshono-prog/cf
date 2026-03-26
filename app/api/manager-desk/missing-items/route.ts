import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import { getMissingItems } from "@/lib/operations/missingItems";
import { requireOwnerSessionFromSearchParams } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const ownerSession = await requireOwnerSessionFromSearchParams(
      req,
      searchParams
    );
    if (!ownerSession.ok) return ownerSession.response;

    const data = await getMissingItems({
      managerWalletAddress: ownerSession.address,
    });

    return okJson(data);
  } catch (error) {
    console.error("MANAGER_DESK_MISSING_ITEMS_GET_FAILED", error);
    return errJson("MANAGER_DESK_MISSING_ITEMS_GET_FAILED", 500);
  }
}
