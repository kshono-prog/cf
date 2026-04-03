"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAddress,
  isHash,
  type PublicClient,
  type WalletClient,
} from "viem";

import {
  type DistributionEntry,
  type RefreshProjectSettlement,
  type SetProjectSettlementLoading,
  type SetProjectSettlementMessage,
  type SettlementView,
  type TokenPreflight,
  ERC20_BALANCE_OF_ABI,
  ERC20_TRANSFER_ABI,
  getAvalancheTokenAddress,
} from "@/components/mypage/projectSettlementRuntime";
import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";
import {
  runProjectCctpAction,
  saveProjectSettlementDistributionResult,
} from "@/lib/mypage/api";

type DistributionRuntimeStatus = "QUEUED" | "SENT" | "FAILED";
type DistributionMode = "ALL" | "FAILED_ONLY";
type PreflightResult = {
  ok: boolean;
  checks: TokenPreflight[];
  reason?: string;
};
type CctpAction =
  | "SYNC_FROM_GOAL"
  | "MARK_BURN_SUBMITTED"
  | "FETCH_ATTESTATION"
  | "MARK_MINT_SUBMITTED"
  | "COMPLETE"
  | "FAIL"
  | "RETRY";

type UseProjectSettlementExecutionStateArgs = {
  projectId: string | null;
  walletAddress: string | null;
  isConnected: boolean;
  chainId: number;
  avalanchePublicClient: PublicClient | undefined;
  walletClient: WalletClient | undefined;
  settlement: SettlementView | null;
  entries: DistributionEntry[];
  draftDirty: boolean;
  refresh: RefreshProjectSettlement;
  setLoading: SetProjectSettlementLoading;
  setMessage: SetProjectSettlementMessage;
};

