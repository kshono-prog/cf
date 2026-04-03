import { NextRequest, NextResponse } from "next/server";

import {
  handleOwnerAuthSessionDelete,
  handleOwnerAuthSessionGet,
  handleOwnerAuthSessionPost,
} from "@/lib/ownerAuthApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handleOwnerAuthSessionGet(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handleOwnerAuthSessionPost(req);
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  return handleOwnerAuthSessionDelete(req);
}
