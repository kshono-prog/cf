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
  assertDistributionWithinBridged,
  ensureProjectSettlement,
  recomputeProjectSettlement,
  toAtomicDecimalOrNull,
} from "@/lib/projectSettlement";
import { isPrismaUnavailableError, withPrismaRetry } from "@/lib/prismaRetry";

type Params = { projectId: string };
type SettlementBridgeDb = Pick<typeof prisma, "project" | "$transaction">;

type Body = {
  address?: unknown;
  sourceChain?: unknown;
  token?: unknown;
  bridgedAmountAtomic?: unknown;
  txHash?: unknown;
  completedAt?: unknown;
  memo?: unknown;
};

function toSourceChain(v: unknown): "POLYGON" | "ETHEREUM" | null {
  return v === "POLYGON" || v === "ETHEREUM" ? v : null;
}

function toToken(v: unknown): "JPYC" | "USDC" | null {
  return v === "JPYC" || v === "USDC" ? v : null;
}

function toOptionalHash(v: unknown): string | null {
  if (v === null || typeof v === "undefined") return null;
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return isHash(s) ? s : null;
}

function toOptionalDate(v: unknown): Date | null {
  if (v === null || typeof v === "undefined") return null;
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type SettlementBridgeRouteDeps = {
  db?: SettlementBridgeDb;
  requireOwnerSession?: typeof requireOwnerSession;
  withPrismaRetry?: typeof withPrismaRetry;
  isPrismaUnavailableError?: typeof isPrismaUnavailableError;
  ensureProjectSettlement?: (
    tx: Parameters<typeof ensureProjectSettlement>[0],
    projectId: bigint
  ) => Promise<unknown>;
  assertDistributionWithinBridged?: (
    tx: Parameters<typeof assertDistributionWithinBridged>[0],
    projectId: bigint
  ) => Promise<unknown>;
  recomputeProjectSettlement?: typeof recomputeProjectSettlement;
  now?: () => Date;
};

export async function handleProjectSettlementBridgePost(
  req: NextRequest,
  ctx: { params: Promise<Params> },
  deps: SettlementBridgeRouteDeps = {}
): Promise<NextResponse> {
  try {
    const db = deps.db ?? prisma;
    const runWithRetry = deps.withPrismaRetry ?? withPrismaRetry;
    const requireOwnerSessionFn =
      deps.requireOwnerSession ?? requireOwnerSession;
    const ensureProjectSettlementFn =
      deps.ensureProjectSettlement ?? ensureProjectSettlement;
    const assertDistributionWithinBridgedFn =
      deps.assertDistributionWithinBridged ?? assertDistributionWithinBridged;
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

    const sourceChain = toSourceChain((raw as Body).sourceChain);
    if (!sourceChain) return errJson("SOURCE_CHAIN_INVALID", 400);

    const token = toToken((raw as Body).token);
    if (!token) return errJson("TOKEN_INVALID", 400);

    const bridgedAmount = toAtomicDecimalOrNull((raw as Body).bridgedAmountAtomic);
    if (!bridgedAmount) return errJson("BRIDGED_AMOUNT_INVALID", 400);

    const txHash = toOptionalHash((raw as Body).txHash);
    if ((raw as Body).txHash && !txHash) return errJson("TX_HASH_INVALID", 400);

    const completedAt = toOptionalDate((raw as Body).completedAt);
    if ((raw as Body).completedAt && !completedAt) {
      return errJson("COMPLETED_AT_INVALID", 400);
    }

    const memo = toNonEmptyString((raw as Body).memo);

    const project = await runWithRetry(() =>
      db.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          ownerAddress: true,
          goal: {
            select: { achievedAt: true },
          },
        },
      })
    );

    if (!project) return errJson("PROJECT_NOT_FOUND", 404);

    const owner = lowerOrNull(project.ownerAddress);
    if (!owner || owner !== wallet.toLowerCase()) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
    }
    if (!project.goal?.achievedAt) {
      return errJson("BRIDGE_REQUIRES_GOAL_ACHIEVED", 400);
    }

    const now = deps.now?.() ?? new Date();

    const result = await runWithRetry(() =>
      db.$transaction(async (tx) => {
        const step = await tx.projectBridgeStep.upsert({
          where: {
            projectId_sourceChain_destinationChain_token: {
              projectId,
              sourceChain,
              destinationChain: "AVALANCHE",
              token,
            },
          },
          create: {
            projectId,
            sourceChain,
            destinationChain: "AVALANCHE",
            token,
            status: "COMPLETED",
            bridgedAmountAtomic: bridgedAmount,
            txHash,
            completedAt: completedAt ?? now,
            memo: memo ?? null,
            recordedByWallet: wallet,
          },
          update: {
            status: "COMPLETED",
            bridgedAmountAtomic: bridgedAmount,
            txHash,
            completedAt: completedAt ?? now,
            memo: memo ?? null,
            recordedByWallet: wallet,
            updatedAt: now,
          },
        });

        await ensureProjectSettlementFn(tx, projectId);
        await assertDistributionWithinBridgedFn(tx, projectId);
        const settlement = await recomputeProjectSettlementFn(tx, projectId);

        return { step, settlement };
      })
    );

    return okJson({
      bridgeStep: {
        id: result.step.id,
        sourceChain: result.step.sourceChain,
        destinationChain: result.step.destinationChain,
        token: result.step.token,
        status: result.step.status,
        bridgedAmountAtomic: result.step.bridgedAmountAtomic.toString(),
        txHash: result.step.txHash,
        completedAt: result.step.completedAt?.toISOString() ?? null,
        memo: result.step.memo,
      },
      settlement: {
        status: result.settlement.status,
        bridgedTotalAtomic: result.settlement.bridgedTotalAtomic.toString(),
        distributedTotalAtomic: result.settlement.distributedTotalAtomic.toString(),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    if (msg === "DISTRIBUTION_SUM_EXCEEDS_BRIDGED_AMOUNT") {
      return errJson("DISTRIBUTION_SUM_EXCEEDS_BRIDGED_AMOUNT", 409);
    }
    if ((deps.isPrismaUnavailableError ?? isPrismaUnavailableError)(e)) {
      return errJson("DB_UNAVAILABLE", 503);
    }
    console.error("PROJECT_SETTLEMENT_BRIDGE_POST_FAILED", e);
    return errJson("PROJECT_SETTLEMENT_BRIDGE_POST_FAILED", 500);
  }
}
