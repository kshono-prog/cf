/* app/api/projects/[projectId]/bridge/reverify/route.ts */
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
import {
  createPublicClient,
  decodeEventLog,
  http,
  isAddress,
  parseAbiItem,
  type Address,
} from "viem";
import { avalanche, avalancheFuji } from "viem/chains";

export const dynamic = "force-dynamic";

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

type Params = { projectId: string };

type Body = {
  address?: unknown; // owner
  bridgeRunId?: unknown; // optional: 特定 run を指定したい場合
};

function getAvalancheChain(chainId: number) {
  if (chainId === 43114) return avalanche;
  if (chainId === 43113) return avalancheFuji;
  return null;
}

function getRpcUrl(chainId: number): string | null {
  if (chainId === 43114) return process.env.AVALANCHE_RPC_URL ?? null;
  if (chainId === 43113) return process.env.AVALANCHE_FUJI_RPC_URL ?? null;
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

    const addr = toAddressOrNull(raw.address);
    if (!addr) return errJson("ADDRESS_REQUIRED", 400);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerAddress: true, status: true },
    });
    if (!project) return errJson("PROJECT_NOT_FOUND", 404);

    const owner = lowerOrNull(project.ownerAddress);
    if (!owner || owner !== addr.toLowerCase()) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
    }

    const bridgeRunId = toNonEmptyString(raw.bridgeRunId);

    const run = bridgeRunId
      ? await prisma.bridgeRun.findUnique({
          where: { id: bridgeRunId },
        })
      : await prisma.bridgeRun.findFirst({
          where: {
            projectId,
            bridgeTxHash: { not: null },
            confirmedAt: null,
          },
          orderBy: { createdAt: "desc" },
        });

    if (!run) return errJson("BRIDGE_RUN_NOT_FOUND", 404);
    if (run.projectId !== projectId) return errJson("BRIDGE_RUN_MISMATCH", 400);

    if (!run.bridgeTxHash) return errJson("BRIDGE_TX_HASH_NOT_SET", 400);

    const chain = getAvalancheChain(run.liquidityChainId);
    const rpcUrl = getRpcUrl(run.liquidityChainId);
    if (!chain || !rpcUrl) {
      return errJson("DEST_CHAIN_NOT_SUPPORTED", 400);
    }

    if (!isAddress(run.recipientAddress)) {
      return errJson("RECIPIENT_ADDRESS_INVALID", 400);
    }
    if (!isAddress(run.tokenAddress)) {
      return errJson("DEST_TOKEN_ADDRESS_INVALID", 400);
    }

    const client = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    // Avalanche 側の tx receipt を読む
    let receipt: Awaited<
      ReturnType<typeof client.getTransactionReceipt>
    > | null = null;

    try {
      receipt = await client.getTransactionReceipt({
        hash: run.bridgeTxHash as `0x${string}`,
      });
    } catch {
      // まだ反映されていない/txHash違い等
      return okJson({
        verified: false,
        confirmed: false,
        reason: "TX_RECEIPT_NOT_FOUND_YET",
        bridgeRunId: run.id,
      });
    }

    if (!receipt) {
      return okJson({
        verified: false,
        confirmed: false,
        reason: "TX_RECEIPT_NOT_FOUND_YET",
        bridgeRunId: run.id,
      });
    }

    if (receipt.status !== "success") {
      return okJson({
        verified: false,
        confirmed: false,
        reason: "TX_REVERTED",
        bridgeRunId: run.id,
      });
    }

    const tokenLower = run.tokenAddress.toLowerCase();
    const recipientLower = run.recipientAddress.toLowerCase();

    let received = false;

    for (const log of receipt.logs) {
      if (!log.address) continue;
      if (log.address.toLowerCase() !== tokenLower) continue;

      try {
        const decoded = decodeEventLog({
          abi: [TRANSFER_EVENT],
          data: log.data,
          topics: log.topics,
        });

        if (decoded.eventName !== "Transfer") continue;

        const to = decoded.args.to as Address;
        if (to.toLowerCase() === recipientLower) {
          received = true;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!received) {
      return okJson({
        verified: false,
        confirmed: false,
        reason: "TRANSFER_NOT_FOUND",
        bridgeRunId: run.id,
      });
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.bridgeRun.update({
        where: { id: run.id },
        data: {
          confirmedAt: now,
          confirmReason: "DEST_TRANSFER_CONFIRMED",
          // schema の都合でここに格納（本当は destReceiptBlockNumber が良い）
          sourceReceiptBlockNumber: receipt.blockNumber.toString(),
        },
      });

      await tx.project.update({
        where: { id: projectId },
        data: {
          status: "BRIDGED",
          bridgedAt: now,
          lastBridgeError: null,
          updatedAt: now,
        },
      });
    });

    return okJson({
      verified: true,
      confirmed: true,
      confirmedAt: now.toISOString(),
      bridgedAt: now.toISOString(),
      bridgeRunId: run.id,
    });
  } catch (e) {
    console.error("BRIDGE_REVERIFY_FAILED", e);
    return errJson("BRIDGE_REVERIFY_FAILED", 500);
  }
}
