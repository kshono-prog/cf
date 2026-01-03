/* app/api/projects/[projectId]/bridge/run/route.ts */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  toAddressOrNull,
  toBigIntOrThrow,
  lowerOrNull,
  toNonEmptyString,
} from "@/lib/api/guards";
import { isHash } from "viem";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

type Body = {
  address?: unknown; // owner
  bridgeRunId?: unknown; // UUID
  bridgeTxHash?: unknown; // 0x... （DESTINATION: Avalanche 側の txHash を貼る）
};

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { projectId: projectIdStr } = await ctx.params;
    const projectId = toBigIntOrThrow(projectIdStr, "PROJECT_ID_INVALID");

    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const addr = toAddressOrNull(raw.address);
    if (!addr) return errJson("ADDRESS_REQUIRED", 400);

    const bridgeRunId = toNonEmptyString(raw.bridgeRunId);
    if (!bridgeRunId) return errJson("BRIDGE_RUN_ID_REQUIRED", 400);

    const txHash = toNonEmptyString(raw.bridgeTxHash);
    if (!txHash || !isHash(txHash)) {
      return errJson("BRIDGE_TX_HASH_INVALID", 400);
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerAddress: true },
    });
    if (!project) return errJson("PROJECT_NOT_FOUND", 404);

    const owner = lowerOrNull(project.ownerAddress);
    if (!owner || owner !== addr.toLowerCase()) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
    }

    // projectId が一致する run のみ更新（安全策）
    const existing = await prisma.bridgeRun.findUnique({
      where: { id: bridgeRunId },
      select: { id: true, projectId: true },
    });
    if (!existing) return errJson("BRIDGE_RUN_NOT_FOUND", 404);
    if (existing.projectId !== projectId)
      return errJson("BRIDGE_RUN_MISMATCH", 400);

    const run = await prisma.bridgeRun.update({
      where: { id: bridgeRunId },
      data: {
        bridgeTxHash: txHash,
      },
      select: {
        id: true,
        bridgeTxHash: true,
        createdAt: true,
      },
    });

    return okJson({
      saved: true,
      bridgeRunId: run.id,
      bridgeTxHash: run.bridgeTxHash,
      savedAt: run.createdAt.toISOString(),
    });
  } catch (e) {
    console.error("BRIDGE_RUN_SAVE_FAILED", e);
    return errJson("BRIDGE_RUN_SAVE_FAILED", 500);
  }
}
