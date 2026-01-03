// app/api/projects/[projectId]/distribution/execute/route.ts
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
  address?: unknown; // ownerチェック
  chainId?: unknown; // 43114/43113
  currency?: unknown; // "JPYC"|"USDC"
  txHashes?: unknown; // string[]
  dryRun?: unknown;
  note?: unknown;
};

function toChainId(v: unknown): number | null {
  if (typeof v !== "number") return null;
  if (!Number.isFinite(v)) return null;
  return v;
}

function toCurrency(v: unknown): "JPYC" | "USDC" | null {
  return v === "JPYC" || v === "USDC" ? v : null;
}

function toBool(v: unknown): boolean {
  return v === true;
}

function parseTxHashes(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const x of v) {
    if (typeof x !== "string") return null;
    const s = x.trim();
    if (!s) return null;
    if (!isHash(s)) return null;
    out.push(s);
  }
  return out;
}

function isDistributeAllowLogOnly(): boolean {
  // デモ/検証用：Route B（Bridge LOG_ONLY）でもDistributionを通す
  // 本番では未設定/false を前提
  return process.env.DISTRIBUTE_ALLOW_LOG_ONLY === "true";
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

    const addr = toAddressOrNull((raw as Body).address);
    if (!addr) return errJson("ADDRESS_REQUIRED", 400);

    const chainId = toChainId((raw as Body).chainId);
    if (chainId == null) return errJson("CHAIN_ID_REQUIRED", 400);

    const currency = toCurrency((raw as Body).currency) ?? "JPYC";

    const txHashes = parseTxHashes((raw as Body).txHashes);
    if (!txHashes) return errJson("TX_HASHES_INVALID", 400);

    const dryRun = toBool((raw as Body).dryRun);
    const note = toNonEmptyString((raw as Body).note);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        ownerAddress: true,
        status: true,
        bridgedAt: true,
      },
    });
    if (!project) return errJson("PROJECT_NOT_FOUND", 404);

    const owner = lowerOrNull(project.ownerAddress);
    if (!owner || owner !== addr.toLowerCase()) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
    }

    // ✅ 分離ルール：原則 BRIDGED 後のみ
    // ただしデモ/検証時は env で LOG_ONLY ブリッジ後も許可する
    if (!project.bridgedAt || project.status !== "BRIDGED") {
      if (!isDistributeAllowLogOnly()) {
        return errJson("DISTRIBUTE_REQUIRES_BRIDGED", 400);
      }

      // ---- LOG_ONLY 許可時の最低限ガード ----
      // 1) Goal達成済み（事故防止）
      const goal = await prisma.goal.findFirst({
        where: { projectId },
        select: { achievedAt: true },
      });
      if (!goal || !goal.achievedAt) {
        return errJson("DISTRIBUTE_REQUIRES_GOAL_ACHIEVED", 400);
      }

      // 2) BridgeRun が存在する（Route B の “実行済み” の代替証跡）
      const latestBridge = await prisma.bridgeRun.findFirst({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        select: { id: true, mode: true, createdAt: true, dryRun: true },
      });

      if (!latestBridge) {
        return errJson("DISTRIBUTE_REQUIRES_BRIDGE_RUN", 400);
      }

      // 厳密にするなら LOG_ONLY のみ許可（Route B 前提）
      if (latestBridge.mode !== "LOG_ONLY") {
        return errJson("DISTRIBUTE_REQUIRES_LOG_ONLY_BRIDGE_RUN", 400);
      }
    }

    // ✅ 最新 plan を DistributionRun(mode=PLAN_ONLY) から取る
    const latestPlan = await prisma.distributionRun.findFirst({
      where: { projectId, mode: "PLAN_ONLY" },
      orderBy: { createdAt: "desc" },
      select: { planJson: true },
    });
    if (!latestPlan) return errJson("DISTRIBUTION_PLAN_NOT_SET", 400);

    const now = new Date();

    const run = await prisma.$transaction(async (tx) => {
      const created = await tx.distributionRun.create({
        data: {
          projectId,
          mode: "LOG_ONLY",
          chainId,
          currency,
          planJson: latestPlan.planJson as never,
          txHashes: txHashes as never,
          dryRun,
          note: note ?? undefined,
        },
        select: { id: true, createdAt: true },
      });

      // NOTE:
      // Route B（確認）を徹底するなら、ここで status を変えない運用も可能。
      // ただし現状仕様は「dryRun=false のとき DISTRIBUTED に更新」。
      if (!dryRun) {
        await tx.project.update({
          where: { id: projectId },
          data: {
            status: "DISTRIBUTED",
            updatedAt: now,
          },
        });
      }

      return created;
    });

    return okJson({
      distributionRunId: run.id,
      dryRun,
      distributed: !dryRun,
      loggedAt: run.createdAt.toISOString(),
      txHashes,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    console.error("DISTRIBUTION_EXECUTE_FAILED", e);
    return errJson("DISTRIBUTION_EXECUTE_FAILED", 500);
  }
}
