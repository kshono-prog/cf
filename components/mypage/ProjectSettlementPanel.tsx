"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getAddress, isAddress, isHash } from "viem";
import { useChainId, usePublicClient, useWalletClient } from "wagmi";
import { formatBigIntGrouped } from "@/lib/numberFormat";

type SettlementStatus =
  | "NOT_READY"
  | "BRIDGING"
  | "READY_FOR_DISTRIBUTION"
  | "DISTRIBUTED";

type BridgeStep = {
  id: string;
  sourceChain: "POLYGON" | "ETHEREUM";
  destinationChain: "AVALANCHE";
  token: "JPYC" | "USDC";
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  bridgedAmountAtomic: string;
  txHash: string | null;
  completedAt: string | null;
  memo: string | null;
};

type DistributionEntry = {
  id: string;
  recipientAddressChecksum: string;
  token: "JPYC" | "USDC";
  amountAtomic: string;
  memo: string | null;
  status: "DRAFT" | "QUEUED" | "SENT" | "FAILED" | "CANCELLED";
  txHash: string | null;
  sentAt: string | null;
  orderIndex: number;
};

type SettlementView = {
  status: SettlementStatus;
  bridgedTotalAtomic: string;
  distributedTotalAtomic: string;
};

type DistributionDraft = {
  id?: string;
  recipientAddress: string;
  amountAtomic: string;
  memo: string;
  token: "JPYC" | "USDC";
};

type DistributionExecutionItemView = {
  id: string;
  distributionEntryId: string;
  status: "DRAFT" | "QUEUED" | "SENT" | "FAILED" | "CANCELLED";
  txHash: string | null;
  errorReason: string | null;
  createdAt: string;
};

type DistributionExecutionView = {
  id: string;
  initiatedByWallet: string | null;
  startedAt: string;
  finishedAt: string | null;
  result: "PARTIAL_SUCCESS" | "SUCCESS" | "FAILED";
  note: string | null;
  items: DistributionExecutionItemView[];
};

