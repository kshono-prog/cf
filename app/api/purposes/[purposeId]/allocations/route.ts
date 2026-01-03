/* app/api/purposes/[purposeId]/allocations/route.ts */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Allocation } from "@prisma/client";

export const dynamic = "force-dynamic";

type Params = { purposeId: string };

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

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { purposeId: purposeIdStr } = await ctx.params;
    const purposeId = toBigIntOrThrow(purposeIdStr, "PURPOSE_ID_INVALID");

    const rows = await prisma.allocation.findMany({
      where: { purposeId },
      orderBy: [{ createdAt: "asc" }],
    });

    return NextResponse.json({
      ok: true,
      allocations: rows.map(serializeAllocation),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PURPOSE_ID_INVALID") {
      return NextResponse.json(
        { error: "PURPOSE_ID_INVALID" },
        { status: 400 }
      );
    }
    console.error("ALLOCATIONS_GET_FAILED", e);
    return NextResponse.json(
      { error: "ALLOCATIONS_GET_FAILED" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { purposeId: purposeIdStr } = await ctx.params;
    const purposeId = toBigIntOrThrow(purposeIdStr, "PURPOSE_ID_INVALID");

    const json = (await req.json().catch(() => null)) as unknown;
    if (!isRecord(json)) {
      return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
    }

    // 必須
    const recipientAddress = normalizeAddress(json.recipientAddress);
    if (!recipientAddress) {
      return NextResponse.json(
        { error: "RECIPIENT_ADDRESS_REQUIRED" },
        { status: 400 }
      );
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
        return NextResponse.json(
          { error: "AMOUNT_JPYC_REQUIRED_FOR_FIXED" },
          { status: 400 }
        );
      }
      if (amountJpyc < 0) {
        return NextResponse.json(
          { error: "AMOUNT_JPYC_RANGE" },
          { status: 400 }
        );
      }
    }

    if (amountType === "RATIO_BPS") {
      if (ratioBps == null) {
        return NextResponse.json(
          { error: "RATIO_BPS_REQUIRED_FOR_RATIO" },
          { status: 400 }
        );
      }
      if (ratioBps < 0 || ratioBps > 10000) {
        return NextResponse.json({ error: "RATIO_BPS_RANGE" }, { status: 400 });
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

    return NextResponse.json({
      ok: true,
      allocation: serializeAllocation(created),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PURPOSE_ID_INVALID") {
      return NextResponse.json(
        { error: "PURPOSE_ID_INVALID" },
        { status: 400 }
      );
    }
    console.error("ALLOCATIONS_POST_FAILED", e);
    return NextResponse.json(
      { error: "ALLOCATIONS_POST_FAILED" },
      { status: 500 }
    );
  }
}
