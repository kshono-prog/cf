/* app/api/allocations/[allocationId]/route.ts */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Allocation } from "@prisma/client";
import { requireOwnerSession } from "@/lib/ownerAuthSession";
import { resolveAllocationOwnerAddress } from "@/lib/ownerScopedResources";
import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  toBigIntOrThrow,
  toOptionalString,
} from "@/lib/api/guards";

export const dynamic = "force-dynamic";

type Params = { allocationId: string };

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

// Prisma上は string なので、DB値を union に「安全に落とす」
function dbAmountTypeOrThrow(v: string): AmountType {
  const t = normalizeAmountType(v);
  if (!t) throw new Error("DB_AMOUNT_TYPE_INVALID");
  return t;
}
function dbRecipientTypeOrThrow(v: string): RecipientType {
  const t = normalizeRecipientType(v);
  if (!t) throw new Error("DB_RECIPIENT_TYPE_INVALID");
  return t;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { allocationId: idStr } = await ctx.params;
    const id = toBigIntOrThrow(idStr, "ALLOCATION_ID_INVALID");

    const ownerLookup = await resolveAllocationOwnerAddress(id);
    if (!ownerLookup.found) {
      return errJson("ALLOCATION_NOT_FOUND", 404);
    }
    if (!ownerLookup.ownerAddress) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
    }

    const ownerSession = await requireOwnerSession(req, ownerLookup.ownerAddress);
    if (!ownerSession.ok) {
      return ownerSession.response;
    }

    const row = await prisma.allocation.findUnique({ where: { id } });
    if (!row) {
      return errJson("ALLOCATION_NOT_FOUND", 404);
    }

    return okJson({
      allocation: serializeAllocation(row),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "ALLOCATION_ID_INVALID") {
      return errJson("ALLOCATION_ID_INVALID", 400);
    }
    console.error("ALLOCATION_GET_FAILED", e);
    return errJson("ALLOCATION_GET_FAILED", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { allocationId: idStr } = await ctx.params;
    const id = toBigIntOrThrow(idStr, "ALLOCATION_ID_INVALID");

    const ownerLookup = await resolveAllocationOwnerAddress(id);
    if (!ownerLookup.found) {
      return errJson("ALLOCATION_NOT_FOUND", 404);
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

    // 部分更新（入力）
    const nextRecipientType = normalizeRecipientType(json.recipientType);
    const nextRecipientAddress = toOptionalString(json.recipientAddress);
    const nextAmountType = normalizeAmountType(json.amountType);

    const amountJpycRaw = toOptionalNumber(json.amountJpyc);
    const nextAmountJpyc =
      typeof amountJpycRaw === "number" ? Math.trunc(amountJpycRaw) : undefined;

    const ratioBpsRaw = toOptionalNumber(json.ratioBps);
    const nextRatioBps =
      typeof ratioBpsRaw === "number" ? Math.trunc(ratioBpsRaw) : undefined;

    const chainIdRaw = toOptionalNumber(json.chainId);
    const nextChainId =
      typeof chainIdRaw === "number" ? Math.trunc(chainIdRaw) : undefined;

    const l1KeyRaw = toOptionalString(json.l1Key);
    const nextL1Key =
      typeof l1KeyRaw === "string" ? l1KeyRaw.trim() : undefined;

    // 現在値取得（整合性チェック用）
    const current = await prisma.allocation.findUnique({ where: { id } });
    if (!current) {
      return errJson("ALLOCATION_NOT_FOUND", 404);
    }

    // Prisma上は string → union に落とす（ここが今回の修正点）
    const currentAmountType = dbAmountTypeOrThrow(current.amountType);
    const currentRecipientType = dbRecipientTypeOrThrow(current.recipientType);

    // 最終的な amountType を union で確定
    const amountType: AmountType = nextAmountType ?? currentAmountType;

    // amountJpyc / ratioBps の「最終値」を確定してから、amountType に応じて検証
    const finalAmountJpyc =
      typeof nextAmountJpyc === "undefined"
        ? current.amountJpyc
        : nextAmountJpyc;

    const finalRatioBps =
      typeof nextRatioBps === "undefined" ? current.ratioBps : nextRatioBps;

    // recipientType も同様に union 化しておく（更新時の整合用）
    const recipientType: RecipientType =
      nextRecipientType ?? currentRecipientType;

    // バリデーション
    if (nextRecipientAddress !== undefined && !nextRecipientAddress) {
      return errJson("RECIPIENT_ADDRESS_INVALID", 400);
    }

    if (amountType === "FIXED") {
      if (finalAmountJpyc == null) {
        return errJson("AMOUNT_JPYC_REQUIRED_FOR_FIXED", 400);
      }
      if (finalAmountJpyc < 0) {
        return errJson("AMOUNT_JPYC_RANGE", 400);
      }
    }

    if (amountType === "RATIO_BPS") {
      if (finalRatioBps == null) {
        return errJson("RATIO_BPS_REQUIRED_FOR_RATIO", 400);
      }
      if (finalRatioBps < 0 || finalRatioBps > 10000) {
        return errJson("RATIO_BPS_RANGE", 400);
      }
    }

    const now = new Date();

    const updated = await prisma.allocation.update({
      where: { id },
      data: {
        // union で確定した recipientType / amountType は文字列として保存
        recipientType,
        amountType,

        ...(typeof nextRecipientAddress === "string"
          ? { recipientAddress: nextRecipientAddress }
          : {}),

        ...(typeof nextAmountJpyc !== "undefined"
          ? { amountJpyc: nextAmountJpyc }
          : {}),
        ...(typeof nextRatioBps !== "undefined"
          ? { ratioBps: nextRatioBps }
          : {}),
        ...(typeof nextChainId !== "undefined" ? { chainId: nextChainId } : {}),
        ...(typeof nextL1Key !== "undefined" ? { l1Key: nextL1Key } : {}),

        updatedAt: now,
      },
    });

    return okJson({
      allocation: serializeAllocation(updated),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);

    if (msg === "ALLOCATION_ID_INVALID") {
      return errJson("ALLOCATION_ID_INVALID", 400);
    }
    if (
      msg === "DB_AMOUNT_TYPE_INVALID" ||
      msg === "DB_RECIPIENT_TYPE_INVALID"
    ) {
      // DBが制約違反の値を持っていた場合（通常は起きない）
      return errJson(msg, 500);
    }

    console.error("ALLOCATION_PATCH_FAILED", e);
    return errJson("ALLOCATION_PATCH_FAILED", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { allocationId: idStr } = await ctx.params;
    const id = toBigIntOrThrow(idStr, "ALLOCATION_ID_INVALID");

    const ownerLookup = await resolveAllocationOwnerAddress(id);
    if (!ownerLookup.found) {
      return errJson("ALLOCATION_NOT_FOUND", 404);
    }
    if (!ownerLookup.ownerAddress) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
    }

    const ownerSession = await requireOwnerSession(req, ownerLookup.ownerAddress);
    if (!ownerSession.ok) {
      return ownerSession.response;
    }

    await prisma.allocation.delete({ where: { id } });
    return okJson({});
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "ALLOCATION_ID_INVALID") {
      return errJson("ALLOCATION_ID_INVALID", 400);
    }
    console.error("ALLOCATION_DELETE_FAILED", e);
    return errJson("ALLOCATION_DELETE_FAILED", 500);
  }
}