type CctpJobView = {
  id: string;
  currency: "JPYC" | "USDC";
  sourceChain: "POLYGON" | "ETHEREUM";
  destinationChain: "AVALANCHE";
  status:
    | "PENDING"
    | "BURN_SUBMITTED"
    | "ATTESTATION_READY"
    | "MINT_SUBMITTED"
    | "COMPLETED"
    | "FAILED";
  idempotencyKey: string;
  goalAchievedAt: string;
  burnAmountAtomic: string | null;
  burnTxHash: string | null;
  burnMessageHash: string | null;
  attestation: string | null;
  attestationFetchedAt: string | null;
  mintTxHash: string | null;
  failureReason: string | null;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type TokenPreflight = {
  token: "JPYC" | "USDC";
  tokenAddress: string | null;
  requiredAtomic: bigint;
  walletBalanceAtomic: bigint | null;
  sufficient: boolean;
};

type BridgeSourceChain = "POLYGON" | "ETHEREUM";

type BridgePrepareResponse = {
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

type BridgeRunApiResponse = {
  ok: true;
  bridgeRunId: string;
  bridgeTxHash: string;
};

type BridgeReverifyApiResponse =
  | { ok: true; verified: true; bridgedAt: string; bridgeRunId: string }
  | { ok: true; verified: false; reason?: string };

type BridgeExecutionConfig = {
  tokenTransferrerAddress: `0x${string}`;
  destinationBlockchainId: `0x${string}`;
  destinationTokenTransferrerAddress: `0x${string}`;
  requiredGasLimit: bigint;
  tokenDecimals: number;
  sourceTokenAddress?: `0x${string}`;
};

const ERC20_TRANSFER_ABI = [
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

const ERC20_BALANCE_OF_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const ERC20_ALLOWANCE_ABI = [
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

const ERC20_APPROVE_ABI = [
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

const ICTT_SEND_ABI = [
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

function parseBridgeAmountAtomic(raw: string, decimals: number): bigint | null {
  const s = raw.trim();
  if (!s) return null;
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const [whole, fracRaw = ""] = s.split(".");
  const frac = fracRaw.slice(0, decimals).padEnd(decimals, "0");
  const normalized = `${whole}${frac}`.replace(/^0+/, "");
  if (!normalized) return 0n;
  return BigInt(normalized);
}

function envAddress(name: string): `0x${string}` | null {
  const v = process.env[name];
  if (!v || !isAddress(v)) return null;
  return getAddress(v);
}

function toHex32(name: string): `0x${string}` | null {
  const v = process.env[name];
  if (!v || !/^0x[0-9a-fA-F]{64}$/.test(v)) return null;
  return v as `0x${string}`;
}

function getBridgeExecutionConfig(
  sourceChainId: number,
  token: "JPYC" | "USDC"
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

function getAvalancheTokenAddress(token: "JPYC" | "USDC"): `0x${string}` | null {
  const raw =
    token === "JPYC"
      ? process.env.NEXT_PUBLIC_JPYC_ADDRESS_AVAX
      : process.env.NEXT_PUBLIC_USDC_ADDRESS_AVAX;
  if (!raw || !isAddress(raw)) return null;
  return getAddress(raw);
}

function asErrorCode(json: unknown, fallback: string): string {
  if (json && typeof json === "object" && "error" in json) {
    const e = (json as { error?: unknown }).error;
    if (typeof e === "string" && e.length > 0) return e;
  }
  return fallback;
}

function formatChainName(source: "POLYGON" | "ETHEREUM"): string {
  return source === "POLYGON" ? "Polygon" : "Ethereum";
}

function statusBadgeClass(status: SettlementStatus): string {
  if (status === "READY_FOR_DISTRIBUTION") {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
  if (status === "DISTRIBUTED") {
    return "bg-blue-100 text-blue-800 border-blue-200";
  }
  if (status === "BRIDGING") {
    return "bg-amber-100 text-amber-800 border-amber-200";
  }
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function makeEmptyRow(token: "JPYC" | "USDC"): DistributionDraft {
  return {
    recipientAddress: "",
    amountAtomic: "",
    memo: "",
    token,
  };
}

export function ProjectSettlementPanel(props: {
  projectId: string | null;
  walletAddress: string | null;
  isConnected: boolean;
  projectCurrency?: "JPYC" | "USDC";
}) {
  const chainId = useChainId();
  const sourcePublicClient = usePublicClient();
  const avalanchePublicClient = usePublicClient({ chainId: 43114 });
  const { data: walletClient } = useWalletClient();
  const {
    projectId,
    walletAddress,
    isConnected,
    projectCurrency = "JPYC",
  } = props;

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [settlement, setSettlement] = useState<SettlementView | null>(null);
  const [bridgeSteps, setBridgeSteps] = useState<BridgeStep[]>([]);
  const [entries, setEntries] = useState<DistributionEntry[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<
    DistributionExecutionView[]
  >([]);
  const [cctpJobs, setCctpJobs] = useState<CctpJobView[]>([]);

  const [rows, setRows] = useState<DistributionDraft[]>([
    makeEmptyRow(projectCurrency),
  ]);
  const [draftDirty, setDraftDirty] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [runtimeRowStatus, setRuntimeRowStatus] = useState<
    Record<string, "QUEUED" | "SENT" | "FAILED">
  >({});
  const [preflight, setPreflight] = useState<TokenPreflight[]>([]);

  const [bridgeAmountPolygon, setBridgeAmountPolygon] = useState("");
  const [bridgeTxPolygon, setBridgeTxPolygon] = useState("");
  const [bridgeAmountEthereum, setBridgeAmountEthereum] = useState("");
  const [bridgeTxEthereum, setBridgeTxEthereum] = useState("");
  const [bridgeNowBusy, setBridgeNowBusy] = useState<
    Partial<Record<BridgeSourceChain, boolean>>
  >({});
  const [bridgeNowStatus, setBridgeNowStatus] = useState<
    Partial<Record<BridgeSourceChain, string>>
  >({});

  const canUse = !!projectId;

  useEffect(() => {
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        token: projectCurrency,
      }))
    );
  }, [projectCurrency]);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setSettlement(null);
      setBridgeSteps([]);
      setEntries([]);
      setRecentExecutions([]);
      setPreflight([]);
      setCctpJobs([]);
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/settlement`,
        { cache: "no-store" }
      );
      const json: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        setMessage(asErrorCode(json, `HTTP_${res.status}`));
        return;
      }

      if (!json || typeof json !== "object") {
        setMessage("SETTLEMENT_RESPONSE_INVALID");
        return;
      }

      const ok = (json as { ok?: unknown }).ok;
      if (ok !== true) {
        setMessage(asErrorCode(json, "SETTLEMENT_RESPONSE_INVALID"));
        return;
      }

      const s = (json as { settlement?: SettlementView }).settlement;
      const b = (json as { bridgeSteps?: BridgeStep[] }).bridgeSteps;
      const d = (json as { distributionEntries?: DistributionEntry[] })
        .distributionEntries;
      const x = (json as { recentExecutions?: DistributionExecutionView[] })
        .recentExecutions;
      const c = (json as { cctpJobs?: CctpJobView[] }).cctpJobs;

      if (!s || !Array.isArray(b) || !Array.isArray(d) || !Array.isArray(x)) {
        setMessage("SETTLEMENT_RESPONSE_INVALID");
        return;
      }

      setSettlement(s);
      setBridgeSteps(b);
      setEntries(d);
      setRecentExecutions(x);
      setCctpJobs(Array.isArray(c) ? c : []);

      const editableRows = d
        .filter((x) => x.status !== "SENT")
        .map((x) => ({
          id: x.id,
          recipientAddress: x.recipientAddressChecksum,
          amountAtomic: x.amountAtomic,
          memo: x.memo ?? "",
          token: projectCurrency,
        }));
      setRows(
        editableRows.length > 0 ? editableRows : [makeEmptyRow(projectCurrency)]
      );
      setDraftDirty(false);
      setRuntimeRowStatus({});
      setActiveEntryId(null);
      setPreflight([]);
    } catch {
      setMessage("SETTLEMENT_FETCH_FAILED");
    } finally {
      setLoading(false);
    }
  }, [projectCurrency, projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const totals = useMemo(() => {
    const planned = rows.reduce((acc, row) => {
      const raw = row.amountAtomic.trim();
      if (!/^\d+$/.test(raw)) return acc;
      const n = BigInt(raw);
      if (n <= 0n) return acc;
      return acc + n;
    }, 0n);

    const bridgedRaw = settlement?.bridgedTotalAtomic ?? "0";
    const bridged = /^\d+$/.test(bridgedRaw) ? BigInt(bridgedRaw) : 0n;
    return {
      planned,
      bridged,
      exceeds: planned > bridged,
    };
  }, [rows, settlement?.bridgedTotalAtomic]);

  const walletNotice = !isConnected
    ? "ウォレット未接続です"
    : settlement?.status === "READY_FOR_DISTRIBUTION" && chainId !== 43114
    ? "Avalanche C-Chain(43114)に切り替えてください"
    : null;

  async function recordBridge(sourceChain: "POLYGON" | "ETHEREUM") {
    if (!projectId || !walletAddress) {
      setMessage("ADDRESS_REQUIRED");
      return;
    }

    const amount = sourceChain === "POLYGON" ? bridgeAmountPolygon : bridgeAmountEthereum;
    const txHash = sourceChain === "POLYGON" ? bridgeTxPolygon.trim() : bridgeTxEthereum.trim();

    if (!/^\d+$/.test(amount) || amount === "0") {
      setMessage("BRIDGED_AMOUNT_INVALID");
      return;
    }

    if (txHash && !isHash(txHash)) {
      setMessage("TX_HASH_INVALID");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/settlement/bridge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: walletAddress,
            sourceChain,
            token: projectCurrency,
            bridgedAmountAtomic: amount,
            txHash: txHash || undefined,
            completedAt: new Date().toISOString(),
          }),
        }
      );

      const json: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        setMessage(asErrorCode(json, `HTTP_${res.status}`));
        return;
      }

      setMessage(`${formatChainName(sourceChain)} bridge を記録しました`);
      await refresh();
    } catch {
      setMessage("BRIDGE_RECORD_FAILED");
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(index: number, patch: Partial<DistributionDraft>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setDraftDirty(true);
    setPreflight([]);
  }

  async function saveDistributions() {
    if (!projectId || !walletAddress) {
      setMessage("ADDRESS_REQUIRED");
      return;
    }

    for (const row of rows) {
      if (!isAddress(row.recipientAddress)) {
        setMessage("RECIPIENT_ADDRESS_INVALID");
        return;
      }
      if (!/^\d+$/.test(row.amountAtomic) || row.amountAtomic === "0") {
        setMessage("AMOUNT_INVALID");
        return;
      }
    }

    setLoading(true);
    setMessage(null);

    try {
      const payload = rows.map((row, index) => ({
        id: row.id,
        recipientAddress: getAddress(row.recipientAddress),
        amountAtomic: row.amountAtomic,
        memo: row.memo.trim() || undefined,
        token: projectCurrency,
        orderIndex: index,
      }));

      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/settlement/distributions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: walletAddress,
            entries: payload,
          }),
        }
      );

      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(asErrorCode(json, `HTTP_${res.status}`));
        return;
      }

      setMessage("Distribution下書きを保存しました");
      await refresh();
    } catch {
      setMessage("DISTRIBUTION_SAVE_FAILED");
    } finally {
      setLoading(false);
    }
  }

  async function runCctpAction(
    action:
      | "SYNC_FROM_GOAL"
      | "MARK_BURN_SUBMITTED"
      | "FETCH_ATTESTATION"
      | "MARK_MINT_SUBMITTED"
      | "COMPLETE"
      | "FAIL"
      | "RETRY",
    payload: Record<string, unknown>
  ) {
    if (!projectId || !walletAddress) {
      setMessage("ADDRESS_REQUIRED");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/cctp/jobs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: walletAddress,
            action,
            ...payload,
          }),
        }
      );
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(asErrorCode(json, `HTTP_${res.status}`));
        await refresh();
        return;
      }
      setMessage(`CCTP action: ${action}`);
      await refresh();
    } catch {
      setMessage("CCTP_ACTION_FAILED");
    } finally {
      setLoading(false);
    }
  }

  async function markEntryResult(
    entry: DistributionEntry,
    status: "SENT" | "FAILED"
  ) {
    if (!projectId || !walletAddress) {
      setMessage("ADDRESS_REQUIRED");
      return;
    }

    const txHash = window.prompt(
      status === "SENT" ? "txHashを入力してください" : "失敗時はtxHash任意です",
      entry.txHash ?? ""
    );

    if (status === "SENT") {
      if (!txHash || !isHash(txHash.trim())) {
        setMessage("TX_HASH_REQUIRED_FOR_SENT");
        return;
      }
    } else if (txHash && !isHash(txHash.trim())) {
      setMessage("TX_HASH_INVALID");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/settlement/distribution-result`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: walletAddress,
            entryId: entry.id,
            status,
            txHash: txHash?.trim() || undefined,
            errorReason: status === "FAILED" ? "MANUAL_MARKED_FAILED" : undefined,
          }),
        }
      );

      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(asErrorCode(json, `HTTP_${res.status}`));
        return;
      }

      setMessage(status === "SENT" ? "送信済みに更新しました" : "失敗として更新しました");
      await refresh();
    } catch {
      setMessage("DISTRIBUTION_RESULT_SAVE_FAILED");
    } finally {
      setLoading(false);
    }
  }

  async function postDistributionRowResult(input: {
    entryId: string;
    status: "SENT" | "FAILED";
    txHash?: string;
    executionId?: string;
    errorReason?: string;
  }): Promise<string | null> {
    if (!projectId || !walletAddress) return null;

    const res = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/settlement/distribution-result`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: walletAddress,
          executionId: input.executionId,
          entryId: input.entryId,
          status: input.status,
          txHash: input.txHash,
          errorReason: input.errorReason,
        }),
      }
    );

    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(asErrorCode(json, `HTTP_${res.status}`));
    }

    if (!json || typeof json !== "object") return null;
    const maybe = (json as { executionId?: unknown }).executionId;
    return typeof maybe === "string" && maybe.length > 0 ? maybe : null;
  }

  function getTargets(mode: "ALL" | "FAILED_ONLY"): DistributionEntry[] {
    return mode === "FAILED_ONLY"
      ? entries.filter((x) => x.status === "FAILED")
      : entries.filter((x) => x.status !== "SENT" && x.status !== "CANCELLED");
  }

  async function runPreflight(
    mode: "ALL" | "FAILED_ONLY"
  ): Promise<{ ok: boolean; checks: TokenPreflight[]; reason?: string }> {
    if (!walletAddress) {
      return { ok: false, checks: [], reason: "ADDRESS_REQUIRED" };
    }
    if (!avalanchePublicClient) {
      return { ok: false, checks: [], reason: "PUBLIC_CLIENT_NOT_READY" };
    }

    const targets = getTargets(mode);
    const sum: { JPYC: bigint; USDC: bigint } = {
      JPYC: 0n,
      USDC: 0n,
    };

    for (const row of targets) {
      try {
        const amount = BigInt(row.amountAtomic);
        if (amount <= 0n) continue;
        if (row.token === "JPYC") {
          sum.JPYC = sum.JPYC + amount;
        } else {
          sum.USDC = sum.USDC + amount;
        }
      } catch {
        return { ok: false, checks: [], reason: "AMOUNT_INVALID" };
      }
    }

    const checks: TokenPreflight[] = [];
    for (const token of ["JPYC", "USDC"] as const) {
      const tokenAddress = getAvalancheTokenAddress(token);
      const requiredAtomic = sum[token];

      if (requiredAtomic === 0n) {
        checks.push({
          token,
          tokenAddress,
          requiredAtomic,
          walletBalanceAtomic: null,
          sufficient: true,
        });
        continue;
      }

      if (!tokenAddress) {
        checks.push({
          token,
          tokenAddress: null,
          requiredAtomic,
          walletBalanceAtomic: null,
          sufficient: false,
        });
        continue;
      }

      const bal = await avalanchePublicClient.readContract({
        address: tokenAddress,
        abi: ERC20_BALANCE_OF_ABI,
        functionName: "balanceOf",
        args: [getAddress(walletAddress)],
      });

      checks.push({
        token,
        tokenAddress,
        requiredAtomic,
        walletBalanceAtomic: bal,
        sufficient: bal >= requiredAtomic,
      });
    }

    const ok = checks.every((c) => c.sufficient);
    return { ok, checks, reason: ok ? undefined : "INSUFFICIENT_TOKEN_BALANCE" };
  }

  function expectedSourceChainId(sourceChain: BridgeSourceChain): number {
    if (sourceChain === "POLYGON") {
      return process.env.NEXT_PUBLIC_POLYGON_CHAIN_ID === "80002" ? 80002 : 137;
    }
    if (process.env.NEXT_PUBLIC_ETHEREUM_CHAIN_ID === "11155111") return 11155111;
    return 1;
  }

  function asBridgePrepareResponse(json: unknown): BridgePrepareResponse | null {
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
              typeof ictt.tokenDecimals === "number" && Number.isFinite(ictt.tokenDecimals)
                ? ictt.tokenDecimals
                : 18,
            missing: Array.isArray(ictt.missing)
              ? ictt.missing.filter((x): x is string => typeof x === "string")
              : [],
          }
        : undefined,
    };
  }

  async function runOneClickBridge(sourceChain: BridgeSourceChain) {
    if (!projectId || !walletAddress) {
      setMessage("ADDRESS_REQUIRED");
      return;
    }
    if (!isConnected || !walletClient || !walletClient.account) {
      setMessage("WALLET_NOT_CONNECTED");
      return;
    }

    setBridgeNowBusy((prev) => ({ ...prev, [sourceChain]: true }));
    setBridgeNowStatus((prev) => ({ ...prev, [sourceChain]: "prepare中..." }));
    setMessage(null);

    try {
      const sourceChainId = expectedSourceChainId(sourceChain);
      if (chainId !== sourceChainId) {
        setBridgeNowStatus((prev) => ({
          ...prev,
          [sourceChain]: `ネットワークを ${sourceChainId} に切り替えてください`,
        }));
        return;
      }

      const prepareRes = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/bridge/prepare`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: walletAddress,
            currency: projectCurrency,
            provider: "MANUAL",
          }),
        }
      );
      const prepareJson: unknown = await prepareRes.json().catch(() => null);
      if (!prepareRes.ok) {
        setBridgeNowStatus((prev) => ({
          ...prev,
          [sourceChain]: asErrorCode(prepareJson, `HTTP_${prepareRes.status}`),
        }));
        return;
      }

      const prepared = asBridgePrepareResponse(prepareJson);
      if (!prepared) {
        setBridgeNowStatus((prev) => ({
          ...prev,
          [sourceChain]: "BRIDGE_PREPARE_SHAPE_MISMATCH",
        }));
        return;
      }
      if (prepared.source.chainId !== sourceChainId) {
        setBridgeNowStatus((prev) => ({
          ...prev,
          [sourceChain]: `prepareのsourceChainが不一致です(${prepared.source.chainId})`,
        }));
        return;
      }
      if (!sourcePublicClient) {
        setBridgeNowStatus((prev) => ({
          ...prev,
          [sourceChain]: "PUBLIC_CLIENT_NOT_READY",
        }));
        return;
      }

      const cfgFromPrepare =
        prepared.ictt?.ready &&
        prepared.ictt.tokenTransferrerAddress &&
        prepared.ictt.destinationBlockchainId &&
        prepared.ictt.destinationTokenTransferrerAddress &&
        isAddress(prepared.ictt.tokenTransferrerAddress) &&
        /^0x[0-9a-fA-F]{64}$/.test(prepared.ictt.destinationBlockchainId) &&
        isAddress(prepared.ictt.destinationTokenTransferrerAddress)
          ? {
              tokenTransferrerAddress: getAddress(
                prepared.ictt.tokenTransferrerAddress
              ),
              destinationBlockchainId:
                prepared.ictt.destinationBlockchainId as `0x${string}`,
              destinationTokenTransferrerAddress: getAddress(
                prepared.ictt.destinationTokenTransferrerAddress
              ),
              requiredGasLimit: /^\d+$/.test(prepared.ictt.requiredGasLimit)
                ? BigInt(prepared.ictt.requiredGasLimit)
                : 250000n,
              tokenDecimals: Number.isFinite(prepared.ictt.tokenDecimals)
                ? prepared.ictt.tokenDecimals
                : 18,
              sourceTokenAddress:
                prepared.ictt.sourceTokenAddress &&
                isAddress(prepared.ictt.sourceTokenAddress)
                  ? getAddress(prepared.ictt.sourceTokenAddress)
                  : undefined,
            }
          : null;

      const cfg =
        cfgFromPrepare ??
        getBridgeExecutionConfig(prepared.source.chainId, projectCurrency);
      if (!cfg) {
        const missing = prepared.ictt?.missing?.length
          ? `: ${prepared.ictt.missing.join(", ")}`
          : "";
        setBridgeNowStatus((prev) => ({
          ...prev,
          [sourceChain]:
            `ICTT_CONFIG_NOT_READY${missing}`,
        }));
        return;
      }

      const atomicAmount = parseBridgeAmountAtomic(
        prepared.snapshotConfirmedTotalAmountDecimal,
        cfg.tokenDecimals
      );
      if (atomicAmount === null || atomicAmount <= 0n) {
        setBridgeNowStatus((prev) => ({
          ...prev,
          [sourceChain]: "BRIDGE_AMOUNT_INVALID",
        }));
        return;
      }

      if (cfg.sourceTokenAddress) {
        setBridgeNowStatus((prev) => ({ ...prev, [sourceChain]: "approve確認中..." }));
        const allowance = await sourcePublicClient.readContract({
          address: cfg.sourceTokenAddress,
          abi: ERC20_ALLOWANCE_ABI,
          functionName: "allowance",
          args: [getAddress(walletAddress), cfg.tokenTransferrerAddress],
        });
        if (allowance < atomicAmount) {
          setBridgeNowStatus((prev) => ({
            ...prev,
            [sourceChain]: "approve署名を待っています...",
          }));
          const approveHash = await walletClient.writeContract({
            address: cfg.sourceTokenAddress,
            abi: ERC20_APPROVE_ABI,
            functionName: "approve",
            args: [cfg.tokenTransferrerAddress, atomicAmount],
            account: getAddress(walletAddress),
          });
          const approveReceipt = await sourcePublicClient.waitForTransactionReceipt({
            hash: approveHash,
            confirmations: 1,
            timeout: 120_000,
          });
          if (approveReceipt.status !== "success") {
            setBridgeNowStatus((prev) => ({
              ...prev,
              [sourceChain]: "APPROVE_TX_FAILED",
            }));
            return;
          }
        }
      }

      setBridgeNowStatus((prev) => ({
        ...prev,
        [sourceChain]: "bridge署名を待っています...",
      }));
      const bridgeHash = await walletClient.writeContract({
        address: cfg.tokenTransferrerAddress,
        abi: ICTT_SEND_ABI,
        functionName: "send",
        args: [
          {
            destinationBlockchainId: cfg.destinationBlockchainId,
            destinationTokenTransferrerAddress:
              cfg.destinationTokenTransferrerAddress,
            recipient: getAddress(prepared.destination.recipientAddress),
            amount: atomicAmount,
            requiredGasLimit: cfg.requiredGasLimit,
          },
        ],
        account: getAddress(walletAddress),
      });

      const bridgeReceipt = await sourcePublicClient.waitForTransactionReceipt({
        hash: bridgeHash,
        confirmations: 1,
        timeout: 180_000,
      });
      if (bridgeReceipt.status !== "success") {
        setBridgeNowStatus((prev) => ({ ...prev, [sourceChain]: "BRIDGE_TX_FAILED" }));
        return;
      }

      setBridgeNowStatus((prev) => ({ ...prev, [sourceChain]: "bridge/run保存中..." }));
      const runRes = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/bridge/run`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: walletAddress,
            bridgeRunId: prepared.bridgeRunId,
            bridgeTxHash: bridgeHash,
          }),
        }
      );
      const runJson: unknown = await runRes.json().catch(() => null);
      if (!runRes.ok) {
        setBridgeNowStatus((prev) => ({
          ...prev,
          [sourceChain]: asErrorCode(runJson, `HTTP_${runRes.status}`),
        }));
        return;
      }
      const runParsed =
        runJson && typeof runJson === "object"
          ? (runJson as BridgeRunApiResponse)
          : null;
      if (!runParsed || runParsed.ok !== true) {
        setBridgeNowStatus((prev) => ({
          ...prev,
          [sourceChain]: "BRIDGE_RUN_RESPONSE_INVALID",
        }));
        return;
      }

      setBridgeNowStatus((prev) => ({ ...prev, [sourceChain]: "着金確認中(reverify)..." }));
      let verified = false;
      for (let i = 0; i < 20; i += 1) {
        const reverifyRes = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/bridge/reverify`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: walletAddress,
              bridgeRunId: prepared.bridgeRunId,
            }),
          }
        );
        const reverifyJson: unknown = await reverifyRes.json().catch(() => null);
        if (!reverifyRes.ok) {
          setBridgeNowStatus((prev) => ({
            ...prev,
            [sourceChain]: asErrorCode(reverifyJson, `HTTP_${reverifyRes.status}`),
          }));
          return;
        }
        const parsed =
          reverifyJson && typeof reverifyJson === "object"
            ? (reverifyJson as BridgeReverifyApiResponse)
            : null;
        if (parsed && parsed.ok === true && parsed.verified) {
          verified = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      if (!verified) {
        setBridgeNowStatus((prev) => ({
          ...prev,
          [sourceChain]: "着金未確認。時間をおいて再実行してください",
        }));
        return;
      }

      setBridgeNowStatus((prev) => ({
        ...prev,
        [sourceChain]: "settlement反映中...",
      }));
      const settlementBridgeRes = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/settlement/bridge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: walletAddress,
            sourceChain,
            token: projectCurrency,
            bridgedAmountAtomic: atomicAmount.toString(),
            txHash: bridgeHash,
            completedAt: new Date().toISOString(),
            memo: "AUTO_ONE_CLICK_BRIDGE",
          }),
        }
      );
      const settlementBridgeJson: unknown = await settlementBridgeRes
        .json()
        .catch(() => null);
      if (!settlementBridgeRes.ok) {
        setBridgeNowStatus((prev) => ({
          ...prev,
          [sourceChain]: asErrorCode(
            settlementBridgeJson,
            `HTTP_${settlementBridgeRes.status}`
          ),
        }));
        return;
      }

      setBridgeNowStatus((prev) => ({ ...prev, [sourceChain]: "完了" }));
      setMessage(`${formatChainName(sourceChain)} の Bridge now を完了しました`);
      if (sourceChain === "POLYGON") {
        setBridgeAmountPolygon(atomicAmount.toString());
        setBridgeTxPolygon(bridgeHash);
      } else {
        setBridgeAmountEthereum(atomicAmount.toString());
        setBridgeTxEthereum(bridgeHash);
      }
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "BRIDGE_NOW_FAILED";
      setBridgeNowStatus((prev) => ({ ...prev, [sourceChain]: msg }));
    } finally {
      setBridgeNowBusy((prev) => ({ ...prev, [sourceChain]: false }));
    }
  }

  async function checkBalances(mode: "ALL" | "FAILED_ONLY" = "ALL") {
    try {
      const result = await runPreflight(mode);
      setPreflight(result.checks);
      if (!result.ok) {
        setMessage(result.reason ?? "PRECHECK_FAILED");
      } else {
        setMessage("残高チェックOK");
      }
      return result;
    } catch {
      setPreflight([]);
      setMessage("BALANCE_CHECK_FAILED");
      return { ok: false, checks: [], reason: "BALANCE_CHECK_FAILED" };
    }
  }

  async function executeDistribution(mode: "ALL" | "FAILED_ONLY") {
    if (!projectId || !walletAddress) {
      setMessage("ADDRESS_REQUIRED");
      return;
    }
    if (!walletClient) {
      setMessage("WALLET_CLIENT_NOT_READY");
      return;
    }
    if (!walletClient.account) {
      setMessage("WALLET_ACCOUNT_NOT_READY");
      return;
    }
    if (!avalanchePublicClient) {
      setMessage("PUBLIC_CLIENT_NOT_READY");
      return;
    }
    if (!isConnected) {
      setMessage("WALLET_NOT_CONNECTED");
      return;
    }
    if (chainId !== 43114) {
      setMessage("CHAIN_NOT_AVALANCHE");
      return;
    }
    if (settlement?.status !== "READY_FOR_DISTRIBUTION") {
      setMessage("SETTLEMENT_NOT_READY_FOR_DISTRIBUTION");
      return;
    }
    if (draftDirty) {
      setMessage("SAVE_DISTRIBUTION_DRAFT_FIRST");
      return;
    }
    const bridged = BigInt(settlement.bridgedTotalAtomic);
    if (bridged <= 0n) {
      setMessage("NO_BRIDGED_BALANCE");
      return;
    }

    const targets = getTargets(mode);

    if (targets.length === 0) {
      setMessage("NO_DISTRIBUTION_TARGETS");
      return;
    }

    const precheck = await checkBalances(mode);
    if (!precheck.ok) {
      return;
    }

    setIsDistributing(true);
    setLoading(true);
    setMessage("Distribute開始: ウォレットで順次承認してください");
    setRuntimeRowStatus({});

    let executionId: string | null = null;
    let successCount = 0;
    let failedCount = 0;

    for (const row of targets) {
      setActiveEntryId(row.id);
      setRuntimeRowStatus((prev) => ({ ...prev, [row.id]: "QUEUED" }));

      try {
        const tokenAddress = getAvalancheTokenAddress(row.token);
        if (!tokenAddress) {
          throw new Error(`TOKEN_ADDRESS_NOT_CONFIGURED_${row.token}`);
        }

        const amount = BigInt(row.amountAtomic);
        if (amount <= 0n) throw new Error("AMOUNT_INVALID");

        const txHash = await walletClient.writeContract({
          address: tokenAddress,
          abi: ERC20_TRANSFER_ABI,
          functionName: "transfer",
          args: [getAddress(row.recipientAddressChecksum), amount],
          account: getAddress(walletAddress),
        });

        const receipt = await avalanchePublicClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations: 1,
          timeout: 120_000,
        });

        if (receipt.status !== "success") {
          throw new Error("TX_RECEIPT_FAILED");
        }

        const nextExecutionId = await postDistributionRowResult({
          entryId: row.id,
          status: "SENT",
          txHash,
          executionId: executionId ?? undefined,
        });

        if (!executionId && nextExecutionId) executionId = nextExecutionId;

        successCount += 1;
        setRuntimeRowStatus((prev) => ({ ...prev, [row.id]: "SENT" }));
      } catch (e) {
        const reason = e instanceof Error ? e.message : "TX_FAILED";
        try {
          const nextExecutionId = await postDistributionRowResult({
            entryId: row.id,
            status: "FAILED",
            executionId: executionId ?? undefined,
            errorReason: reason,
          });
          if (!executionId && nextExecutionId) executionId = nextExecutionId;
        } catch {
          // API保存失敗時も次行処理は継続する
        }
        failedCount += 1;
        setRuntimeRowStatus((prev) => ({ ...prev, [row.id]: "FAILED" }));
      }
    }

    setActiveEntryId(null);
    setIsDistributing(false);
    setLoading(false);

    if (failedCount === 0) {
      setMessage(`Distribute完了: ${successCount}件成功`);
    } else {
      setMessage(
        `Distribute一部完了: 成功 ${successCount}件 / 失敗 ${failedCount}件`
      );
    }

    await refresh();
  }

  async function recompute() {
    if (!projectId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/settlement`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "RECOMPUTE" }),
        }
      );
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(asErrorCode(json, `HTTP_${res.status}`));
        return;
      }
      await refresh();
      setMessage("settlement status を再計算しました");
    } catch {
      setMessage("SETTLEMENT_RECOMPUTE_FAILED");
    } finally {
      setLoading(false);
    }
  }

  if (!canUse) {
    return (
      <div className="rounded-xl border bg-white p-4 text-sm text-gray-600">
        Projectを作成すると、Bridge/Distribution設定が表示されます。
      </div>
    );
  }

  const polygonDone = bridgeSteps.some(
    (x) => x.sourceChain === "POLYGON" && x.status === "COMPLETED"
  );
  const ethereumDone = bridgeSteps.some(
    (x) => x.sourceChain === "ETHEREUM" && x.status === "COMPLETED"
  );
  const canDistribute =
    settlement?.status === "READY_FOR_DISTRIBUTION" &&
    chainId === 43114 &&
    !!walletAddress &&
    !draftDirty &&
    !isDistributing;
  const hasPreflightFailure =
    preflight.length > 0 && preflight.some((x) => !x.sufficient);

  return (
    <div className="rounded-xl border bg-white p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div>
          <div className="font-semibold">
            Settlement (Bridge → Distribution) [{projectCurrency}]
          </div>
          <div className="text-xs text-gray-500 mt-1">
            本UIは資金を保管しません。送金・ブリッジは必ずユーザー自身のウォレットで実行されます。
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs border px-2 py-1 rounded ${statusBadgeClass(settlement?.status ?? "NOT_READY")}`}>
            {settlement?.status ?? "NOT_READY"}
          </span>
          <button
            type="button"
            className="rounded border px-3 py-1.5 text-xs"
            onClick={() => void recompute()}
            disabled={loading}
          >
            Recompute
          </button>
        </div>
      </div>

      {walletNotice ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs px-3 py-2">
          {walletNotice}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-700 px-3 py-2">
          {message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border p-3 space-y-2">
          <div className="text-sm font-medium">Polygon → Avalanche</div>
          <a
            href="https://portalbridge.com/"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 underline"
          >
            Open recommended bridge (Wormhole)
          </a>
          <div className="text-xs">状態: {polygonDone ? "COMPLETED" : "PENDING"}</div>
          <input
            className="w-full rounded border px-2 py-1.5 text-xs"
            placeholder="bridgedAmountAtomic"
            value={bridgeAmountPolygon}
            onChange={(e) => setBridgeAmountPolygon(e.target.value)}
            inputMode="numeric"
          />
          <input
            className="w-full rounded border px-2 py-1.5 text-xs font-mono"
            placeholder="txHash (optional)"
            value={bridgeTxPolygon}
            onChange={(e) => setBridgeTxPolygon(e.target.value)}
          />
          <button
            type="button"
            className="rounded bg-black text-white px-3 py-1.5 text-xs disabled:opacity-40"
            onClick={() => void recordBridge("POLYGON")}
            disabled={loading || !walletAddress}
          >
            完了を記録
          </button>
          <button
            type="button"
            className="rounded border px-3 py-1.5 text-xs disabled:opacity-40"
            onClick={() => void runOneClickBridge("POLYGON")}
            disabled={loading || !walletAddress || bridgeNowBusy.POLYGON}
          >
            {bridgeNowBusy.POLYGON ? "Bridge now..." : "Bridge now (wallet)"}
          </button>
          {bridgeNowStatus.POLYGON ? (
            <div className="text-[11px] text-gray-600 break-all">
              {bridgeNowStatus.POLYGON}
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border p-3 space-y-2">
          <div className="text-sm font-medium">Ethereum → Avalanche</div>
          <a
            href="https://portalbridge.com/"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 underline"
          >
            Open recommended bridge (Wormhole)
          </a>
          <div className="text-xs">状態: {ethereumDone ? "COMPLETED" : "PENDING"}</div>
          <input
            className="w-full rounded border px-2 py-1.5 text-xs"
            placeholder="bridgedAmountAtomic"
            value={bridgeAmountEthereum}
            onChange={(e) => setBridgeAmountEthereum(e.target.value)}
            inputMode="numeric"
          />
          <input
            className="w-full rounded border px-2 py-1.5 text-xs font-mono"
            placeholder="txHash (optional)"
            value={bridgeTxEthereum}
            onChange={(e) => setBridgeTxEthereum(e.target.value)}
          />
          <button
            type="button"
            className="rounded bg-black text-white px-3 py-1.5 text-xs disabled:opacity-40"
            onClick={() => void recordBridge("ETHEREUM")}
            disabled={loading || !walletAddress}
          >
            完了を記録
          </button>
          <button
            type="button"
            className="rounded border px-3 py-1.5 text-xs disabled:opacity-40"
            onClick={() => void runOneClickBridge("ETHEREUM")}
            disabled={loading || !walletAddress || bridgeNowBusy.ETHEREUM}
          >
            {bridgeNowBusy.ETHEREUM ? "Bridge now..." : "Bridge now (wallet)"}
          </button>
          {bridgeNowStatus.ETHEREUM ? (
            <div className="text-[11px] text-gray-600 break-all">
              {bridgeNowStatus.ETHEREUM}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Distribution entries</div>
          <button
            type="button"
            className="rounded border px-3 py-1.5 text-xs"
            onClick={() => {
              setRows((prev) => [...prev, makeEmptyRow(projectCurrency)]);
              setDraftDirty(true);
              setPreflight([]);
            }}
            disabled={loading}
          >
            行を追加
          </button>
        </div>

        <div className="text-xs text-gray-600">
          合計: {formatBigIntGrouped(totals.planned)} / Bridge済み:{" "}
          {formatBigIntGrouped(totals.bridged)}
          {totals.exceeds ? (
            <span className="text-rose-700 ml-2">(超過しています)</span>
          ) : null}
          {draftDirty ? (
            <span className="text-amber-700 ml-2">未保存の変更があります</span>
          ) : null}
        </div>

        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={`${row.id ?? "new"}-${i}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 border rounded p-2">
              <input
                className="md:col-span-4 rounded border px-2 py-1.5 text-xs font-mono"
                placeholder="recipientAddress"
                value={row.recipientAddress}
                onChange={(e) => updateDraft(i, { recipientAddress: e.target.value })}
              />
              <input
                className="md:col-span-2 rounded border px-2 py-1.5 text-xs"
                placeholder="amountAtomic"
                value={row.amountAtomic}
                onChange={(e) => updateDraft(i, { amountAtomic: e.target.value })}
                inputMode="numeric"
              />
              <select
                className="md:col-span-2 rounded border px-2 py-1.5 text-xs bg-gray-50"
                value={row.token}
                disabled
                aria-label="token"
              >
                <option value="JPYC">JPYC</option>
                <option value="USDC">USDC</option>
              </select>
              <input
                className="md:col-span-3 rounded border px-2 py-1.5 text-xs"
                placeholder="memo"
                value={row.memo}
                onChange={(e) => updateDraft(i, { memo: e.target.value })}
              />
              <button
                type="button"
                className="md:col-span-1 rounded border px-2 py-1.5 text-xs"
                onClick={() => {
                  setRows((prev) => prev.filter((_, idx) => idx !== i));
                  setDraftDirty(true);
                  setPreflight([]);
                }}
              >
                削除
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="rounded bg-black text-white px-4 py-2 text-sm disabled:opacity-40"
          onClick={() => void saveDistributions()}
          disabled={loading || !walletAddress || totals.exceeds}
        >
          Distribution下書きを保存
        </button>
      </div>

      <div className="rounded-lg border p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="text-sm font-medium">Distribution execution</div>
          <div className="text-xs text-gray-500">
            送金は接続ウォレットの署名で1件ずつ実行されます
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded border px-4 py-2 text-sm disabled:opacity-40"
            onClick={() => void checkBalances("ALL")}
            disabled={loading || !walletAddress || !isConnected || chainId !== 43114}
          >
            送信前に残高チェック
          </button>
          <button
            type="button"
            className="rounded bg-black text-white px-4 py-2 text-sm disabled:opacity-40"
            onClick={() => void executeDistribution("ALL")}
            disabled={!canDistribute || hasPreflightFailure}
          >
            {isDistributing ? "Distributing..." : "Distribute on Avalanche"}
          </button>
          <button
            type="button"
            className="rounded border px-4 py-2 text-sm disabled:opacity-40"
            onClick={() => void executeDistribution("FAILED_ONLY")}
            disabled={
              !canDistribute ||
              !entries.some((e) => e.status === "FAILED") ||
              hasPreflightFailure
            }
          >
            失敗分のみ再送
          </button>
        </div>
        {preflight.length > 0 ? (
          <div className="rounded border bg-gray-50 p-2 text-xs space-y-1">
            {preflight.map((p) => (
              <div key={p.token} className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{p.token}</span>
                <span>required: {p.requiredAtomic.toString()}</span>
                <span>
                  balance:{" "}
                  {p.walletBalanceAtomic === null
                    ? "N/A"
                    : p.walletBalanceAtomic.toString()}
                </span>
                <span
                  className={`px-2 py-0.5 rounded border ${
                    p.sufficient
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-rose-50 text-rose-700 border-rose-100"
                  }`}
                >
                  {p.sufficient ? "OK" : "不足"}
                </span>
              </div>
            ))}
            {hasPreflightFailure ? (
              <div className="text-rose-700">残高不足またはトークン設定不足があります。</div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border p-3 space-y-2">
        <div className="text-sm font-medium">Execution logs</div>
        {recentExecutions.length === 0 ? (
          <div className="text-xs text-gray-500">まだ実行ログがありません。</div>
        ) : (
          <div className="space-y-2">
            {recentExecutions.map((ex) => (
              <details key={ex.id} className="rounded border p-2">
                <summary className="cursor-pointer text-xs flex flex-wrap items-center gap-2">
                  <span className="font-mono">{ex.id.slice(0, 10)}...</span>
                  <span className="px-2 py-0.5 rounded bg-gray-100">
                    {ex.result}
                  </span>
                  <span>started: {ex.startedAt}</span>
                </summary>
                <div className="mt-2 space-y-1 text-xs">
                  <div>initiatedBy: {ex.initiatedByWallet ?? "N/A"}</div>
                  <div>finishedAt: {ex.finishedAt ?? "N/A"}</div>
                  {ex.note ? <div>note: {ex.note}</div> : null}
                  {ex.items.map((it) => (
                    <div key={it.id} className="rounded border p-1 flex flex-wrap items-center gap-2">
                      <span className="font-mono">{it.distributionEntryId.slice(0, 8)}...</span>
                      <span className="px-2 py-0.5 rounded bg-gray-100">{it.status}</span>
                      {it.txHash ? (
                        <a
                          className="text-blue-600 underline font-mono"
                          href={`https://snowtrace.io/tx/${it.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {it.txHash.slice(0, 10)}...
                        </a>
                      ) : null}
                      {it.errorReason ? (
                        <span className="text-rose-700">{it.errorReason}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

      {projectCurrency === "USDC" ? (
        <div className="rounded-lg border p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium">CCTP Bridge Jobs (USDC)</div>
            <button
              type="button"
              className="rounded border px-3 py-1.5 text-xs disabled:opacity-40"
              onClick={() => void runCctpAction("SYNC_FROM_GOAL", {})}
              disabled={loading || !walletAddress}
            >
              Goalからジョブ同期
            </button>
          </div>

          {cctpJobs.length === 0 ? (
            <div className="text-xs text-gray-500">
              CCTPジョブはまだありません（Goal達成後に生成されます）
            </div>
          ) : (
            <div className="space-y-2">
              {cctpJobs.map((job) => (
                <details key={job.id} className="rounded border p-2">
                  <summary className="cursor-pointer text-xs flex flex-wrap items-center gap-2">
                    <span className="font-mono">{job.id.slice(0, 10)}...</span>
                    <span className="px-2 py-0.5 rounded bg-gray-100">{job.status}</span>
                    <span>{job.sourceChain} → {job.destinationChain}</span>
                    <span>attempts: {job.attempts}/{job.maxAttempts}</span>
                  </summary>
                  <div className="mt-2 space-y-1 text-xs">
                    <div>burnTx: {job.burnTxHash ?? "N/A"}</div>
                    <div>messageHash: {job.burnMessageHash ?? "N/A"}</div>
                    <div>
                      attestation:{" "}
                      {job.attestation ? `${job.attestation.slice(0, 18)}...` : "N/A"}
                    </div>
                    <div>mintTx: {job.mintTxHash ?? "N/A"}</div>
                    {job.failureReason ? (
                      <div className="text-rose-700">error: {job.failureReason}</div>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        className="rounded border px-2 py-1"
                        onClick={() => {
                          const burnTxHash = window.prompt("burn tx hash", job.burnTxHash ?? "");
                          if (!burnTxHash) return;
                          const burnAmountAtomic = window.prompt(
                            "burn amount atomic",
                            job.burnAmountAtomic ?? "0"
                          );
                          if (!burnAmountAtomic) return;
                          const burnMessageHash = window.prompt(
                            "burn message hash (0x...)",
                            job.burnMessageHash ?? ""
                          );
                          void runCctpAction("MARK_BURN_SUBMITTED", {
                            jobId: job.id,
                            sourceChain: job.sourceChain,
                            burnTxHash,
                            burnAmountAtomic,
                            burnMessageHash: burnMessageHash || undefined,
                          });
                        }}
                        disabled={loading}
                      >
                        Burn記録
                      </button>
                      <button
                        type="button"
                        className="rounded border px-2 py-1"
                        onClick={() =>
                          void runCctpAction("FETCH_ATTESTATION", {
                            jobId: job.id,
                            burnMessageHash: job.burnMessageHash ?? undefined,
                          })
                        }
                        disabled={loading}
                      >
                        Attestation取得
                      </button>
                      <button
                        type="button"
                        className="rounded border px-2 py-1"
                        onClick={() => {
                          const mintTxHash = window.prompt("mint tx hash", job.mintTxHash ?? "");
                          if (!mintTxHash) return;
                          void runCctpAction("MARK_MINT_SUBMITTED", {
                            jobId: job.id,
                            mintTxHash,
                          });
                        }}
                        disabled={loading}
                      >
                        Mint記録
                      </button>
                      <button
                        type="button"
                        className="rounded border px-2 py-1"
                        onClick={() =>
                          void runCctpAction("COMPLETE", {
                            jobId: job.id,
                            mintTxHash: job.mintTxHash ?? undefined,
                          })
                        }
                        disabled={loading}
                      >
                        完了確定
                      </button>
                      <button
                        type="button"
                        className="rounded border px-2 py-1"
                        onClick={() => {
                          const reason = window.prompt(
                            "failure reason",
                            job.failureReason ?? "MANUAL_FAILED"
                          );
                          void runCctpAction("FAIL", {
                            jobId: job.id,
                            failureReason: reason || "MANUAL_FAILED",
                          });
                        }}
                        disabled={loading}
                      >
                        失敗記録
                      </button>
                      <button
                        type="button"
                        className="rounded border px-2 py-1"
                        onClick={() => void runCctpAction("RETRY", { jobId: job.id })}
                        disabled={loading || job.status !== "FAILED"}
                      >
                        再試行
                      </button>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="rounded-lg border p-3 space-y-2">
        <div className="text-sm font-medium">送信結果の記録（行単位）</div>
        {entries.length === 0 ? (
          <div className="text-xs text-gray-500">まだ配分行がありません。</div>
        ) : (
          <div className="space-y-2">
            {entries.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-2 border rounded p-2 text-xs">
                <span className="font-mono">{e.recipientAddressChecksum}</span>
                <span>{e.amountAtomic}</span>
                <span className="px-2 py-0.5 rounded bg-gray-100">{e.status}</span>
                {runtimeRowStatus[e.id] ? (
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                    runtime:{runtimeRowStatus[e.id]}
                  </span>
                ) : null}
                {activeEntryId === e.id && isDistributing ? (
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
                    sending...
                  </span>
                ) : null}
                <button
                  type="button"
                  className="rounded border px-2 py-1"
                  onClick={() => void markEntryResult(e, "SENT")}
                  disabled={loading || isDistributing || e.status === "SENT"}
                >
                  SENT
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1"
                  onClick={() => void markEntryResult(e, "FAILED")}
                  disabled={loading || isDistributing}
                >
                  FAILED
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
