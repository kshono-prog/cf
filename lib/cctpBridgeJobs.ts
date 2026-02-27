import { Prisma, PrismaClient } from "@prisma/client";
import {
  ensureProjectSettlement,
  recomputeProjectSettlement,
  type TxClient,
} from "@/lib/projectSettlement";

type Currency = "JPYC" | "USDC";
type BridgeSourceChain = "POLYGON" | "ETHEREUM";

type ProjectForJob = {
  id: bigint;
  currency: string;
  goal: { achievedAt: Date | null } | null;
  eventFundingChainId: number | null;
};

function toCurrency(v: string): Currency | null {
  return v === "JPYC" || v === "USDC" ? v : null;
}

function toSourceChain(chainId: number | null | undefined): BridgeSourceChain {
  return chainId === 1 || chainId === 11155111 ? "ETHEREUM" : "POLYGON";
}

export function makeCctpIdempotencyKey(input: {
  projectId: bigint;
  sourceChain: BridgeSourceChain;
  goalAchievedAt: Date;
}): string {
  return [
    "CCTP",
    input.projectId.toString(),
    "USDC",
    input.sourceChain,
    input.goalAchievedAt.toISOString(),
  ].join(":");
}

export async function ensureCctpJobForGoalAchieved(
  tx: TxClient,
  project: ProjectForJob
) {
  const currency = toCurrency(project.currency);
  if (currency !== "USDC") return null;
  if (!project.goal?.achievedAt) return null;

  const sourceChain = toSourceChain(project.eventFundingChainId);
  const idempotencyKey = makeCctpIdempotencyKey({
    projectId: project.id,
    sourceChain,
    goalAchievedAt: project.goal.achievedAt,
  });

  return tx.cctpBridgeJob.upsert({
    where: { idempotencyKey },
    create: {
      projectId: project.id,
      currency: "USDC",
      sourceChain,
      destinationChain: "AVALANCHE",
      status: "PENDING",
      idempotencyKey,
      goalAchievedAt: project.goal.achievedAt,
    },
    update: {},
  });
}

function calcBackoffMinutes(attempts: number): number {
  const pow = Math.min(16, Math.max(0, attempts));
  const mins = 2 ** pow;
  return Math.min(mins, 24 * 60);
}

export function nextRetryDateFromAttempts(attempts: number): Date {
  const mins = calcBackoffMinutes(attempts);
  return new Date(Date.now() + mins * 60_000);
}

export async function markCctpJobCompletedAndSyncSettlement(
  tx: Prisma.TransactionClient,
  params: {
    jobId: string;
    mintTxHash?: string | null;
  }
) {
  const now = new Date();
  const job = await tx.cctpBridgeJob.update({
    where: { id: params.jobId },
    data: {
      status: "COMPLETED",
      mintTxHash: params.mintTxHash ?? undefined,
      failureReason: null,
      nextRetryAt: null,
      updatedAt: now,
    },
  });

  const bridgedAmount = job.burnAmountAtomic ?? new Prisma.Decimal(0);

  await tx.projectBridgeStep.upsert({
    where: {
      projectId_sourceChain_destinationChain_token: {
        projectId: job.projectId,
        sourceChain: job.sourceChain,
        destinationChain: "AVALANCHE",
        token: "USDC",
      },
    },
    create: {
      projectId: job.projectId,
      sourceChain: job.sourceChain,
      destinationChain: "AVALANCHE",
      token: "USDC",
      status: "COMPLETED",
      bridgedAmountAtomic: bridgedAmount,
      txHash: job.mintTxHash,
      completedAt: now,
      memo: "CCTP_COMPLETED",
    },
    update: {
      status: "COMPLETED",
      bridgedAmountAtomic: bridgedAmount,
      txHash: job.mintTxHash,
      completedAt: now,
      memo: "CCTP_COMPLETED",
      updatedAt: now,
    },
  });

  await ensureProjectSettlement(tx, job.projectId);
  await recomputeProjectSettlement(tx, job.projectId);

  return job;
}

export async function fetchIrisAttestationByMessageHash(params: {
  messageHash: string;
}): Promise<{ ok: true; attestation: string } | { ok: false; reason: string }> {
  const hash = params.messageHash.trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    return { ok: false, reason: "BURN_MESSAGE_HASH_INVALID" };
  }

  const base =
    process.env.CCTP_IRIS_BASE_URL?.trim() ||
    "https://iris-api.circle.com";
  const url = `${base.replace(/\/$/, "")}/v2/messages/${hash}/attestation`;

  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    const json: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      return { ok: false, reason: `IRIS_HTTP_${res.status}` };
    }

    if (!json || typeof json !== "object") {
      return { ok: false, reason: "IRIS_RESPONSE_INVALID" };
    }

    const j = json as {
      attestation?: unknown;
      status?: unknown;
      messages?: unknown;
    };

    if (typeof j.attestation === "string" && j.attestation.length > 0) {
      return { ok: true, attestation: j.attestation };
    }

    if (Array.isArray(j.messages) && j.messages.length > 0) {
      const first = j.messages[0] as { attestation?: unknown };
      if (typeof first?.attestation === "string" && first.attestation.length > 0) {
        return { ok: true, attestation: first.attestation };
      }
    }

    const status = typeof j.status === "string" ? j.status : "PENDING";
    return { ok: false, reason: `IRIS_ATTESTATION_${status}` };
  } catch {
    return { ok: false, reason: "IRIS_FETCH_FAILED" };
  }
}

export async function syncCctpJobsFromGoal(prisma: PrismaClient, projectId: bigint) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      currency: true,
      eventFundingChainId: true,
      goal: { select: { achievedAt: true } },
    },
  });
  if (!project) return null;

  return prisma.$transaction(async (tx) => {
    return ensureCctpJobForGoalAchieved(tx, project);
  });
}
