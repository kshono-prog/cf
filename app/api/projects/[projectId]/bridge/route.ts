// app/api/projects/[projectId]/bridge/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { JsonRpcProvider, Contract, formatUnits } from "ethers";
import type { Project } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { getOptionalServerPrivateKey } from "@/lib/env";
import {
  getEventRpcUrl,
  isSupportedEventChainId,
} from "@/lib/eventChainConfig";
import { requireOwnerSession } from "@/lib/ownerAuthSession";
import {
  isRecord,
  toBigIntOrThrow as _toBigIntOrThrow,
  toOptionalString,
} from "@/lib/api/guards";
import { errJson, jsonResponse, okJson } from "@/lib/api/responses";
import { decToString } from "@/lib/currencyUtils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Buffer を使うため（Edge回避）

type Params = { projectId: string };

type Currency = "JPYC";

function toBigIntOrThrow(v: string): bigint {
  return _toBigIntOrThrow(v, "PROJECT_ID_INVALID");
}

function toOptionalBoolean(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

function normalizeAddressOrThrow(
  v: string | null,
  code: string
): string | null {
  if (v === null) return null;
  const s = v.trim();
  if (s === "") return null;
  if (!/^0x[0-9a-fA-F]{40}$/.test(s)) throw new Error(code);
  return s.toLowerCase();
}

function normalizeChainIdOrThrow(
  v: number | null,
  code: string
): number | null {
  if (v === null) return null;
  const n = Math.trunc(v);
  if (!Number.isFinite(n) || n < 0) throw new Error(code);
  return n;
}

// "100.0000..." -> 100（JPYC 目標判定/カード用）
function decimalToJpycIntFloor(amountDecimal: Prisma.Decimal | null): number {
  if (!amountDecimal) return 0;
  const s = amountDecimal.toString();
  const [i] = s.split(".");
  const n = Number(i || "0");
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

type BalanceView = { raw: string; formatted: string };

// ===== request body =====
type Mode = "READ_ONCHAIN" | "EXECUTE";

type Body = {
  mode?: Mode;
  currency?: Currency;
  dryRun?: boolean;
  force?: boolean; // status gate bypass (demo)
};

function parseBody(raw: unknown): Body {
  if (!isRecord(raw)) return {};
  const modeRaw = toOptionalString(raw.mode);
  const currencyRaw = toOptionalString(raw.currency);
  const dryRunRaw = toOptionalBoolean(raw.dryRun);
  const forceRaw = toOptionalBoolean(raw.force);

  const body: Body = {};
  if (modeRaw === "READ_ONCHAIN" || modeRaw === "EXECUTE") body.mode = modeRaw;
  if (currencyRaw === "JPYC") body.currency = "JPYC";
  if (typeof dryRunRaw === "boolean") body.dryRun = dryRunRaw;
  if (typeof forceRaw === "boolean") body.force = forceRaw;

  return body;
}

// ===== token balance helper =====
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
] as const;

async function readErc20Balance(params: {
  rpcUrl: string;
  token: string;
  holder: string;
}): Promise<{ balance: BalanceView; decimals: number }> {
  const provider = new JsonRpcProvider(params.rpcUrl);
  const token = new Contract(params.token, ERC20_ABI, provider);

  const [rawBal, decimals] = await Promise.all([
    token.balanceOf(params.holder) as Promise<bigint>,
    token.decimals() as Promise<number>,
  ]);

  const raw = rawBal.toString();
  const formatted = formatUnits(rawBal, decimals);
  return { balance: { raw, formatted }, decimals };
}

// ===== serialize =====
function serializeProjectForBridge(project: Project) {
  return {
    id: project.id.toString(),
    status: project.status,
    title: project.title,
    description: project.description ?? null,
    purposeMode: project.purposeMode,
    creatorProfileId: project.creatorProfileId?.toString?.() ?? null,
    ownerAddress: project.ownerAddress ?? null,

    // existing L1 fields
    eventFundingChainId: project.eventFundingChainId ?? null,
    eventFundingSourceAddress: project.eventFundingSourceAddress ?? null,
    eventVaultAddress: project.eventVaultAddress ?? null,
    liquidityChainId: project.liquidityChainId ?? null,
    liquidityRecipientAddress: project.liquidityRecipientAddress ?? null,

    // future fields (Route A later)
    eventBlockchainId: project.eventBlockchainId ?? null,
    liquidityBlockchainId: project.liquidityBlockchainId ?? null,
    teleporterMessenger: project.teleporterMessenger ?? null,
    icttTokenAddress: project.icttTokenAddress ?? null,
    icttTokenHome: project.icttTokenHome ?? null,
    icttTokenRemote: project.icttTokenRemote ?? null,

    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

// Route B: “EXECUTE is log only”
// status gate（将来の実行切替に備えたチェック）は残す。force で迂回可能。
function canExecuteFromStatus(status: string): boolean {
  return status === "READY_TO_BRIDGE";
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { projectId: projectIdStr } = await ctx.params;
    const projectId = toBigIntOrThrow(projectIdStr);

    const raw = (await req.json().catch(() => ({}))) as unknown;
    const body = parseBody(raw);

    const mode: Mode = body.mode ?? "READ_ONCHAIN";
    const currency: Currency = body.currency ?? "JPYC";
    const dryRun = body.dryRun === true;
    const force = body.force === true;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { goal: true },
    });

    if (!project) {
      return errJson("PROJECT_NOT_FOUND", 404);
    }

    if (!project.ownerAddress) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
    }

    const ownerSession = await requireOwnerSession(req, project.ownerAddress);
    if (!ownerSession.ok) {
      return ownerSession.response;
    }

    const goal = project.goal ?? null;

    // ===== L1 config (existing) =====
    const eventChainId = normalizeChainIdOrThrow(
      project.eventFundingChainId ?? null,
      "EVENT_CHAIN_ID_INVALID"
    );
    const liquidityChainId = normalizeChainIdOrThrow(
      project.liquidityChainId ?? null,
      "LIQUIDITY_CHAIN_ID_INVALID"
    );

    const source = normalizeAddressOrThrow(
      project.eventFundingSourceAddress ?? null,
      "EVENT_FUNDING_SOURCE_ADDRESS_INVALID"
    );
    const vault = normalizeAddressOrThrow(
      project.eventVaultAddress ?? null,
      "EVENT_VAULT_ADDRESS_INVALID"
    );
    const recipient = normalizeAddressOrThrow(
      project.liquidityRecipientAddress ?? null,
      "LIQUIDITY_RECIPIENT_ADDRESS_INVALID"
    );

    if (
      eventChainId === null ||
      liquidityChainId === null ||
      source === null ||
      recipient === null
    ) {
      return errJson("EVENT_L1_CONFIG_INCOMPLETE", 400);
    }

    // JPYC token address mapping（既存方針のまま）
    const tokenEnvKey =
      eventChainId === 43114
        ? "EVENT_TOKEN_JPYC_AVAX"
        : eventChainId === 137
        ? "EVENT_TOKEN_JPYC_POLYGON"
        : eventChainId === 80002
        ? "EVENT_TOKEN_JPYC_POLYGON_AMOY"
        : null;

    if (!tokenEnvKey) {
      return jsonResponse(
        { ok: false, error: "EVENT_CHAIN_NOT_SUPPORTED", chainId: eventChainId },
        400
      );
    }

    const tokenAddressRaw = process.env[tokenEnvKey];
    if (!tokenAddressRaw) {
      return jsonResponse(
        { ok: false, error: "MISSING_EVENT_TOKEN_ADDRESS", key: tokenEnvKey },
        500
      );
    }

    const token = normalizeAddressOrThrow(
      tokenAddressRaw,
      "EVENT_TOKEN_ADDRESS_INVALID"
    );
    if (!token) {
      return errJson("EVENT_TOKEN_ADDRESS_INVALID", 500);
    }

    // ===== RPC selection =====
    const eventChainIdNum = Number(project.eventFundingChainId);
    if (!Number.isFinite(eventChainIdNum)) {
      return errJson("EVENT_CHAIN_ID_INVALID", 400);
    }

    if (!isSupportedEventChainId(eventChainIdNum)) {
      return jsonResponse(
        {
          ok: false,
          error: "EVENT_CHAIN_NOT_SUPPORTED",
          chainId: eventChainIdNum,
        },
        400
      );
    }

    const rpcUrl = getEventRpcUrl(eventChainIdNum);

    // ===== DB confirmed sum (progressHint / auditCard) =====
    const agg = await prisma.contribution.aggregate({
      where: {
        projectId,
        status: "CONFIRMED",
        currency,
      },
      _sum: { amountDecimal: true },
    });

    const confirmedAmountDecimal = agg._sum.amountDecimal ?? null;
    const dbConfirmedTotalInt = decimalToJpycIntFloor(confirmedAmountDecimal);

    // ===== on-chain balances =====
    const eventBalanceHolder = vault ?? source; // vault優先
    const [{ balance: eventBalance }, { balance: liquidityBalance }] =
      await Promise.all([
        readErc20Balance({ rpcUrl, token, holder: eventBalanceHolder }),
        readErc20Balance({ rpcUrl, token, holder: recipient }),
      ]);

    // ===== auditCard =====
    const recipientInt = Math.max(
      0,
      Math.floor(Number(liquidityBalance.formatted))
    );
    const diffInt = dbConfirmedTotalInt - recipientInt;

    const auditCard = {
      currency,
      vault: {
        address: eventBalanceHolder,
        balance: eventBalance,
      },
      recipient: {
        address: recipient,
        balance: liquidityBalance,
      },
      db: {
        confirmedTotalAmountDecimal: decToString(confirmedAmountDecimal),
        confirmedTotalInt: dbConfirmedTotalInt,
      },
      diff: {
        approxInt: diffInt,
        note: "diff is approximate (DB total vs on-chain recipient balance).",
      },
    } as const;

    const progressHint = {
      currency,
      dbConfirmedTotalAmountDecimal: decToString(confirmedAmountDecimal),
      dbConfirmedTotalInt,
      note: "dbConfirmedTotal is the sum of verified Transfer logs. On-chain balances may differ depending on how funds are moved.",
    } as const;

    // ===== mode: READ =====
    if (mode === "READ_ONCHAIN") {
      return okJson({
        mode: "READ_ONCHAIN",
        l1: {
          eventFunding: {
            chainId: eventChainId,
            source,
            vault,
            token,
            balance: eventBalance,
          },
          liquidity: {
            chainId: liquidityChainId,
            recipient,
            token,
            balance: liquidityBalance,
          },
        },
        progressHint,
        auditCard,
      });
    }

    // ===== mode: EXECUTE (Route B: log only) =====
    // status/goal gate（force=false なら厳格）
    if (!force) {
      if (!goal) {
        return errJson("GOAL_NOT_FOUND", 404);
      }
      if (!goal.achievedAt) {
        return errJson("GOAL_NOT_ACHIEVED", 400);
      }
      if (!canExecuteFromStatus(project.status)) {
        return jsonResponse(
          {
            ok: false,
            error: "PROJECT_STATUS_NOT_BRIDGABLE",
            status: project.status,
          },
          400
        );
      }
    }

    // dryRun: 事前検証のみ（DB更新なし）
    if (dryRun) {
      return okJson({
        mode: "EXECUTE",
        dryRun: true,
        force,
        simulated: true,
        project: serializeProjectForBridge(project),
        goal: goal
          ? {
              id: goal.id.toString(),
              projectId: goal.projectId.toString(),
              targetAmount: goal.targetAmount ?? goal.targetAmountJpyc,
              targetAmountJpyc: goal.targetAmount ?? goal.targetAmountJpyc,
              deadline: goal.deadline ? goal.deadline.toISOString() : null,
              achievedAt: goal.achievedAt
                ? goal.achievedAt.toISOString()
                : null,
              settlementPolicy: goal.settlementPolicy,
              createdAt: goal.createdAt.toISOString(),
              updatedAt: goal.updatedAt.toISOString(),
            }
          : null,
        l1: {
          eventFunding: {
            chainId: eventChainId,
            source,
            vault,
            token,
          },
          liquidity: {
            chainId: liquidityChainId,
            recipient,
            token,
          },
        },
        progressHint,
        auditCard,
        note: "Route B demo: EXECUTE is log-only. dryRun does not write DB.",
      });
    }

    // ---- LOG_ONLY: BridgeRun に統一して保存（project.status は絶対に変更しない）----
    const now = new Date();

    // 返却用の疑似tx（UIで表示したい場合だけ使う。DBには必須ではない）
    const pseudoTxHashIctt = `0x${Buffer.from(
      `ictt:${projectId.toString()}:${now.getTime()}`,
      "utf8"
    )
      .toString("hex")
      .padEnd(64, "0")
      .slice(0, 64)}`;

    const pseudoTxHashIcm = `0x${Buffer.from(
      `icm:${projectId.toString()}:${now.getTime()}`,
      "utf8"
    )
      .toString("hex")
      .padEnd(64, "0")
      .slice(0, 64)}`;

    // BridgeRun を作る（LOG_ONLY）
    // ※ BridgeRun 側のスキーマに合わせて select / data を調整してください。
    await prisma.bridgeRun.create({
      data: {
        projectId,
        mode: "LOG_ONLY",
        currency,
        dryRun: false,
        force,
        dbConfirmedTotalAmountDecimal: decToString(confirmedAmountDecimal),
        // 追加フィールドがあるならここに保存（例: auditJson, note など）
      } as never,
    });

    const operatorPkPresent =
      getOptionalServerPrivateKey("EVENT_OPERATOR_PRIVATE_KEY") !== null;

    return okJson({
      mode: "EXECUTE",
      simulated: true,
      force,
      operatorPkPresent,
      txHashIctt: pseudoTxHashIctt,
      txHashIcm: pseudoTxHashIcm,
      project: serializeProjectForBridge(project), // status は変わらない
      goal: goal
        ? {
            id: goal.id.toString(),
            projectId: goal.projectId.toString(),
            targetAmount: goal.targetAmount ?? goal.targetAmountJpyc,
            targetAmountJpyc: goal.targetAmount ?? goal.targetAmountJpyc,
            deadline: goal.deadline ? goal.deadline.toISOString() : null,
            achievedAt: goal.achievedAt ? goal.achievedAt.toISOString() : null,
            settlementPolicy: goal.settlementPolicy,
            createdAt: goal.createdAt.toISOString(),
            updatedAt: goal.updatedAt.toISOString(),
          }
        : null,
      l1: {
        eventFunding: {
          chainId: eventChainId,
          source,
          vault,
          token,
          balance: eventBalance,
        },
        liquidity: {
          chainId: liquidityChainId,
          recipient,
          token,
          balance: liquidityBalance,
        },
      },
      progressHint,
      auditCard,
      note: "Route B demo: EXECUTE wrote BridgeRun(LOG_ONLY). Project status was not changed.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);

    if (msg === "PROJECT_ID_INVALID") {
      return errJson("PROJECT_ID_INVALID", 400);
    }

    // config errors
    if (
      msg === "MISSING_EVENT_RPC_POLYGON" ||
      msg === "MISSING_EVENT_RPC_POLYGON_AMOY" ||
      msg === "MISSING_EVENT_RPC_AVAX" ||
      msg === "MISSING_EVENT_OPERATOR_PRIVATE_KEY"
    ) {
      return errJson(msg, 500);
    }

    // input normalization errors
    const badReqErrors = new Set([
      "EVENT_CHAIN_ID_INVALID",
      "LIQUIDITY_CHAIN_ID_INVALID",
      "EVENT_FUNDING_SOURCE_ADDRESS_INVALID",
      "EVENT_VAULT_ADDRESS_INVALID",
      "LIQUIDITY_RECIPIENT_ADDRESS_INVALID",
      "EVENT_TOKEN_ADDRESS_INVALID",
    ]);
    if (badReqErrors.has(msg)) {
      return errJson(msg, 400);
    }

    console.error("PROJECT_BRIDGE_POST_FAILED", e);
    return errJson("PROJECT_BRIDGE_POST_FAILED", 500);
  }
}
