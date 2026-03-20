import { NextRequest, NextResponse } from "next/server";
import { isHash } from "viem";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { errJson, jsonResponse, okJson } from "@/lib/api/responses";
import {
  isRecord,
  lowerOrNull,
  toBigIntOrThrow,
  toNonEmptyString,
} from "@/lib/api/guards";
import {
  fetchIrisAttestationByMessageHash,
  markCctpJobCompletedAndSyncSettlement,
  nextRetryDateFromAttempts,
  syncCctpJobsFromGoal,
} from "@/lib/cctpBridgeJobs";
import {
  requireOwnerSessionFromBody,
  requireOwnerSessionFromSearchParams,
} from "@/lib/ownerAuthSession";

type Params = { projectId: string };

export const dynamic = "force-dynamic";

type Action =
  | "SYNC_FROM_GOAL"
  | "MARK_BURN_SUBMITTED"
  | "FETCH_ATTESTATION"
  | "MARK_MINT_SUBMITTED"
  | "COMPLETE"
  | "FAIL"
  | "RETRY";

function toAction(v: unknown): Action | null {
  return v === "SYNC_FROM_GOAL" ||
    v === "MARK_BURN_SUBMITTED" ||
    v === "FETCH_ATTESTATION" ||
    v === "MARK_MINT_SUBMITTED" ||
    v === "COMPLETE" ||
    v === "FAIL" ||
    v === "RETRY"
    ? v
    : null;
}

