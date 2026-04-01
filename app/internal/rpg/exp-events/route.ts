// app/internal/rpg/exp-events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { okJson, errJson } from "@/lib/api/responses";
import { awardExp } from "@/lib/rpg/expService";
import { isRecord, toNonEmptyString } from "@/lib/api/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// This endpoint is server-internal only (no user auth)
// Callers must ensure this is only called from server-side code

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try { body = await req.json(); } catch { return errJson("RPG_400_VALIDATION_ERROR", 400, "Invalid JSON"); }
  if (!isRecord(body)) return errJson("RPG_400_VALIDATION_ERROR", 400);

  const userIdStr = toNonEmptyString(body.userId);
  const eventType = toNonEmptyString(body.eventType);
  const idempotencyKey = toNonEmptyString(body.idempotencyKey);
  const occurredAtRaw = toNonEmptyString(body.occurredAt);

  if (!userIdStr || !eventType || !idempotencyKey || !occurredAtRaw) {
    return errJson("RPG_400_VALIDATION_ERROR", 400, "userId, eventType, idempotencyKey, occurredAt required");
  }

  let creatorProfileId: bigint;
  try { creatorProfileId = BigInt(userIdStr); } catch { return errJson("RPG_400_VALIDATION_ERROR", 400, "Invalid userId"); }

  const occurredAt = new Date(occurredAtRaw);
  if (isNaN(occurredAt.getTime())) return errJson("RPG_400_VALIDATION_ERROR", 400, "Invalid occurredAt");

  const payloadJson = isRecord(body.payload) ? body.payload : {};

  try {
    const result = await awardExp({ creatorProfileId, eventType, occurredAt, idempotencyKey, payloadJson });
    return okJson(result);
  } catch (e: unknown) {
    return errJson("RPG_500_INTERNAL_ERROR", 500, e instanceof Error ? e.message : String(e));
  }
}
