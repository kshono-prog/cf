"use client";

import { getAddress, isAddress } from "viem";
import { getPublicEnv } from "@/lib/publicEnv";

import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";
import type { ProjectSettlementData } from "@/lib/projectSettlementView";

export type BridgeStep = ProjectSettlementData["bridgeSteps"][number];
export type DistributionEntry = ProjectSettlementData["distributionEntries"][number];
export type SettlementView = ProjectSettlementData["settlement"];
export type DistributionExecutionView =
  ProjectSettlementData["recentExecutions"][number];
export type CctpJobView = ProjectSettlementData["cctpJobs"][number];

export type DistributionDraft = {
  id?: string;
  recipientAddress: string;
  amountAtomic: string;
  memo: string;
  token: CurrencyCode;
};

export type TokenPreflight = {
  token: CurrencyCode;
  tokenAddress: string | null;
  requiredAtomic: bigint;
  walletBalanceAtomic: bigint | null;
  sufficient: boolean;
};

export type BridgeSourceChain = "POLYGON" | "ETHEREUM";

export type BridgePrepareResponse = {
  ok: true;
  bridgeRunId: string;
  snapshotConfirmedTotalAmountDecimal: string;
  source: { chainId: number };
  destination: { chainId: number; recipientAddress: string };
  token: { address: string };
  ictt?: {
    ready: boolean;
    tokenTransferrerAddress: string | null;
    destinationBlockchainId: string | null;
    destinationTokenTransferrerAddress: string | null;
    sourceTokenAddress: string | null;
    requiredGasLimit: string;
    tokenDecimals: number;
    missing?: string[];
  };
};

export type BridgeReverifyApiResponse =
  | { ok: true; verified: true; bridgedAt: string; bridgeRunId: string }
  | { ok: true; verified: false; reason?: string };

export type BridgeExecutionConfig = {
  tokenTransferrerAddress: `0x${string}`;
  destinationBlockchainId: `0x${string}`;
  destinationTokenTransferrerAddress: `0x${string}`;
  requiredGasLimit: bigint;
  tokenDecimals: number;
  sourceTokenAddress?: `0x${string}`;
};

export type RefreshProjectSettlement = () => Promise<void>;
export type SetProjectSettlementLoading = (value: boolean) => void;
export type SetProjectSettlementMessage = (value: string | null) => void;

export const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const ERC20_BALANCE_OF_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const ERC20_ALLOWANCE_ABI = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const ERC20_APPROVE_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const ICTT_SEND_ABI = [
  {
    type: "function",
    name: "send",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "input",
        type: "tuple",
        components: [
          { name: "destinationBlockchainId", type: "bytes32" },
          { name: "destinationTokenTransferrerAddress", type: "address" },
          { name: "recipient", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "requiredGasLimit", type: "uint256" },
        ],
      },
    ],
    outputs: [],
  },
] as const;

const publicEnv = getPublicEnv();

function envAddress(name: string): `0x${string}` | null {
  const value = process.env[name];
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}

function toHex32(name: string): `0x${string}` | null {
  const value = process.env[name];
  if (!value || !/^0x[0-9a-fA-F]{64}$/.test(value)) return null;
  return value as `0x${string}`;
}

export function parseBridgeAmountAtomic(
  raw: string,
  decimals: number
): bigint | null {
  const s = raw.trim();
  if (!s) return null;
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const [whole, fracRaw = ""] = s.split(".");
  const frac = fracRaw.slice(0, decimals).padEnd(decimals, "0");
  const normalized = `${whole}${frac}`.replace(/^0+/, "");
  if (!normalized) return 0n;
  return BigInt(normalized);
}