function toJobId(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

function toSourceChain(v: unknown): "POLYGON" | "ETHEREUM" | null {
  return v === "POLYGON" || v === "ETHEREUM" ? v : null;
}

function toAtomicDecimal(v: unknown): Prisma.Decimal | null {
  if (typeof v === "string" && /^\d+$/.test(v.trim())) {
    const s = v.trim();
    if (s === "0") return null;
    return new Prisma.Decimal(s);
  }
  return null;
}

function jobView(job: {
  id: string;
  projectId: bigint;
  currency: string;
  sourceChain: string;
  destinationChain: string;
  status: string;
  idempotencyKey: string;
  goalAchievedAt: Date;
  burnAmountAtomic: Prisma.Decimal | null;
  burnTxHash: string | null;
  burnMessageHash: string | null;
  attestation: string | null;
  attestationFetchedAt: Date | null;
  mintTxHash: string | null;
  failureReason: string | null;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: job.id,
    projectId: job.projectId.toString(),
    currency: job.currency,
    sourceChain: job.sourceChain,
    destinationChain: job.destinationChain,
    status: job.status,
    idempotencyKey: job.idempotencyKey,
    goalAchievedAt: job.goalAchievedAt.toISOString(),
    burnAmountAtomic: job.burnAmountAtomic?.toString() ?? null,
    burnTxHash: job.burnTxHash,
    burnMessageHash: job.burnMessageHash,
    attestation: job.attestation,
    attestationFetchedAt: job.attestationFetchedAt?.toISOString() ?? null,
    mintTxHash: job.mintTxHash,
    failureReason: job.failureReason,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    nextRetryAt: job.nextRetryAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

async function assertProjectOwner(projectId: bigint, wallet: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerAddress: true },
  });

  if (!project) return { ok: false as const, error: "PROJECT_NOT_FOUND" };

  const owner = lowerOrNull(project.ownerAddress);
  if (!owner || owner !== wallet.toLowerCase()) {
    return { ok: false as const, error: "FORBIDDEN_NOT_OWNER" };
  }

  return { ok: true as const };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { projectId: projectIdStr } = await ctx.params;
    const projectId = toBigIntOrThrow(projectIdStr, "PROJECT_ID_INVALID");

    const { searchParams } = new URL(req.url);
    const ownerSession = await requireOwnerSessionFromSearchParams(
      req,
      searchParams
    );
    if (!ownerSession.ok) return ownerSession.response;

    const ownerCheck = await assertProjectOwner(projectId, ownerSession.address);
    if (!ownerCheck.ok) {
      return errJson(
        ownerCheck.error,
        ownerCheck.error === "PROJECT_NOT_FOUND" ? 404 : 403
      );
    }

    const jobs = await prisma.cctpBridgeJob.findMany({
      where: { projectId },
      orderBy: [{ createdAt: "desc" }],
    });

    return okJson({
      jobs: jobs.map(jobView),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    console.error("PROJECT_CCTP_JOBS_GET_FAILED", e);
    return errJson("PROJECT_CCTP_JOBS_GET_FAILED", 500);
  }
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

    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return ownerSession.response;

    const ownerCheck = await assertProjectOwner(projectId, ownerSession.address);
    if (!ownerCheck.ok) {
      return errJson(ownerCheck.error, ownerCheck.error === "PROJECT_NOT_FOUND" ? 404 : 403);
    }

    const action = toAction(raw.action);
    if (!action) return errJson("ACTION_INVALID", 400);

    if (action === "SYNC_FROM_GOAL") {
      const job = await syncCctpJobsFromGoal(prisma, projectId);
      return okJson({ job: job ? jobView(job) : null });
    }

    const jobId = toJobId(raw.jobId);
    if (!jobId) return errJson("JOB_ID_REQUIRED", 400);

    const job = await prisma.cctpBridgeJob.findFirst({
      where: { id: jobId, projectId },
    });
    if (!job) return errJson("CCTP_JOB_NOT_FOUND", 404);

    if (action === "MARK_BURN_SUBMITTED") {
      const burnTxHash = toNonEmptyString(raw.burnTxHash);
      if (!burnTxHash || !isHash(burnTxHash)) {
        return errJson("BURN_TX_HASH_INVALID", 400);
      }
      const burnAmountAtomic = toAtomicDecimal(raw.burnAmountAtomic);
      if (!burnAmountAtomic) return errJson("BURN_AMOUNT_ATOMIC_INVALID", 400);

      const sourceChain = toSourceChain(raw.sourceChain) ?? job.sourceChain;
      const burnMessageHash = toNonEmptyString(raw.burnMessageHash);
      if (burnMessageHash && !/^0x[0-9a-fA-F]{64}$/.test(burnMessageHash)) {
        return errJson("BURN_MESSAGE_HASH_INVALID", 400);
      }

      const updated = await prisma.cctpBridgeJob.update({
        where: { id: job.id },
        data: {
          sourceChain,
          status: "BURN_SUBMITTED",
          burnTxHash,
          burnAmountAtomic,
          burnMessageHash: burnMessageHash ?? null,
          failureReason: null,
          updatedAt: new Date(),
        },
      });
      return okJson({ job: jobView(updated) });
    }

    if (action === "FETCH_ATTESTATION") {
      const messageHash =
        toNonEmptyString(raw.burnMessageHash) ?? job.burnMessageHash;
      if (!messageHash) return errJson("BURN_MESSAGE_HASH_REQUIRED", 400);

      const result = await fetchIrisAttestationByMessageHash({ messageHash });
      if (!result.ok) {
        const attempts = job.attempts + 1;
        const failed = await prisma.cctpBridgeJob.update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            attempts,
            failureReason: result.reason,
            nextRetryAt: nextRetryDateFromAttempts(attempts),
            updatedAt: new Date(),
          },
        });
        return jsonResponse(
          { ok: false, error: result.reason, job: jobView(failed) },
          409
        );
      }

      const updated = await prisma.cctpBridgeJob.update({
        where: { id: job.id },
        data: {
          status: "ATTESTATION_READY",
          burnMessageHash: messageHash,
          attestation: result.attestation,
          attestationFetchedAt: new Date(),
          failureReason: null,
          nextRetryAt: null,
          updatedAt: new Date(),
        },
      });

      return okJson({ job: jobView(updated) });
    }

    if (action === "MARK_MINT_SUBMITTED") {
      const mintTxHash = toNonEmptyString(raw.mintTxHash);
      if (!mintTxHash || !isHash(mintTxHash)) {
        return errJson("MINT_TX_HASH_INVALID", 400);
      }

      const updated = await prisma.cctpBridgeJob.update({
        where: { id: job.id },
        data: {
          status: "MINT_SUBMITTED",
          mintTxHash,
          failureReason: null,
          nextRetryAt: null,
          updatedAt: new Date(),
        },
      });
      return okJson({ job: jobView(updated) });
    }

    if (action === "COMPLETE") {
      const mintTxHash = toNonEmptyString(raw.mintTxHash);
      if (mintTxHash && !isHash(mintTxHash)) {
        return errJson("MINT_TX_HASH_INVALID", 400);
      }

      const completed = await prisma.$transaction(async (tx) => {
        return markCctpJobCompletedAndSyncSettlement(tx, {
          jobId: job.id,
          mintTxHash: mintTxHash ?? job.mintTxHash,
        });
      });
      return okJson({ job: jobView(completed) });
    }

    if (action === "FAIL") {
      const reason = toNonEmptyString(raw.failureReason) ?? "MANUAL_FAILED";
      const attempts = job.attempts + 1;
      const updated = await prisma.cctpBridgeJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          attempts,
          failureReason: reason,
          nextRetryAt: nextRetryDateFromAttempts(attempts),
          updatedAt: new Date(),
        },
      });
      return okJson({ job: jobView(updated) });
    }

    // RETRY
    if (job.status !== "FAILED") {
      return errJson("RETRY_REQUIRES_FAILED", 400);
    }
    if (job.attempts >= job.maxAttempts) {
      return errJson("RETRY_LIMIT_EXCEEDED", 400);
    }

    const retried = await prisma.cctpBridgeJob.update({
      where: { id: job.id },
      data: {
        status: "PENDING",
        failureReason: null,
        nextRetryAt: null,
        updatedAt: new Date(),
      },
    });

    return okJson({ job: jobView(retried) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    console.error("PROJECT_CCTP_JOBS_POST_FAILED", e);
    return errJson("PROJECT_CCTP_JOBS_POST_FAILED", 500);
  }
}
