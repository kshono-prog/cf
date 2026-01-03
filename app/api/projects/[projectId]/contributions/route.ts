import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { isRecord, toBigIntOrThrow } from "@/lib/api/guards";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

type Status = "PENDING" | "CONFIRMED" | "FAILED";

function toStatus(v: unknown): Status | null {
  if (v === "PENDING" || v === "CONFIRMED" || v === "FAILED") return v;
  return null;
}

function pickQueryParam(req: NextRequest, key: string): string | null {
  try {
    const url = new URL(req.url);
    const v = url.searchParams.get(key);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { projectId: projectIdStr } = await ctx.params;
    const projectId = toBigIntOrThrow(projectIdStr, "PROJECT_ID_INVALID");

    const statusRaw = pickQueryParam(req, "status");
    const status = statusRaw ? toStatus(statusRaw) : null;
    if (statusRaw && !status) return errJson("STATUS_INVALID", 400);

    const rows = await prisma.contribution.findMany({
      where: {
        projectId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        txHash: true,
        status: true,
        chainId: true,
        currency: true,
        fromAddress: true,
        toAddress: true,
        amountDecimal: true,
        amountRaw: true,
        decimals: true,
        confirmedAt: true,
        createdAt: true,
        updatedAt: true,
        purposeId: true,
      },
    });

    // BigInt を文字列化
    const contributions = rows.map((r) => ({
      ...r,
      purposeId: r.purposeId ? r.purposeId.toString() : null,
      amountRaw:
        typeof r.amountRaw === "string" ? r.amountRaw : String(r.amountRaw),
      amountDecimal: r.amountDecimal ? String(r.amountDecimal) : null,
      confirmedAt: r.confirmedAt ? r.confirmedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return okJson({
      projectId: projectId.toString(),
      status: status ?? null,
      count: contributions.length,
      contributions,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    console.error("PROJECT_CONTRIBUTIONS_GET_FAILED", e);
    return errJson("PROJECT_CONTRIBUTIONS_GET_FAILED", 500);
  }
}
