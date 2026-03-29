import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  buildEmptyAiManagerReconciliationSummary,
  deriveAiManagerX402DeliveryStatus,
  type SerializedAiManagerReconciliationSummary,
} from "@/lib/aiManager/reconciliationShared";

type ReconciliationDbClient = typeof prisma | Prisma.TransactionClient;

function toDecimalString(value: Prisma.Decimal | null | undefined): string {
  return value ? value.toString() : "0";
}

export async function getAiManagerReconciliationSummary(args: {
  db?: ReconciliationDbClient;
  aiManagerAccountId: string;
}): Promise<SerializedAiManagerReconciliationSummary> {
  const db = args.db ?? prisma;

  const [
    pendingX402,
    oldestPendingX402,
    latestPendingX402Event,
    failedX402,
    unmatchedFundingEvidence,
    latestConfirmedX402,
  ] = await Promise.all([
    db.aiManagerPaymentAttempt.aggregate({
      where: {
        rail: "X402",
        status: "PENDING",
        usageRecord: {
          is: {
            aiManagerAccountId: args.aiManagerAccountId,
          },
        },
      },
      _count: {
        _all: true,
      },
      _sum: {
        amount: true,
      },
    }),
    db.aiManagerPaymentAttempt.findFirst({
      where: {
        rail: "X402",
        status: "PENDING",
        usageRecord: {
          is: {
            aiManagerAccountId: args.aiManagerAccountId,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        createdAt: true,
      },
    }),
    db.aiManagerPaymentAttemptEvent.findFirst({
      where: {
        aiManagerAccountId: args.aiManagerAccountId,
        paymentAttempt: {
          is: {
            rail: "X402",
            status: "PENDING",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
        source: true,
        eventType: true,
      },
    }),
    db.aiManagerPaymentAttempt.aggregate({
      where: {
        rail: "X402",
        status: "FAILED",
        usageRecord: {
          is: {
            aiManagerAccountId: args.aiManagerAccountId,
          },
        },
      },
      _count: {
        _all: true,
      },
      _sum: {
        amount: true,
      },
    }),
    db.aiManagerFundingEvidence.aggregate({
      where: {
        aiManagerAccountId: args.aiManagerAccountId,
        status: "SELF_REPORTED",
        matchedBudgetTransactionId: null,
      },
      _count: {
        _all: true,
      },
      _sum: {
        amount: true,
      },
    }),
    db.aiManagerPaymentAttempt.findFirst({
      where: {
        rail: "X402",
        status: "CONFIRMED",
        usageRecord: {
          is: {
            aiManagerAccountId: args.aiManagerAccountId,
          },
        },
      },
      orderBy: {
        confirmedAt: "desc",
      },
      select: {
        confirmedAt: true,
      },
    }),
  ]);

  const pendingX402Count = pendingX402._count._all;
  const failedX402Count = failedX402._count._all;
  const unmatchedFundingEvidenceCount = unmatchedFundingEvidence._count._all;
  const oldestPendingX402CreatedAt =
    oldestPendingX402?.createdAt.toISOString() ?? null;
  const pendingDelivery = deriveAiManagerX402DeliveryStatus({
    pendingX402Count,
    oldestPendingX402CreatedAt,
    latestPendingX402EventAt: latestPendingX402Event?.createdAt.toISOString() ?? null,
    latestPendingX402EventSource: latestPendingX402Event?.source ?? null,
    latestPendingX402EventType: latestPendingX402Event?.eventType ?? null,
  });

  return {
    ...buildEmptyAiManagerReconciliationSummary(),
    pendingX402Count,
    pendingX402Amount: toDecimalString(pendingX402._sum.amount),
    oldestPendingX402CreatedAt,
    pendingX402DeliveryStatus: pendingDelivery.status,
    pendingX402DeliveryHint: pendingDelivery.hint,
    latestPendingX402EventAt: latestPendingX402Event?.createdAt.toISOString() ?? null,
    latestPendingX402EventSource: latestPendingX402Event?.source ?? null,
    latestPendingX402EventType: latestPendingX402Event?.eventType ?? null,
    failedX402Count,
    failedX402Amount: toDecimalString(failedX402._sum.amount),
    unmatchedFundingEvidenceCount,
    unmatchedFundingEvidenceAmount: toDecimalString(
      unmatchedFundingEvidence._sum.amount
    ),
    latestConfirmedX402At: latestConfirmedX402?.confirmedAt?.toISOString() ?? null,
    requiresAttention:
      pendingX402Count > 0 ||
      failedX402Count > 0 ||
      unmatchedFundingEvidenceCount > 0,
  };
}
