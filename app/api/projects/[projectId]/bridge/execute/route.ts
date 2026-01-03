/* app/api/projects/[projectId]/bridge/execute/route.ts */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  toAddressOrNull,
  toBigIntOrThrow,
  lowerOrNull,
  toNonEmptyString,
  toBool,
  toNumberOrNull,
} from "@/lib/api/guards";

export const dynamic = "force-dynamic";

type Params = { projectId: string };
type Currency = "JPYC" | "USDC";

type Body = {
  address?: unknown; // ownerチェック用（接続アドレス）
  currency?: unknown; // "JPYC" | "USDC"
  dryRun?: unknown;
  force?: unknown;
  note?: unknown;
};

function toCurrency(v: unknown): Currency | null {
  return v === "JPYC" || v === "USDC" ? v : null;
}

function decimalToString(d: Prisma.Decimal | null | undefined): string {
  if (!d) return "0";
  return d.toString();
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

    const addr = toAddressOrNull(raw.address);
    if (!addr) return errJson("ADDRESS_REQUIRED", 400);

    const currency = toCurrency(raw.currency) ?? "JPYC";
    const dryRun = toBool(raw.dryRun);
    const force = toBool(raw.force);
    const note = toNonEmptyString(raw.note);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { goal: true },
    });
    if (!project) return errJson("PROJECT_NOT_FOUND", 404);

    const owner = lowerOrNull(project.ownerAddress);
    if (!owner || owner !== addr.toLowerCase()) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
    }

    // ブリッジは「達成確定」後のみ
    if (!project.goal || !project.goal.achievedAt) {
      return errJson("BRIDGE_REQUIRES_GOAL_ACHIEVED", 400);
    }

    // 既に BRIDGED を確定済みなら force が必要（運用ポリシー）
    if (project.status === "BRIDGED" && !force) {
      return errJson("ALREADY_BRIDGED", 400);
    }

    // DB正：CONFIRMED合計スナップショット
    const sum = await prisma.contribution.aggregate({
      where: { projectId, status: "CONFIRMED", currency },
      _sum: { amountDecimal: true },
    });

    const totalDecimal = sum._sum.amountDecimal ?? new Prisma.Decimal(0);

    // プロジェクト側の必須設定（最低限）
    const eventFundingChainId = project.eventFundingChainId ?? 137;
    const liquidityChainId = project.liquidityChainId ?? 43114;

    const sourceAddress = project.eventFundingSourceAddress ?? addr;
    const vaultAddress = project.eventVaultAddress ?? "";
    const recipientAddress = project.liquidityRecipientAddress ?? addr;
    const tokenAddress = project.icttTokenAddress ?? "";

    if (!vaultAddress) return errJson("EVENT_VAULT_ADDRESS_REQUIRED", 400);
    if (!recipientAddress) return errJson("LIQUIDITY_RECIPIENT_REQUIRED", 400);
    if (!tokenAddress) return errJson("ICTT_TOKEN_ADDRESS_REQUIRED", 400);

    const now = new Date();

    // ✅ execute は「PREPARE」：BridgeRun を作るだけ。Project.status を BRIDGED にしない
    const run = await prisma.bridgeRun.create({
      data: {
        projectId,
        mode: "PREPARE",
        currency,
        eventFundingChainId,
        liquidityChainId,
        sourceAddress,
        vaultAddress,
        recipientAddress,
        tokenAddress,
        dbConfirmedTotalAmountDecimal: decimalToString(totalDecimal),
        dryRun,
        force,
        note: note ?? undefined,
        deltaHintJson: {},
        createdAt: now,
      },
      select: {
        id: true,
        mode: true,
        currency: true,
        eventFundingChainId: true,
        liquidityChainId: true,
        sourceAddress: true,
        vaultAddress: true,
        recipientAddress: true,
        tokenAddress: true,
        dbConfirmedTotalAmountDecimal: true,
        dryRun: true,
        force: true,
        note: true,
        createdAt: true,
      },
    });

    // フロントがこのレスポンスを使って「ウォレット署名→tx送信」する
    return okJson({
      prepared: true,
      bridgeRunId: run.id,
      // これらをフロントでICTT送信に使う
      bridgeParams: {
        currency: run.currency,
        fromChainId: run.eventFundingChainId,
        toChainId: run.liquidityChainId,
        sourceAddress: run.sourceAddress,
        vaultAddress: run.vaultAddress,
        recipientAddress: run.recipientAddress,
        tokenAddress: run.tokenAddress,
        amountDecimal: run.dbConfirmedTotalAmountDecimal ?? "0",
      },
      dryRun: run.dryRun,
      createdAt: run.createdAt.toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    console.error("PROJECT_BRIDGE_PREPARE_FAILED", e);
    return errJson("PROJECT_BRIDGE_PREPARE_FAILED", 500);
  }
}
