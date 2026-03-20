import { NextRequest, NextResponse } from "next/server";

import { handleOwnerAuthNonceGet } from "@/lib/ownerAuthApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handleOwnerAuthNonceGet(req);
}
