/* app/api/purposes/[purposeId]/allocations/route.ts */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Allocation } from "@prisma/client";
import { requireOwnerSession } from "@/lib/ownerAuthSession";
import { resolvePurposeOwnerAddress } from "@/lib/ownerScopedResources";
import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  toBigIntOrThrow,
  toOptionalString,
} from "@/lib/api/guards";

export const dynamic = "force-dynamic";

type Params = { purposeId: string };

type RecipientType = "ADDRESS" | "CONTRACT";
type AmountType = "FIXED" | "RATIO_BPS";

function toOptionalNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function normalizeRecipientType(v: unknown): RecipientType | undefined {
  const s = typeof v === "string" ? v : undefined;
  if (!s) return undefined;
  if (s === "ADDRESS" || s === "CONTRACT") return s;
  return undefined;
}

function normalizeAmountType(v: unknown): AmountType | undefined {
  const s = typeof v === "string" ? v : undefined;
  if (!s) return undefined;
  if (s === "FIXED" || s === "RATIO_BPS") return s;
  return undefined;
}

function serializeAllocation(a: Allocation) {
  return {
    ...a,
    id: a.id.toString(),
    purposeId: a.purposeId.toString(),
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { purposeId: purposeIdStr } = await ctx.params;
    const purposeId = toBigIntOrThrow(purposeIdStr, "PURPOSE_ID_INVALID");

    const ownerLookup = await resolvePurposeOwnerAddress(purposeId);
    if (!ownerLookup.found) {
      return errJson("PURPOSE_NOT_FOUND", 404);
    }
    if (!ownerLookup.ownerAddress) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
    }

    const ownerSession = await requireOwnerSession(req, ownerLookup.ownerAddress);
    if (!ownerSession.ok) {
      return ownerSession.response;
    }

    const rows = await prisma.allocation.findMany({
      where: { purposeId },
      orderBy: [{ createdAt: "asc" }],
    });

    return okJson({
      allocations: rows.map(serializeAllocation),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PURPOSE_ID_INVALID") {
      return errJson("PURPOSE_ID_INVALID", 400);
    }
    console.error("ALLOCATIONS_GET_FAILED", e);
    return errJson("ALLOCATIONS_GET_FAILED", 500);
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { purposeId: purposeIdStr } = await ctx.params;
    const purposeId = toBigIntOrThrow(purposeIdStr, "PURPOSE_ID_INVALID");

    const ownerLookup = await resolvePurposeOwnerAddress(purposeId);
    if (!ownerLookup.found) {
      return errJson("PURPOSE_NOT_FOUND", 404);
    }
    if (!ownerLookup.ownerAddress) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
    }

    const ownerSession = await requireOwnerSession(req, ownerLookup.ownerAddress);
    if (!ownerSession.ok) {
      return ownerSession.response;
    }

    const json = (await req.json().catch(() => null)) as unknown;
    if (!isRecord(json)) {
      return errJson("INVALID_JSON", 400);
    }

    // 必須
    const recipientAddress = toOptionalString(json.recipientAddress);
    if (!recipientAddress) {
      return errJson("RECIPIENT_ADDRESS_REQUIRED", 400);
    }

    // 任意（既定値あり）
    const recipientType: RecipientType =
      normalizeRecipientType(json.recipientType) ?? "ADDRESS";
    const amountType: AmountType =
      normalizeAmountType(json.amountType) ?? "FIXED";

    // FIXED: amountJpyc が推奨
    const amountJpycRaw = toOptionalNumber(json.amountJpyc);
    const amountJpyc =
      typeof amountJpycRaw === "number" ? Math.trunc(amountJpycRaw) : undefined;

    // RATIO_BPS: ratioBps
    const ratioBpsRaw = toOptionalNumber(json.ratioBps);
    const ratioBps =
      typeof ratioBpsRaw === "number" ? Math.trunc(ratioBpsRaw) : undefined;

    // 任意
    const chainIdRaw = toOptionalNumber(json.chainId);
    const chainId =
      typeof chainIdRaw === "number" ? Math.trunc(chainIdRaw) : undefined;

    const l1Key = toOptionalString(json.l1Key)?.trim() || undefined;

    // ---- バリデーション（DBのCHECKに合わせて事前に弾く）----
    if (amountType === "FIXED") {
      if (amountJpyc == null) {
        return errJson("AMOUNT_JPYC_REQUIRED_FOR_FIXED", 400);
      }
      if (amountJpyc < 0) {
        return errJson("AMOUNT_JPYC_RANGE", 400);
      }
    }

    if (amountType === "RATIO_BPS") {
      if (ratioBps == null) {
        return errJson("RATIO_BPS_REQUIRED_FOR_RATIO", 400);
      }
      if (ratioBps < 0 || ratioBps > 10000) {
        return errJson("RATIO_BPS_RANGE", 400);
      }
    }

    const now = new Date();

    const created = await prisma.allocation.create({
      data: {
        purposeId,
        recipientType,
        recipientAddress,
        amountType,
        amountJpyc: amountJpyc ?? null,
        ratioBps: ratioBps ?? null,
        chainId: chainId ?? null,
        l1Key: l1Key ?? null,
        createdAt: now,
        updatedAt: now,
      },
    });

    return okJson({
      allocation: serializeAllocation(created),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PURPOSE_ID_INVALID") {
      return errJson("PURPOSE_ID_INVALID", 400);
    }
    console.error("ALLOCATIONS_POST_FAILED", e);
    return errJson("ALLOCATIONS_POST_FAILED", 500);
  }
}
