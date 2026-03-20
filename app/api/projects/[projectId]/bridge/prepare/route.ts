/* app/api/projects/[projectId]/bridge/prepare/route.ts */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  toBigIntOrThrow,
  lowerOrNull,
  toNonEmptyString,
  toBool,
} from "@/lib/api/guards";
import { isAddress, getAddress, type Address } from "viem";
import { requireOwnerSessionFromBody } from "@/lib/ownerAuthSession";
import { getPublicEnv } from "@/lib/publicEnv";

export const dynamic = "force-dynamic";

import { toCurrency, type CurrencyCode } from "@/lib/currencyUtils";

type Params = { projectId: string };
type Currency = CurrencyCode;

type Provider = "WORMHOLE_UI" | "MANUAL";
const publicEnv = getPublicEnv();

function toProvider(v: unknown): Provider | null {
  return v === "WORMHOLE_UI" || v === "MANUAL" ? v : null;
}

function toAddressStrict(v: unknown): Address | null {
  if (typeof v !== "string") return null;
  if (!isAddress(v)) return null;
  return getAddress(v);
}

function buildWormholeBridgeUrl(): string {
  // Wormhole Portal (Token Bridge) の一般的な URL
  // チェーン prefill は仕様変動がありうるため「固定URL + 誘導文」を基本にする
  // 必要なら将来クエリを確定させて組み立てる
  return "https://portalbridge.com/";
}

function pickDestinationTokenAddress(params: {
  projectTokenAddress: string | null | undefined;
  liquidityChainId: number;
  currency: Currency;
}): string | null {
  const byProject = params.projectTokenAddress?.trim() ?? "";
  if (byProject) return byProject;

  // Fallback: chain/currency別 env を利用
  if (params.liquidityChainId === 43114 || params.liquidityChainId === 43113) {
    if (params.currency === "JPYC") {
      return publicEnv.jpycAddressAvax ?? publicEnv.jpycAddress;
    }
    if (params.currency === "USDC") {
      return publicEnv.usdcAddressAvax ?? publicEnv.usdcAddress;
    }
  }

  return null;
}

function envAddress(name: string): Address | null {
  const v = process.env[name];
  if (!v || !isAddress(v)) return null;
  return getAddress(v);
}

function envHex32(name: string): `0x${string}` | null {
  const v = process.env[name];
  if (!v || !/^0x[0-9a-fA-F]{64}$/.test(v)) return null;
  return v as `0x${string}`;
}

