// app/api/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getMeStatusByAddress } from "@/lib/mypageMe";
import {
  type MyPageMePayload,
  normalizeMyPageMePayload,
} from "@/lib/mypageApiResponses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================
   Types (no any)
========================= */

type MeOk = {
  ok: true;
} & MyPageMePayload;

type MeErr = { ok: false; error: string; detail?: string };

type MeRes = MeOk | MeErr;

function okEmpty(): NextResponse<MeOk> {
  return NextResponse.json({
    ok: true,
    hasUser: false,
    hasCreator: false,
    user: null,
    creator: null,
    projectId: null,
    projectIdsByCurrency: { JPYC: null, USDC: null },
  });
}

function errJson(
  error: string,
  status: number,
  detail?: string
): NextResponse<MeErr> {
  return NextResponse.json({ ok: false, error, detail }, { status });
}

/* =========================
   GET /api/me?address=0x...
========================= */

export async function GET(req: NextRequest): Promise<NextResponse<MeRes>> {
  const { searchParams } = new URL(req.url);
  const addressRaw = searchParams.get("address");

  // “未接続”はエラーにしない（UI側が扱いやすい）
  if (!addressRaw) return okEmpty();

  try {
    const me = await getMeStatusByAddress(addressRaw);
    if (!me.hasUser) return okEmpty();
    return NextResponse.json({
      ok: true,
      ...normalizeMyPageMePayload(me),
    });
  } catch (e: unknown) {
    console.error("ME_PRISMA_ERROR", e);
    return errJson(
      "ME_PRISMA_ERROR",
      500,
      e instanceof Error ? e.message : String(e)
    );
  }
}
