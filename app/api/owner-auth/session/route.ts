import { NextRequest, NextResponse } from "next/server";

import { handleOwnerAuthSessionPost } from "@/lib/ownerAuthApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handleOwnerAuthSessionPost(req);
}
