/* app/api/allocations/[allocationId]/route.ts */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Allocation } from "@prisma/client";

export const dynamic = "force-dynamic";

type Params = { allocationId: string };

type RecipientType = "ADDRESS" | "CONTRACT";
type AmountType = "FIXED" | "RATIO_BPS";

function toBigIntOrThrow(v: string, code: string): bigint {
  try {
    return BigInt(v);
  } catch {
    throw new Error(code);
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toOptionalString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

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

function normalizeAddress(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s ? s : undefined;
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
  _req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { allocationId: idStr } = await ctx.params;
    const id = toBigIntOrThrow(idStr, "ALLOCATION_ID_INVALID");

    const row = await prisma.allocation.findUnique({ where: { id } });
    if (!row) {
      return NextResponse.json(
        { error: "ALLOCATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      allocation: serializeAllocation(row),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "ALLOCATION_ID_INVALID") {
      return NextResponse.json(
        { error: "ALLOCATION_ID_INVALID" },
        { status: 400 }
      );
    }
    console.error("ALLOCATION_GET_FAILED", e);
    return NextResponse.json(
      { error: "ALLOCATION_GET_FAILED" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { allocationId: idStr } = await ctx.params;
    const id = toBigIntOrThrow(idStr, "ALLOCATION_ID_INVALID");

    const json = (await req.json().catch(() => null)) as unknown;
    if (!isRecord(json)) {
      return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
    }

    // 部分更新（入力）
    const nextRecipientType = normalizeRecipientType(json.recipientType);
    const nextRecipientAddress = normalizeAddress(json.recipientAddress);
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
      return NextResponse.json(
        { error: "ALLOCATION_NOT_FOUND" },
        { status: 404 }
      );
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
      return NextResponse.json(
        { error: "RECIPIENT_ADDRESS_INVALID" },
        { status: 400 }
      );
    }

    if (amountType === "FIXED") {
      if (finalAmountJpyc == null) {
        return NextResponse.json(
          { error: "AMOUNT_JPYC_REQUIRED_FOR_FIXED" },
          { status: 400 }
        );
      }
      if (finalAmountJpyc < 0) {
        return NextResponse.json(
          { error: "AMOUNT_JPYC_RANGE" },
          { status: 400 }
        );
      }
    }

    if (amountType === "RATIO_BPS") {
      if (finalRatioBps == null) {
        return NextResponse.json(
          { error: "RATIO_BPS_REQUIRED_FOR_RATIO" },
          { status: 400 }
        );
      }
      if (finalRatioBps < 0 || finalRatioBps > 10000) {
        return NextResponse.json({ error: "RATIO_BPS_RANGE" }, { status: 400 });
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

    return NextResponse.json({
      ok: true,
      allocation: serializeAllocation(updated),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);

    if (msg === "ALLOCATION_ID_INVALID") {
      return NextResponse.json(
        { error: "ALLOCATION_ID_INVALID" },
        { status: 400 }
      );
    }
    if (
      msg === "DB_AMOUNT_TYPE_INVALID" ||
      msg === "DB_RECIPIENT_TYPE_INVALID"
    ) {
      // DBが制約違反の値を持っていた場合（通常は起きない）
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    console.error("ALLOCATION_PATCH_FAILED", e);
    return NextResponse.json(
      { error: "ALLOCATION_PATCH_FAILED" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { allocationId: idStr } = await ctx.params;
    const id = toBigIntOrThrow(idStr, "ALLOCATION_ID_INVALID");

    await prisma.allocation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "ALLOCATION_ID_INVALID") {
      return NextResponse.json(
        { error: "ALLOCATION_ID_INVALID" },
        { status: 400 }
      );
    }
    console.error("ALLOCATION_DELETE_FAILED", e);
    return NextResponse.json(
      { error: "ALLOCATION_DELETE_FAILED" },
      { status: 500 }
    );
  }
}
