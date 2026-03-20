import { NextRequest, NextResponse } from "next/server";
import { fetchPublicViewerByAddress } from "@/lib/publicViewerApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    const response = await fetchPublicViewerByAddress(address);
    return NextResponse.json(response.body, { status: response.status });
  } catch (error) {
    console.error("PUBLIC_VIEWER_GET_FAILED", error);
    return NextResponse.json(
      { ok: false, error: "PUBLIC_VIEWER_GET_FAILED" },
      { status: 500 }
    );
  }
}
