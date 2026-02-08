import { Prisma } from "@prisma/client";

export type TxClient = Prisma.TransactionClient;

const DECIMAL_ZERO = new Prisma.Decimal(0);

export function toAtomicDecimalOrNull(v: unknown): Prisma.Decimal | null {
  if (typeof v === "number") {
    if (!Number.isFinite(v) || v <= 0 || !Number.isInteger(v)) return null;
    return new Prisma.Decimal(v);
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (!/^\d+$/.test(s)) return null;
    if (s === "0") return null;
    return new Prisma.Decimal(s);
  }
  return null;
}

export async function ensureProjectSettlement(
  tx: TxClient,
  projectId: bigint
) {
  return tx.projectSettlement.upsert({
    where: { projectId },
    create: {
      projectId,
      status: "NOT_READY",
      bridgedTotalAtomic: DECIMAL_ZERO,
      distributedTotalAtomic: DECIMAL_ZERO,
    },
    update: {},
  });
}

export async function sumCompletedBridgedAtomic(
  tx: TxClient,
  projectId: bigint
): Promise<Prisma.Decimal> {
  const agg = await tx.projectBridgeStep.aggregate({
    where: { projectId, status: "COMPLETED" },
    _sum: { bridgedAmountAtomic: true },
  });
  return agg._sum.bridgedAmountAtomic ?? DECIMAL_ZERO;
}

export async function sumPlannedDistributionAtomic(
  tx: TxClient,
  projectId: bigint
): Promise<Prisma.Decimal> {
  const agg = await tx.distributionEntry.aggregate({
    where: {
      projectId,
      status: { not: "CANCELLED" },
    },
    _sum: { amountAtomic: true },
  });
  return agg._sum.amountAtomic ?? DECIMAL_ZERO;
}

export async function sumSentDistributionAtomic(
  tx: TxClient,
  projectId: bigint
): Promise<Prisma.Decimal> {
  const agg = await tx.distributionEntry.aggregate({
    where: { projectId, status: "SENT" },
    _sum: { amountAtomic: true },
  });
  return agg._sum.amountAtomic ?? DECIMAL_ZERO;
}

export async function assertDistributionWithinBridged(
  tx: TxClient,
  projectId: bigint
): Promise<{ bridged: Prisma.Decimal; planned: Prisma.Decimal }> {
  const [bridged, planned] = await Promise.all([
    sumCompletedBridgedAtomic(tx, projectId),
    sumPlannedDistributionAtomic(tx, projectId),
  ]);

  if (planned.gt(bridged)) {
    throw new Error("DISTRIBUTION_SUM_EXCEEDS_BRIDGED_AMOUNT");
  }

  return { bridged, planned };
}

export async function recomputeProjectSettlement(
  tx: TxClient,
  projectId: bigint
) {
  await ensureProjectSettlement(tx, projectId);

  const [goal, steps, bridged, sent, entries] = await Promise.all([
    tx.goal.findUnique({
      where: { projectId },
      select: { achievedAt: true },
    }),
    tx.projectBridgeStep.findMany({
      where: { projectId, status: "COMPLETED" },
      select: { sourceChain: true },
    }),
    sumCompletedBridgedAtomic(tx, projectId),
    sumSentDistributionAtomic(tx, projectId),
    tx.distributionEntry.findMany({
      where: { projectId, status: { not: "CANCELLED" } },
      select: { status: true },
    }),
  ]);

  const achieved = !!goal?.achievedAt;
  const hasPolygon = steps.some((s) => s.sourceChain === "POLYGON");
  const hasEthereum = steps.some((s) => s.sourceChain === "ETHEREUM");
  const bridgesCompleted = hasPolygon && hasEthereum;

  const hasEntries = entries.length > 0;
  const allSent = hasEntries && entries.every((e) => e.status === "SENT");

  let nextStatus: "NOT_READY" | "BRIDGING" | "READY_FOR_DISTRIBUTION" | "DISTRIBUTED" =
    "NOT_READY";

  if (!achieved) {
    nextStatus = "NOT_READY";
  } else if (!bridgesCompleted) {
    nextStatus = "BRIDGING";
  } else if (allSent) {
    nextStatus = "DISTRIBUTED";
  } else {
    nextStatus = "READY_FOR_DISTRIBUTION";
  }

  const now = new Date();

  return tx.projectSettlement.update({
    where: { projectId },
    data: {
      status: nextStatus,
      bridgedTotalAtomic: bridged,
      distributedTotalAtomic: sent,
      readyAt: nextStatus === "READY_FOR_DISTRIBUTION" ? now : null,
      distributedAt: nextStatus === "DISTRIBUTED" ? now : null,
      updatedAt: now,
    },
  });
}
