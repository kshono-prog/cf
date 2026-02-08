import { NextRequest, NextResponse } from "next/server";
import { isHash } from "viem";
import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  lowerOrNull,
  toAddressOrNull,
  toBigIntOrThrow,
  toNonEmptyString,
} from "@/lib/api/guards";
import {
  ensureProjectSettlement,
  recomputeProjectSettlement,
} from "@/lib/projectSettlement";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

type Body = {
  address?: unknown;
  executionId?: unknown;
  entryId?: unknown;
  status?: unknown;
  txHash?: unknown;
  errorReason?: unknown;
};

function toId(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

function toRowStatus(v: unknown): "SENT" | "FAILED" | null {
  return v === "SENT" || v === "FAILED" ? v : null;
}

function toOptionalHash(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return isHash(s) ? s : null;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { projectId: projectIdStr } = await ctx.params;
    const projectId = toBigIntOrThrow(projectIdStr, "PROJECT_ID_INVALID");

    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const wallet = toAddressOrNull((raw as Body).address);
    if (!wallet) return errJson("ADDRESS_REQUIRED", 400);

    const entryId = toId((raw as Body).entryId);
    if (!entryId) return errJson("ENTRY_ID_REQUIRED", 400);

    const status = toRowStatus((raw as Body).status);
    if (!status) return errJson("STATUS_INVALID", 400);

    const txHashInput = (raw as Body).txHash;
    const txHash = txHashInput == null ? null : toOptionalHash(txHashInput);
    if (txHashInput != null && !txHash) return errJson("TX_HASH_INVALID", 400);

    if (status === "SENT" && !txHash) return errJson("TX_HASH_REQUIRED_FOR_SENT", 400);

    const errorReason = toNonEmptyString((raw as Body).errorReason);
    const executionId = toId((raw as Body).executionId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerAddress: true },
    });

    if (!project) return errJson("PROJECT_NOT_FOUND", 404);

    const owner = lowerOrNull(project.ownerAddress);
    if (!owner || owner !== wallet.toLowerCase()) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.distributionEntry.findFirst({
        where: { id: entryId, projectId },
        select: { id: true },
      });

      if (!target) throw new Error("ENTRY_NOT_FOUND");

      const execution = executionId
        ? await tx.distributionExecution.findFirst({
            where: { id: executionId, projectId },
            select: { id: true },
          })
        : null;

      const execRow = execution
        ? execution
        : await tx.distributionExecution.create({
            data: {
              projectId,
              initiatedByWallet: wallet,
              startedAt: now,
              result: "PARTIAL_SUCCESS",
            },
            select: { id: true },
          });

      await tx.distributionEntry.update({
        where: { id: entryId },
        data: {
          status,
          txHash: status === "SENT" ? txHash : null,
          sentAt: status === "SENT" ? now : null,
          updatedAt: now,
        },
      });

      await tx.distributionExecutionItem.create({
        data: {
          executionId: execRow.id,
          distributionEntryId: entryId,
          status,
          txHash: status === "SENT" ? txHash : null,
          errorReason: status === "FAILED" ? errorReason ?? "TX_FAILED" : null,
        },
      });

      const entries = await tx.distributionEntry.findMany({
        where: { projectId, status: { not: "CANCELLED" } },
        select: { status: true },
      });

      const hasFailed = entries.some((e) => e.status === "FAILED");
      const hasPending = entries.some(
        (e) => e.status === "DRAFT" || e.status === "QUEUED"
      );
      const allSent = entries.length > 0 && entries.every((e) => e.status === "SENT");

      await tx.distributionExecution.update({
        where: { id: execRow.id },
        data: {
          result: allSent ? "SUCCESS" : hasFailed ? "FAILED" : "PARTIAL_SUCCESS",
          finishedAt: hasPending ? null : now,
        },
      });

      await ensureProjectSettlement(tx, projectId);
      const settlement = await recomputeProjectSettlement(tx, projectId);

      return {
        executionId: execRow.id,
        settlement,
      };
    });

    return okJson({
      executionId: result.executionId,
      entryId,
      status,
      txHash: status === "SENT" ? txHash : null,
      settlement: {
        status: result.settlement.status,
        bridgedTotalAtomic: result.settlement.bridgedTotalAtomic.toString(),
        distributedTotalAtomic: result.settlement.distributedTotalAtomic.toString(),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    if (msg === "ENTRY_NOT_FOUND") return errJson("ENTRY_NOT_FOUND", 404);
    console.error("PROJECT_SETTLEMENT_DISTRIBUTION_RESULT_POST_FAILED", e);
    return errJson("PROJECT_SETTLEMENT_DISTRIBUTION_RESULT_POST_FAILED", 500);
  }
}
