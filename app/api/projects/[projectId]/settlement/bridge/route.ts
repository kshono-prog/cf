import { NextRequest, NextResponse } from "next/server";
import { handleProjectSettlementBridgePost } from "@/lib/projectSettlementBridgeApi";

export const dynamic = "force-dynamic";
type Params = { projectId: string };

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  return handleProjectSettlementBridgePost(req, ctx);
}
