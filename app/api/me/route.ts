// app/api/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { errJson, okJson } from "@/lib/api/responses";
import { getMeStatusByAddress } from "@/lib/mypageMe";
import {
  type MyPageMePayload,
  normalizeMyPageMePayload,
} from "@/lib/mypageApiResponses";
import { requireOwnerSessionFromSearchParams } from "@/lib/ownerAuthSession";

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
  return okJson({
    hasUser: false,
    hasCreator: false,
    user: null,
    creator: null,
    projectId: null,
    projectIdsByCurrency: { JPYC: null, USDC: null },
  }) as NextResponse<MeOk>;
}

/* =========================
   GET /api/me?address=0x...
========================= */

export async function GET(req: NextRequest): Promise<NextResponse<MeRes>> {
  const { searchParams } = new URL(req.url);
  const ownerSession = await requireOwnerSessionFromSearchParams(
    req,
    searchParams
  );
  if (!ownerSession.ok) {
    return ownerSession.response as NextResponse<MeRes>;
  }

  try {
    const me = await getMeStatusByAddress(ownerSession.address);
    if (!me.hasUser) return okEmpty();
    return okJson(normalizeMyPageMePayload(me)) as NextResponse<MeOk>;
  } catch (e: unknown) {
    console.error("ME_PRISMA_ERROR", e);
    return errJson(
      "ME_PRISMA_ERROR",
      500,
      e instanceof Error ? e.message : String(e)
    ) as NextResponse<MeErr>;
  }
}
