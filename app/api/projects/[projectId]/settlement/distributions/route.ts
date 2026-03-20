import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { toBigIntOrThrow } from "@/lib/api/guards";
import { isPrismaUnavailableError, withPrismaRetry } from "@/lib/prismaRetry";
import { requireOwnerSession } from "@/lib/ownerAuthSession";
import { handleProjectSettlementDistributionsPut } from "@/lib/projectSettlementDistributionsApi";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { projectId: projectIdStr } = await ctx.params;
    const projectId = toBigIntOrThrow(projectIdStr, "PROJECT_ID_INVALID");

    const project = await withPrismaRetry(() =>
      prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          ownerAddress: true,
          distributionEntries: {
            orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
          },
        },
      })
    );

    if (!project) return errJson("PROJECT_NOT_FOUND", 404);

    if (!project.ownerAddress) return errJson("FORBIDDEN_NOT_OWNER", 403);

    const ownerSession = await requireOwnerSession(req, project.ownerAddress);
    if (!ownerSession.ok) return ownerSession.response;

    return okJson({
      projectId: project.id.toString(),
      distributionEntries: project.distributionEntries.map((e) => ({
        id: e.id,
        recipientAddressChecksum: e.recipientAddressChecksum,
        amountAtomic: e.amountAtomic.toString(),
        memo: e.memo,
        token: e.token,
        status: e.status,
        txHash: e.txHash,
        sentAt: e.sentAt?.toISOString() ?? null,
        orderIndex: e.orderIndex,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    if (isPrismaUnavailableError(e)) return errJson("DB_UNAVAILABLE", 503);
    console.error("PROJECT_SETTLEMENT_DISTRIBUTIONS_GET_FAILED", e);
    return errJson("PROJECT_SETTLEMENT_DISTRIBUTIONS_GET_FAILED", 500);
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  return handleProjectSettlementDistributionsPut(req, ctx);
}