export function useProjectSettlementExecutionState(
  args: UseProjectSettlementExecutionStateArgs
) {
  const {
    projectId,
    walletAddress,
    isConnected,
    chainId,
    avalanchePublicClient,
    walletClient,
    settlement,
    entries,
    draftDirty,
    refresh,
    setLoading,
    setMessage,
  } = args;

  const [isDistributing, setIsDistributing] = useState(false);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [runtimeRowStatus, setRuntimeRowStatus] = useState<
    Record<string, DistributionRuntimeStatus>
  >({});
  const [preflight, setPreflight] = useState<TokenPreflight[]>([]);

  useEffect(() => {
    if (draftDirty) {
      setPreflight([]);
    }
  }, [draftDirty]);

  const walletNotice = useMemo(
    () =>
      !isConnected
        ? "ウォレット未接続です"
        : settlement?.status === "READY_FOR_DISTRIBUTION" && chainId !== 43114
        ? "Avalanche C-Chain(43114)に切り替えてください"
        : null,
    [chainId, isConnected, settlement?.status]
  );

  const canDistribute = useMemo(
    () =>
      settlement?.status === "READY_FOR_DISTRIBUTION" &&
      chainId === 43114 &&
      !!walletAddress &&
      !draftDirty &&
      !isDistributing,
    [chainId, draftDirty, isDistributing, settlement?.status, walletAddress]
  );

  const hasPreflightFailure = useMemo(
    () => preflight.length > 0 && preflight.some((row) => !row.sufficient),
    [preflight]
  );

  const resetExecutionRuntime = useCallback(() => {
    setRuntimeRowStatus({});
    setActiveEntryId(null);
    setPreflight([]);
    setIsDistributing(false);
  }, []);

  const postDistributionRowResult = useCallback(
    async (input: {
      entryId: string;
      status: "SENT" | "FAILED";
      txHash?: string;
      executionId?: string;
      errorReason?: string;
    }): Promise<string | null> => {
      if (!projectId || !walletAddress) return null;

      const result = await saveProjectSettlementDistributionResult({
        projectId,
        address: walletAddress,
        entryId: input.entryId,
        status: input.status,
        txHash: input.txHash,
        executionId: input.executionId,
        errorReason: input.errorReason,
      });

      if (!result.ok) {
        throw new Error(result.error);
      }

      return result.executionId;
    },
    [projectId, walletAddress]
  );

  const getTargets = useCallback(
    (mode: DistributionMode): DistributionEntry[] => {
      return mode === "FAILED_ONLY"
        ? entries.filter((entry) => entry.status === "FAILED")
        : entries.filter(
            (entry) => entry.status !== "SENT" && entry.status !== "CANCELLED"
          );
    },
    [entries]
  );

  const runPreflight = useCallback(
    async (mode: DistributionMode): Promise<PreflightResult> => {
      if (!walletAddress) {
        return { ok: false, checks: [], reason: "ADDRESS_REQUIRED" };
      }
      if (!avalanchePublicClient) {
        return { ok: false, checks: [], reason: "PUBLIC_CLIENT_NOT_READY" };
      }

      const targets = getTargets(mode);
      const sum: Record<CurrencyCode, bigint> = {
        JPYC: 0n,
        USDC: 0n,
      };

      for (const row of targets) {
        try {
          const amount = BigInt(row.amountAtomic);
          if (amount <= 0n) continue;
          sum[row.token] = sum[row.token] + amount;
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

        const balance = await avalanchePublicClient.readContract({
          address: tokenAddress,
          abi: ERC20_BALANCE_OF_ABI,
          functionName: "balanceOf",
          args: [getAddress(walletAddress)],
        });

        checks.push({
          token,
          tokenAddress,
          requiredAtomic,
          walletBalanceAtomic: balance,
          sufficient: balance >= requiredAtomic,
        });
      }

      const ok = checks.every((check) => check.sufficient);
      return {
        ok,
        checks,
        reason: ok ? undefined : "INSUFFICIENT_TOKEN_BALANCE",
      };
    },
    [avalanchePublicClient, getTargets, walletAddress]
  );

  const checkBalances = useCallback(
    async (mode: DistributionMode = "ALL") => {
      try {
        const result = await runPreflight(mode);
        setPreflight(result.checks);
        if (!result.ok) {
          setMessage(result.reason ?? "PRECHECK_FAILED");
        } else {
          setMessage("BALANCE_CHECK_OK");
        }
        return result;
      } catch {
        setPreflight([]);
        setMessage("BALANCE_CHECK_FAILED");
        return { ok: false, checks: [], reason: "BALANCE_CHECK_FAILED" };
      }
    },
    [runPreflight, setMessage]
  );

  const runCctpAction = useCallback(
    async (action: CctpAction, payload: Record<string, unknown>) => {
      if (!projectId || !walletAddress) {
        setMessage("ADDRESS_REQUIRED");
        return;
      }

      setLoading(true);
      setMessage(null);

      try {
        const result = await runProjectCctpAction({
          projectId,
          address: walletAddress,
          action,
          payload,
        });

        if (!result.ok) {
          setMessage(result.error);
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
    },
    [projectId, refresh, setLoading, setMessage, walletAddress]
  );

  const markEntryResult = useCallback(
    async (entry: DistributionEntry, status: "SENT" | "FAILED") => {
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
        const result = await saveProjectSettlementDistributionResult({
          projectId,
          address: walletAddress,
          entryId: entry.id,
          status,
          txHash: txHash?.trim() || undefined,
          errorReason:
            status === "FAILED" ? "MANUAL_MARKED_FAILED" : undefined,
        });

        if (!result.ok) {
          setMessage(result.error);
          return;
        }

        setMessage(
          status === "SENT"
            ? "DISTRIBUTION_RESULT_MARKED_SENT"
            : "DISTRIBUTION_RESULT_MARKED_FAILED"
        );
        await refresh();
      } catch {
        setMessage("DISTRIBUTION_RESULT_SAVE_FAILED");
      } finally {
        setLoading(false);
      }
    },
    [projectId, refresh, setLoading, setMessage, walletAddress]
  );

  const executeDistribution = useCallback(
    async (mode: DistributionMode) => {
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
      if (!precheck.ok) return;

      setIsDistributing(true);
      setLoading(true);
      setMessage("DISTRIBUTION_EXECUTION_STARTED");
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
            chain: undefined,
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
        } catch (error) {
          const reason = error instanceof Error ? error.message : "TX_FAILED";
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
    },
    [
      avalanchePublicClient,
      chainId,
      checkBalances,
      draftDirty,
      getTargets,
      isConnected,
      postDistributionRowResult,
      projectId,
      refresh,
      settlement,
      setLoading,
      setMessage,
      walletAddress,
      walletClient,
    ]
  );

  return {
    isDistributing,
    activeEntryId,
    runtimeRowStatus,
    preflight,
    walletNotice,
    canDistribute,
    hasPreflightFailure,
    resetExecutionRuntime,
    checkBalances,
    executeDistribution,
    runCctpAction,
    markEntryResult,
  };
}
