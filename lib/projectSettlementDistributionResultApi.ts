import { NextRequest, NextResponse } from "next/server";
import { isHash } from "viem";

import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  lowerOrNull,
  toAddressOrNull,
  toBigIntOrThrow,
  toNonEmptyString,
} from "@/lib/api/guards";
import { requireOwnerSession } from "@/lib/ownerAuthSession";
import { prisma } from "@/lib/prisma";
import {
  ensureProjectSettlement,
  recomputeProjectSettlement,
} from "@/lib/projectSettlement";
import { isPrismaUnavailableError, withPrismaRetry } from "@/lib/prismaRetry";

type Params = { projectId: string };
type SettlementDistributionResultDb = Pick<typeof prisma, "project" | "projectSettlement" | "$transaction">;

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

export type SettlementDistributionResultRouteDeps = {
  db?: SettlementDistributionResultDb;
  requireOwnerSession?: typeof requireOwnerSession;
  withPrismaRetry?: typeof withPrismaRetry;
  isPrismaUnavailableError?: typeof isPrismaUnavailableError;
  ensureProjectSettlement?: (
    tx: Parameters<typeof ensureProjectSettlement>[0],
    projectId: bigint
  ) => Promise<unknown>;
  recomputeProjectSettlement?: typeof recomputeProjectSettlement;
  now?: () => Date;
};

export async function handleProjectSettlementDistributionResultPost(
  req: NextRequest,
  ctx: { params: Promise<Params> },
  deps: SettlementDistributionResultRouteDeps = {}
): Promise<NextResponse> {
  try {
    const db = deps.db ?? prisma;
    const runWithRetry = deps.withPrismaRetry ?? withPrismaRetry;
    const requireOwnerSessionFn =
      deps.requireOwnerSession ?? requireOwnerSession;
    const ensureProjectSettlementFn =
      deps.ensureProjectSettlement ?? ensureProjectSettlement;
    const recomputeProjectSettlementFn =
      deps.recomputeProjectSettlement ?? recomputeProjectSettlement;

    const { projectId: projectIdStr } = await ctx.params;
    const projectId = toBigIntOrThrow(projectIdStr, "PROJECT_ID_INVALID");

    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const wallet = toAddressOrNull((raw as Body).address);
    if (!wallet) return errJson("ADDRESS_REQUIRED", 400);
    const ownerSession = await requireOwnerSessionFn(req, wallet);
    if (!ownerSession.ok) return ownerSession.response;

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

    const project = await runWithRetry(() =>
      db.project.findUnique({
        where: { id: projectId },
        select: { id: true, ownerAddress: true },
      })
    );

    if (!project) return errJson("PROJECT_NOT_FOUND", 404);

    const owner = lowerOrNull(project.ownerAddress);
    if (!owner || owner !== wallet.toLowerCase()) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
    }

    const settlement = await runWithRetry(() =>
      db.projectSettlement.findUnique({
        where: { projectId },
        select: { status: true },
      })
    );

    if (!settlement || settlement.status !== "READY_FOR_DISTRIBUTION") {
      return errJson("DISTRIBUTION_REQUIRES_READY_FOR_DISTRIBUTION", 400);
    }

    const now = deps.now?.() ?? new Date();

    const result = await runWithRetry(() =>
      db.$transaction(async (tx) => {
        const target = await tx.distributionEntry.findFirst({
          where: { id: entryId, projectId },
          select: { id: true },
        });

        if (!target) throw new Error("ENTRY_NOT_FOUND");

        const matchingSavedItem =
          executionId == null
            ? await tx.distributionExecutionItem.findFirst({
                where: {
                  distributionEntryId: entryId,
                  status,
                  txHash: status === "SENT" ? txHash : null,
                  errorReason:
                    status === "FAILED" ? errorReason ?? "TX_FAILED" : null,
                  execution: {
                    projectId,
                    initiatedByWallet: wallet,
                  },
                },
                orderBy: { createdAt: "desc" },
                select: { executionId: true },
              })
            : null;

        const execution = executionId
          ? await tx.distributionExecution.findFirst({
              where: { id: executionId, projectId },
              select: { id: true },
            })
          : matchingSavedItem
            ? await tx.distributionExecution.findFirst({
                where: { id: matchingSavedItem.executionId, projectId },
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

        const existingItem = await tx.distributionExecutionItem.findFirst({
          where: {
            executionId: execRow.id,
            distributionEntryId: entryId,
          },
          select: { id: true },
        });

        if (existingItem) {
          await tx.distributionExecutionItem.update({
            where: { id: existingItem.id },
            data: {
              status,
              txHash: status === "SENT" ? txHash : null,
              errorReason: status === "FAILED" ? errorReason ?? "TX_FAILED" : null,
            },
          });
        } else {
          await tx.distributionExecutionItem.create({
            data: {
              executionId: execRow.id,
              distributionEntryId: entryId,
              status,
              txHash: status === "SENT" ? txHash : null,
              errorReason: status === "FAILED" ? errorReason ?? "TX_FAILED" : null,
            },
          });
        }

        const entries = await tx.distributionEntry.findMany({
          where: { projectId, status: { not: "CANCELLED" } },
          select: { status: true },
        });

        const hasFailed = entries.some((entry) => entry.status === "FAILED");
        const hasPending = entries.some(
          (entry) => entry.status === "DRAFT" || entry.status === "QUEUED"
        );
        const allSent =
          entries.length > 0 && entries.every((entry) => entry.status === "SENT");

        await tx.distributionExecution.update({
          where: { id: execRow.id },
          data: {
            result: allSent ? "SUCCESS" : hasFailed ? "FAILED" : "PARTIAL_SUCCESS",
            finishedAt: hasPending ? null : now,
          },
        });

        await ensureProjectSettlementFn(tx, projectId);
        const settlement = await recomputeProjectSettlementFn(tx, projectId);

        return {
          executionId: execRow.id,
          settlement,
        };
      })
    );

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
    if ((deps.isPrismaUnavailableError ?? isPrismaUnavailableError)(e)) {
      return errJson("DB_UNAVAILABLE", 503);
    }
    console.error("PROJECT_SETTLEMENT_DISTRIBUTION_RESULT_POST_FAILED", e);
    return errJson("PROJECT_SETTLEMENT_DISTRIBUTION_RESULT_POST_FAILED", 500);
  }
}
