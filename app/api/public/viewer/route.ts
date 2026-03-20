import { NextRequest, NextResponse } from "next/server";
import { errJson, routeJson } from "@/lib/api/responses";
import { fetchPublicViewerByAddress } from "@/lib/publicViewerApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    const response = await fetchPublicViewerByAddress(address);
    return routeJson(response);
  } catch (error) {
    console.error("PUBLIC_VIEWER_GET_FAILED", error);
    return errJson("PUBLIC_VIEWER_GET_FAILED", 500);
  }
}
