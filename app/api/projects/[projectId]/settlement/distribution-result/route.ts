import { NextRequest, NextResponse } from "next/server";
import { handleProjectSettlementDistributionResultPost } from "@/lib/projectSettlementDistributionResultApi";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  return handleProjectSettlementDistributionResultPost(req, ctx);
}
