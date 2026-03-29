import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { validateGrowthEventPayload } from "@/lib/growth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GrowthEventRouteResponse =
  | { ok: true }
  | { ok: false; error: string };

function ok(): NextResponse<GrowthEventRouteResponse> {
  return NextResponse.json({ ok: true });
}

function err(error: string, status = 400): NextResponse<GrowthEventRouteResponse> {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<GrowthEventRouteResponse>> {
  try {
    const raw: unknown = await request.json().catch(() => null);
    const validated = validateGrowthEventPayload(raw);

    if (!validated.ok) {
      return err(validated.error, 400);
    }

    await prisma.growthEvent.create({
      data: validated.data,
    });

    return ok();
  } catch (error) {
    console.error("GROWTH_EVENT_POST_FAILED", error);
    return err("GROWTH_EVENT_POST_FAILED", 500);
  }
}