function resolveIcttPrefix(sourceChainId: number): string | null {
  if (sourceChainId === 137) return "POLYGON";
  if (sourceChainId === 80002) return "POLYGON_AMOY";
  if (sourceChainId === 1) return "ETHEREUM";
  if (sourceChainId === 11155111) return "ETHEREUM_SEPOLIA";
  return null;
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
    const addr = ownerSession.address;

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
    const tokenAddress =
      pickDestinationTokenAddress({
        projectTokenAddress: project.icttTokenAddress,
        liquidityChainId,
        currency,
      }) ?? "";
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

    const wormholeUrl = buildWormholeBridgeUrl();

    const instruction =
      provider === "WORMHOLE_UI"
        ? "Wormhole UIで Polygon → Avalanche を選び、完了後に Avalanche 側の着金 txHash（Snowtraceで確認できるもの）を貼り付けてください。"
        : "任意の方法で Polygon → Avalanche をブリッジし、完了後に Avalanche 側の着金 txHash（Snowtraceで確認できるもの）を貼り付けてください。";

    const icttPrefix = resolveIcttPrefix(eventFundingChainId);
    const envIctt = icttPrefix
      ? {
          tokenTransferrerAddress: envAddress(
            `NEXT_PUBLIC_ICTT_${icttPrefix}_TOKEN_TRANSFERRER`
          ),
          destinationBlockchainId: envHex32(
            `NEXT_PUBLIC_ICTT_${icttPrefix}_DEST_BLOCKCHAIN_ID`
          ),
          destinationTokenTransferrerAddress: envAddress(
            `NEXT_PUBLIC_ICTT_${icttPrefix}_DEST_TOKEN_TRANSFERRER`
          ),
          sourceTokenAddress: envAddress(
            `NEXT_PUBLIC_ICTT_${icttPrefix}_${currency}_SOURCE_TOKEN`
          ),
          requiredGasLimitRaw:
            process.env[`NEXT_PUBLIC_ICTT_${icttPrefix}_REQUIRED_GAS_LIMIT`] ??
            "",
          tokenDecimalsRaw:
            process.env[`NEXT_PUBLIC_ICTT_${icttPrefix}_${currency}_DECIMALS`] ??
            "",
        }
      : null;

    const requiredGasLimit =
      envIctt && /^\d+$/.test(envIctt.requiredGasLimitRaw)
        ? envIctt.requiredGasLimitRaw
        : "250000";
    const tokenDecimals =
      envIctt && /^\d+$/.test(envIctt.tokenDecimalsRaw)
        ? Number(envIctt.tokenDecimalsRaw)
        : 18;

    const projectIcttTokenHome = toAddressStrict(project.icttTokenHome ?? null);
    const projectIcttTokenRemote = toAddressStrict(project.icttTokenRemote ?? null);
    const projectLiquidityBlockchainId =
      project.liquidityBlockchainId &&
      /^0x[0-9a-fA-F]{64}$/.test(project.liquidityBlockchainId)
        ? (project.liquidityBlockchainId as `0x${string}`)
        : null;
    const projectSourceTokenAddress = toAddressStrict(project.icttTokenAddress ?? null);

    const resolvedIcttTokenTransferrer =
      envIctt?.tokenTransferrerAddress ?? projectIcttTokenHome;
    const resolvedIcttDestinationBlockchainId =
      envIctt?.destinationBlockchainId ?? projectLiquidityBlockchainId;
    const resolvedIcttDestinationTokenTransferrer =
      envIctt?.destinationTokenTransferrerAddress ?? projectIcttTokenRemote;
    const resolvedIcttSourceTokenAddress =
      envIctt?.sourceTokenAddress ?? projectSourceTokenAddress;

    const icttReady =
      !!resolvedIcttTokenTransferrer &&
      !!resolvedIcttDestinationBlockchainId &&
      !!resolvedIcttDestinationTokenTransferrer;
    const icttMissing: string[] = [];
    if (!resolvedIcttTokenTransferrer) {
      icttMissing.push(
        `tokenTransferrerAddress (env: NEXT_PUBLIC_ICTT_${icttPrefix ?? "UNKNOWN"}_TOKEN_TRANSFERRER / project: icttTokenHome)`
      );
    }
    if (!resolvedIcttDestinationBlockchainId) {
      icttMissing.push(
        `destinationBlockchainId (env: NEXT_PUBLIC_ICTT_${icttPrefix ?? "UNKNOWN"}_DEST_BLOCKCHAIN_ID / project: liquidityBlockchainId)`
      );
    }
    if (!resolvedIcttDestinationTokenTransferrer) {
      icttMissing.push(
        `destinationTokenTransferrerAddress (env: NEXT_PUBLIC_ICTT_${icttPrefix ?? "UNKNOWN"}_DEST_TOKEN_TRANSFERRER / project: icttTokenRemote)`
      );
    }

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
      ictt: {
        ready: icttReady,
        tokenTransferrerAddress: resolvedIcttTokenTransferrer,
        destinationBlockchainId: resolvedIcttDestinationBlockchainId,
        destinationTokenTransferrerAddress:
          resolvedIcttDestinationTokenTransferrer,
        sourceTokenAddress: resolvedIcttSourceTokenAddress,
        requiredGasLimit,
        tokenDecimals,
        missing: icttMissing,
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
