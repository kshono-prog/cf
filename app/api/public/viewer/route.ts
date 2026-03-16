import { NextRequest, NextResponse } from "next/server";

import { getMeStatusByAddress } from "@/lib/mypageMe";
import { normalizeMyPageMePayload } from "@/lib/mypageApiResponses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    if (!address) {
      return NextResponse.json({
        ok: true,
        hasUser: false,
        hasCreator: false,
        user: null,
        creator: null,
        projectId: null,
        projectIdsByCurrency: {
          JPYC: null,
          USDC: null,
        },
      });
    }

    const me = await getMeStatusByAddress(address);
    return NextResponse.json({
      ok: true,
      ...normalizeMyPageMePayload(me),
    });
  } catch (error) {
    console.error("PUBLIC_VIEWER_GET_FAILED", error);
    return NextResponse.json(
      { ok: false, error: "PUBLIC_VIEWER_GET_FAILED" },
      { status: 500 }
    );
  }
}