export function getBridgeExecutionConfig(
  sourceChainId: number,
  token: CurrencyCode
): BridgeExecutionConfig | null {
  const prefix =
    sourceChainId === 137
      ? "POLYGON"
      : sourceChainId === 80002
      ? "POLYGON_AMOY"
      : sourceChainId === 1
      ? "ETHEREUM"
      : sourceChainId === 11155111
      ? "ETHEREUM_SEPOLIA"
      : null;
  if (!prefix) return null;

  const tokenTransferrerAddress = envAddress(
    `NEXT_PUBLIC_ICTT_${prefix}_TOKEN_TRANSFERRER`
  );
  const destinationBlockchainId = toHex32(
    `NEXT_PUBLIC_ICTT_${prefix}_DEST_BLOCKCHAIN_ID`
  );
  const destinationTokenTransferrerAddress = envAddress(
    `NEXT_PUBLIC_ICTT_${prefix}_DEST_TOKEN_TRANSFERRER`
  );

  if (
    !tokenTransferrerAddress ||
    !destinationBlockchainId ||
    !destinationTokenTransferrerAddress
  ) {
    return null;
  }

  const gasRaw = process.env[`NEXT_PUBLIC_ICTT_${prefix}_REQUIRED_GAS_LIMIT`];
  const gasValue = typeof gasRaw === "string" ? gasRaw : "";
  const requiredGasLimit = /^\d+$/.test(gasValue) ? BigInt(gasValue) : 250000n;
  const decimalsRaw = process.env[`NEXT_PUBLIC_ICTT_${prefix}_${token}_DECIMALS`];
  const tokenDecimals = /^\d+$/.test(decimalsRaw ?? "") ? Number(decimalsRaw) : 18;
  const sourceTokenAddress = envAddress(
    `NEXT_PUBLIC_ICTT_${prefix}_${token}_SOURCE_TOKEN`
  );

  return {
    tokenTransferrerAddress,
    destinationBlockchainId,
    destinationTokenTransferrerAddress,
    requiredGasLimit,
    tokenDecimals,
    sourceTokenAddress: sourceTokenAddress ?? undefined,
  };
}

export function getAvalancheTokenAddress(
  token: CurrencyCode
): `0x${string}` | null {
  const raw =
    token === "JPYC" ? publicEnv.jpycAddressAvax : publicEnv.usdcAddressAvax;
  if (!raw || !isAddress(raw)) return null;
  return getAddress(raw);
}

export function formatChainName(source: BridgeSourceChain): string {
  return source === "POLYGON" ? "Polygon" : "Ethereum";
}

export function makeEmptyRow(token: CurrencyCode): DistributionDraft {
  return {
    recipientAddress: "",
    amountAtomic: "",
    memo: "",
    token,
  };
}

export function expectedSourceChainId(sourceChain: BridgeSourceChain): number {
  if (sourceChain === "POLYGON") {
    return publicEnv.polygonChainId === 80002 ? 80002 : 137;
  }
  if (publicEnv.ethereumChainId === 11155111) return 11155111;
  return 1;
}

export function asBridgePrepareResponse(
  json: unknown
): BridgePrepareResponse | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;
  if (obj.ok !== true) return null;
  if (typeof obj.bridgeRunId !== "string" || !obj.bridgeRunId) return null;
  if (
    typeof obj.snapshotConfirmedTotalAmountDecimal !== "string" ||
    !obj.snapshotConfirmedTotalAmountDecimal
  ) {
    return null;
  }

  const source = obj.source as Record<string, unknown> | undefined;
  const destination = obj.destination as Record<string, unknown> | undefined;
  const token = obj.token as Record<string, unknown> | undefined;
  const ictt = obj.ictt as Record<string, unknown> | undefined;
  if (!source || !destination || !token) return null;
  if (typeof source.chainId !== "number") return null;
  if (typeof destination.chainId !== "number") return null;
  if (typeof destination.recipientAddress !== "string") return null;
  if (typeof token.address !== "string") return null;

  return {
    ok: true,
    bridgeRunId: obj.bridgeRunId,
    snapshotConfirmedTotalAmountDecimal: obj.snapshotConfirmedTotalAmountDecimal,
    source: { chainId: source.chainId },
    destination: {
      chainId: destination.chainId,
      recipientAddress: destination.recipientAddress,
    },
    token: { address: token.address },
    ictt: ictt
      ? {
          ready: ictt.ready === true,
          tokenTransferrerAddress:
            typeof ictt.tokenTransferrerAddress === "string"
              ? ictt.tokenTransferrerAddress
              : null,
          destinationBlockchainId:
            typeof ictt.destinationBlockchainId === "string"
              ? ictt.destinationBlockchainId
              : null,
          destinationTokenTransferrerAddress:
            typeof ictt.destinationTokenTransferrerAddress === "string"
              ? ictt.destinationTokenTransferrerAddress
              : null,
          sourceTokenAddress:
            typeof ictt.sourceTokenAddress === "string"
              ? ictt.sourceTokenAddress
              : null,
          requiredGasLimit:
            typeof ictt.requiredGasLimit === "string"
              ? ictt.requiredGasLimit
              : "250000",
          tokenDecimals:
            typeof ictt.tokenDecimals === "number" &&
            Number.isFinite(ictt.tokenDecimals)
              ? ictt.tokenDecimals
              : 18,
          missing: Array.isArray(ictt.missing)
            ? ictt.missing.filter(
                (value): value is string => typeof value === "string"
              )
            : [],
        }
      : undefined,
  };
}
