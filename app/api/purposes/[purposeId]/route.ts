/* app/api/purposes/[purposeId]/route.ts */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Purpose } from "@prisma/client";
import { requireOwnerSession } from "@/lib/ownerAuthSession";
import { resolvePurposeOwnerAddress } from "@/lib/ownerScopedResources";
import { errJson, okJson } from "@/lib/api/responses";

export const dynamic = "force-dynamic";

type Params = { purposeId: string };

function toBigIntOrThrow(v: string): bigint {
  try {
    return BigInt(v);
  } catch {
    throw new Error("PURPOSE_ID_INVALID");
  }
}

function serializePurpose(p: Purpose) {
  return {
    ...p,
    id: p.id.toString(),
    projectId: p.projectId.toString(),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

type PatchBody = {
  code?: unknown;
  label?: unknown;
  description?: unknown;
  targetAmount?: unknown;
  orderIndex?: unknown;
};

function toOptionalString(v: unknown): string | undefined {
  if (typeof v === "undefined") return undefined;
  if (v === null) return "";
  if (typeof v !== "string") return "";
  return v;
}

function toOptionalNullableString(v: unknown): string | null | undefined {
  if (typeof v === "undefined") return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s ? s : null;
}

function toOptionalNullableNumber(v: unknown): number | null | undefined {
  if (typeof v === "undefined") return undefined;
  if (v === null) return null;
  if (typeof v !== "number") return undefined;
  if (!Number.isFinite(v)) return undefined;
  return v;
}

function toOptionalNumber(v: unknown): number | undefined {
  if (typeof v === "undefined") return undefined;
  if (typeof v !== "number") return undefined;
  if (!Number.isFinite(v)) return undefined;
  return v;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { purposeId: purposeIdStr } = await ctx.params;
    const purposeId = toBigIntOrThrow(purposeIdStr);

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

    const purpose = await prisma.purpose.findUnique({
      where: { id: purposeId },
    });
    if (!purpose) {
      return errJson("PURPOSE_NOT_FOUND", 404);
    }

    return okJson({ purpose: serializePurpose(purpose) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PURPOSE_ID_INVALID") {
      return errJson("PURPOSE_ID_INVALID", 400);
    }
    console.error("PURPOSE_GET_FAILED", e);
    return errJson("PURPOSE_GET_FAILED", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { purposeId: purposeIdStr } = await ctx.params;
    const purposeId = toBigIntOrThrow(purposeIdStr);

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

    const raw = (await req.json().catch(() => null)) as unknown;
    if (!raw || typeof raw !== "object") {
      return errJson("INVALID_JSON", 400);
    }

    const body = raw as PatchBody;

    const codeRaw = toOptionalString(body.code);
    const labelRaw = toOptionalString(body.label);

    const data: {
      code?: string;
      label?: string;
      description?: string | null;
      targetAmount?: number | null;
      orderIndex?: number;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (typeof body.code !== "undefined") {
      if (typeof codeRaw !== "string" || !codeRaw.trim()) {
        return errJson("CODE_INVALID", 400);
      }
      data.code = codeRaw.trim();
    }

    if (typeof body.label !== "undefined") {
      if (typeof labelRaw !== "string" || !labelRaw.trim()) {
        return errJson("LABEL_INVALID", 400);
      }
      data.label = labelRaw.trim();
    }

    if (typeof body.description !== "undefined") {
      data.description = toOptionalNullableString(body.description);
    }

    if (typeof body.targetAmount !== "undefined") {
      const v = toOptionalNullableNumber(body.targetAmount);
      if (typeof v === "undefined") {
        return errJson("TARGET_AMOUNT_INVALID", 400);
      }
      data.targetAmount = v;
    }

    if (typeof body.orderIndex !== "undefined") {
      const v = toOptionalNumber(body.orderIndex);
      if (typeof v === "undefined") {
        return errJson("ORDER_INDEX_INVALID", 400);
      }
      data.orderIndex = v;
    }

    const updated = await prisma.purpose.update({
      where: { id: purposeId },
      data,
    });

    return okJson({ purpose: serializePurpose(updated) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PURPOSE_ID_INVALID") {
      return errJson("PURPOSE_ID_INVALID", 400);
    }
    console.error("PURPOSE_PATCH_FAILED", e);
    return errJson("PURPOSE_PATCH_FAILED", 500);
  }
}
