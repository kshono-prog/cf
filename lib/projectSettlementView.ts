import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";
import {
  ensureProjectSettlement,
  isSettlementSchemaMissingError,
  recomputeProjectSettlement,
} from "@/lib/projectSettlement";

export type ProjectSettlementData = {
  project: {
    id: string;
    title: string;
    status: string;
  };
  goal: {
    id: string;
    achievedAt: string | null;
    targetAmount: number;
    targetAmountJpyc?: number;
  } | null;
  settlement: {
    id: string;
    status: "NOT_READY" | "BRIDGING" | "READY_FOR_DISTRIBUTION" | "DISTRIBUTED";
    bridgedTotalAtomic: string;
    distributedTotalAtomic: string;
    readyAt: string | null;
    distributedAt: string | null;
    updatedAt: string;
  };
  bridgeSteps: Array<{
    id: string;
    sourceChain: "POLYGON" | "ETHEREUM";
    destinationChain: "AVALANCHE";
    token: "JPYC" | "USDC";
    status: "PENDING" | "COMPLETED" | "CANCELLED";
    bridgedAmountAtomic: string;
    txHash: string | null;
    completedAt: string | null;
    recordedByWallet: string | null;
    memo: string | null;
    createdAt: string;
  }>;
  distributionEntries: Array<{
    id: string;
    recipientAddressChecksum: string;
    token: "JPYC" | "USDC";
    amountAtomic: string;
    memo: string | null;
    status: "DRAFT" | "QUEUED" | "SENT" | "FAILED" | "CANCELLED";
    sentAt: string | null;
    txHash: string | null;
    orderIndex: number;
    createdAt: string;
    updatedAt: string;
  }>;
  recentExecutions: Array<{
    id: string;
    initiatedByWallet: string | null;
    startedAt: string;
    finishedAt: string | null;
    result: "PARTIAL_SUCCESS" | "SUCCESS" | "FAILED";
    note: string | null;
    items: Array<{
      id: string;
      distributionEntryId: string;
      status: "DRAFT" | "QUEUED" | "SENT" | "FAILED" | "CANCELLED";
      txHash: string | null;
      errorReason: string | null;
      createdAt: string;
    }>;
  }>;
  cctpJobs: Array<{
    id: string;
    currency: "JPYC" | "USDC";
    sourceChain: "POLYGON" | "ETHEREUM";
    destinationChain: "AVALANCHE";
    status:
      | "PENDING"
      | "BURN_SUBMITTED"
      | "ATTESTATION_READY"
      | "MINT_SUBMITTED"
      | "COMPLETED"
      | "FAILED";
    idempotencyKey: string;
    goalAchievedAt: string;
    burnAmountAtomic: string | null;
    burnTxHash: string | null;
    burnMessageHash: string | null;
    attestation: string | null;
    attestationFetchedAt: string | null;
    mintTxHash: string | null;
    failureReason: string | null;
    attempts: number;
    maxAttempts: number;
    nextRetryAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  warning?: string;
};

export function buildFallbackSettlement(params: {
  achievedAt: Date | null | undefined;
}): ProjectSettlementData["settlement"] {
  const achieved = !!params.achievedAt;
  const status: ProjectSettlementData["settlement"]["status"] = achieved
    ? "BRIDGING"
    : "NOT_READY";
  const now = new Date().toISOString();
  return {
    id: "schema-not-migrated",
    status,
    bridgedTotalAtomic: "0",
    distributedTotalAtomic: "0",
    readyAt: null,
    distributedAt: null,
    updatedAt: now,
  };
}

export async function getProjectSettlementView(
  projectId: bigint
): Promise<ProjectSettlementData | null> {
  try {
    const data = await withPrismaRetry(() =>
      prisma.project.findUnique({
        where: { id: projectId },
        include: {
          goal: {
            select: {
              id: true,
              achievedAt: true,
              targetAmount: true,
              targetAmountJpyc: true,
            },
          },
          settlementState: true,
          bridgeSteps: {
            orderBy: { createdAt: "asc" },
          },
          distributionEntries: {
            orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
          },
          distributionExecutions: {
            orderBy: { startedAt: "desc" },
            take: 5,
            include: {
              items: {
                orderBy: { createdAt: "asc" },
              },
            },
          },
          cctpBridgeJobs: {
            orderBy: [{ createdAt: "desc" }],
            take: 20,
          },
        },
      })
    );

    if (!data) return null;

    const settlement = data.settlementState
      ? data.settlementState
      : await (async () => {
          await ensureProjectSettlement(prisma, projectId);
          return recomputeProjectSettlement(prisma, projectId);
        })();

    return {
      project: {
        id: data.id.toString(),
        title: data.title,
        status: data.status,
      },
      goal: data.goal
        ? {
            id: data.goal.id.toString(),
            achievedAt: data.goal.achievedAt?.toISOString() ?? null,
            targetAmount: data.goal.targetAmount,
            targetAmountJpyc: data.goal.targetAmount,
          }
        : null,
      settlement: {
        id: settlement.id,
        status: settlement.status,
        bridgedTotalAtomic: settlement.bridgedTotalAtomic.toString(),
        distributedTotalAtomic: settlement.distributedTotalAtomic.toString(),
        readyAt: settlement.readyAt?.toISOString() ?? null,
        distributedAt: settlement.distributedAt?.toISOString() ?? null,
        updatedAt: settlement.updatedAt.toISOString(),
      },
      bridgeSteps: data.bridgeSteps.map((s) => ({
        id: s.id,
        sourceChain: s.sourceChain,
        destinationChain: s.destinationChain,
        token: s.token,
        status: s.status,
        bridgedAmountAtomic: s.bridgedAmountAtomic.toString(),
        txHash: s.txHash,
        completedAt: s.completedAt?.toISOString() ?? null,
        recordedByWallet: s.recordedByWallet,
        memo: s.memo,
        createdAt: s.createdAt.toISOString(),
      })),
      distributionEntries: data.distributionEntries.map((e) => ({
        id: e.id,
        recipientAddressChecksum: e.recipientAddressChecksum,
        token: e.token,
        amountAtomic: e.amountAtomic.toString(),
        memo: e.memo,
        status: e.status,
        sentAt: e.sentAt?.toISOString() ?? null,
        txHash: e.txHash,
        orderIndex: e.orderIndex,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
      recentExecutions: data.distributionExecutions.map((x) => ({
        id: x.id,
        initiatedByWallet: x.initiatedByWallet,
        startedAt: x.startedAt.toISOString(),
        finishedAt: x.finishedAt?.toISOString() ?? null,
        result: x.result,
        note: x.note,
        items: x.items.map((i) => ({
          id: i.id,
          distributionEntryId: i.distributionEntryId,
          status: i.status,
          txHash: i.txHash,
          errorReason: i.errorReason,
          createdAt: i.createdAt.toISOString(),
        })),
      })),
      cctpJobs: data.cctpBridgeJobs.map((j) => ({
        id: j.id,
        currency: j.currency,
        sourceChain: j.sourceChain,
        destinationChain: j.destinationChain,
        status: j.status,
        idempotencyKey: j.idempotencyKey,
        goalAchievedAt: j.goalAchievedAt.toISOString(),
        burnAmountAtomic: j.burnAmountAtomic?.toString() ?? null,
        burnTxHash: j.burnTxHash,
        burnMessageHash: j.burnMessageHash,
        attestation: j.attestation,
        attestationFetchedAt: j.attestationFetchedAt?.toISOString() ?? null,
        mintTxHash: j.mintTxHash,
        failureReason: j.failureReason,
        attempts: j.attempts,
        maxAttempts: j.maxAttempts,
        nextRetryAt: j.nextRetryAt?.toISOString() ?? null,
        createdAt: j.createdAt.toISOString(),
        updatedAt: j.updatedAt.toISOString(),
      })),
    };
  } catch (e) {
    if (!isSettlementSchemaMissingError(e)) throw e;

    const fallback = await withPrismaRetry(() =>
      prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          title: true,
          status: true,
          goal: {
            select: {
              id: true,
              achievedAt: true,
              targetAmount: true,
              targetAmountJpyc: true,
            },
          },
        },
      })
    );

    if (!fallback) return null;

    return {
      project: {
        id: fallback.id.toString(),
        title: fallback.title,
        status: fallback.status,
      },
      goal: fallback.goal
        ? {
            id: fallback.goal.id.toString(),
            achievedAt: fallback.goal.achievedAt?.toISOString() ?? null,
            targetAmount: fallback.goal.targetAmount,
            targetAmountJpyc: fallback.goal.targetAmount,
          }
        : null,
      settlement: buildFallbackSettlement({
        achievedAt: fallback.goal?.achievedAt,
      }),
      bridgeSteps: [],
      distributionEntries: [],
      recentExecutions: [],
      cctpJobs: [],
      warning: "SETTLEMENT_SCHEMA_NOT_MIGRATED",
    };
  }
}
