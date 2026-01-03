/* app/api/projects/[projectId]/bridge/prepare/route.ts */
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
} from "@/lib/api/guards";
import { isAddress, getAddress, type Address } from "viem";

export const dynamic = "force-dynamic";

type Params = { projectId: string };
type Currency = "JPYC" | "USDC";

type Provider = "WORMHOLE_UI" | "MANUAL";

type Body = {
  address?: unknown; // ownerチェック用（接続アドレス）
  currency?: unknown; // "JPYC" | "USDC"
  provider?: unknown; // "WORMHOLE_UI" | "MANUAL"
  dryRun?: unknown;
  force?: unknown;
  note?: unknown;

  // 任意: Wormhole UI の prefill に使いたい場合（なくてもOK）
  // amountHuman?: unknown;
};

function toCurrency(v: unknown): Currency | null {
  return v === "JPYC" || v === "USDC" ? v : null;
}

function toProvider(v: unknown): Provider | null {
  return v === "WORMHOLE_UI" || v === "MANUAL" ? v : null;
}

function toAddressStrict(v: unknown): Address | null {
  if (typeof v !== "string") return null;
  if (!isAddress(v)) return null;
  return getAddress(v);
}

function buildWormholeBridgeUrl(params: {
  // 最低限チェーン同士だけでもOK。トークンやamountはUI側で選べる
  fromChainId: number; // Polygon=137
  toChainId: number; // Avalanche=43114 or Fuji=43113
}): string {
  // Wormhole Portal (Token Bridge) の一般的な URL
  // チェーン prefill は仕様変動がありうるため「固定URL + 誘導文」を基本にする
  // 必要なら将来クエリを確定させて組み立てる
  return "https://portalbridge.com/";
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
    const provider = toProvider(raw.provider) ?? "WORMHOLE_UI";
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

    // すでに BRIDGED の場合は force がないと弾く（誤操作防止）
    if (project.status === "BRIDGED" && !force) {
      return errJson("ALREADY_BRIDGED", 400);
    }

    // ブリッジ設定（Project側に保存されている前提）
    const eventFundingChainId = project.eventFundingChainId ?? 137; // Polygon
    const liquidityChainId = project.liquidityChainId ?? 43114; // Avalanche

    // 送信主体（owner or 任意）
    const sourceAddress = project.eventFundingSourceAddress ?? addr;
    const vaultAddress = project.eventVaultAddress ?? "";

    // 宛先（Avalanche側の受領アドレス）
    const recipientAddress = project.liquidityRecipientAddress ?? addr;

    // 宛先で「着金検証」に使う tokenAddress（Avalanche 側のトークン）
    // 現状 project.icttTokenAddress を流用（後で destTokenAddress 等に分離してもOK）
    const tokenAddress = project.icttTokenAddress ?? "";
    const tokenAddr = toAddressStrict(tokenAddress);
    if (!tokenAddr) return errJson("DEST_TOKEN_ADDRESS_REQUIRED", 400);

    const recipientAddr = toAddressStrict(recipientAddress);
    if (!recipientAddr) return errJson("RECIPIENT_ADDRESS_INVALID", 400);

    // DB正：CONFIRMED 合計スナップショット（この値を「ブリッジ量」として使う）
    const sum = await prisma.contribution.aggregate({
      where: { projectId, status: "CONFIRMED", currency },
      _sum: { amountDecimal: true },
    });
    const total = sum._sum.amountDecimal ?? new Prisma.Decimal(0);

    if (total.lte(0) && !force) {
      return errJson("NO_CONFIRMED_AMOUNT_TO_BRIDGE", 400);
    }

    const now = new Date();

    const wormholeUrl = buildWormholeBridgeUrl({
      fromChainId: eventFundingChainId,
      toChainId: liquidityChainId,
    });

    const instruction =
      provider === "WORMHOLE_UI"
        ? "Wormhole UIで Polygon → Avalanche を選び、完了後に Avalanche 側の着金 txHash（Snowtraceで確認できるもの）を貼り付けてください。"
        : "任意の方法で Polygon → Avalanche をブリッジし、完了後に Avalanche 側の着金 txHash（Snowtraceで確認できるもの）を貼り付けてください。";

    // BridgeRun を作る（ここでは Project.status は進めない）
    const run = await prisma.bridgeRun.create({
      data: {
        projectId,
        mode: provider, // "WORMHOLE_UI" | "MANUAL"
        currency,
        eventFundingChainId,
        liquidityChainId,
        sourceAddress,
        vaultAddress,
        recipientAddress: recipientAddr,
        tokenAddress: tokenAddr,
        dbConfirmedTotalAmountDecimal: total.toString(),
        deltaHintJson: {},
        dryRun,
        force,
        note: note ?? undefined,
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
        createdAt: true,
      },
    });

    return okJson({
      prepared: true,
      provider: run.mode, // "WORMHOLE_UI" | "MANUAL"
      bridgeRunId: run.id,
      currency: run.currency,
      dryRun: run.dryRun,
      force: run.force,
      snapshotConfirmedTotalAmountDecimal: run.dbConfirmedTotalAmountDecimal,

      source: {
        chainId: run.eventFundingChainId,
        fromAddress: run.sourceAddress,
        vaultAddress: run.vaultAddress,
      },
      destination: {
        chainId: run.liquidityChainId,
        recipientAddress: run.recipientAddress,
      },
      token: {
        // reverify はこれを使って Transfer を探す（Avalanche 側 token）
        address: run.tokenAddress,
      },

      ui: {
        wormholeUrl,
        instruction,
        // 運用上の注意（dest tx hash を貼る）
        expectTxHashOn: "DESTINATION_CHAIN",
        expectedExplorerHint:
          run.liquidityChainId === 43114
            ? "Snowtrace (Avalanche)"
            : "Fuji explorer",
      },

      createdAt: run.createdAt.toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    console.error("BRIDGE_PREPARE_FAILED", e);
    return errJson("BRIDGE_PREPARE_FAILED", 500);
  }
}
