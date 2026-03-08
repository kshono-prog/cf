"use client";

import { useCallback, useMemo, useState } from "react";
import {
  getAddress,
  isAddress,
  isHash,
  type PublicClient,
  type WalletClient,
} from "viem";

import {
  asBridgePrepareResponse,
  type BridgeReverifyApiResponse,
  type BridgeSourceChain,
  type BridgeStep,
  type RefreshProjectSettlement,
  type SetProjectSettlementLoading,
  type SetProjectSettlementMessage,
  ERC20_ALLOWANCE_ABI,
  ERC20_APPROVE_ABI,
  expectedSourceChainId,
  formatChainName,
  getBridgeExecutionConfig,
  ICTT_SEND_ABI,
  parseBridgeAmountAtomic,
} from "@/components/mypage/projectSettlementRuntime";
import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";
import {
  prepareProjectBridge,
  recordProjectSettlementBridge,
  reverifyProjectBridge,
  saveProjectBridgeRun,
} from "@/lib/mypage/api";

type UseProjectSettlementBridgeStateArgs = {
  projectId: string | null;
  walletAddress: string | null;
  isConnected: boolean;
  projectCurrency: CurrencyCode;
  chainId: number;
  sourcePublicClient: PublicClient | undefined;
  walletClient: WalletClient | undefined;
  bridgeSteps: BridgeStep[];
  refresh: RefreshProjectSettlement;
  setLoading: SetProjectSettlementLoading;
  setMessage: SetProjectSettlementMessage;
};

export function useProjectSettlementBridgeState(
  args: UseProjectSettlementBridgeStateArgs
) {
  const {
    projectId,
    walletAddress,
    isConnected,
    projectCurrency,
    chainId,
    sourcePublicClient,
    walletClient,
    bridgeSteps,
    refresh,
    setLoading,
    setMessage,
  } = args;

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

  const polygonDone = useMemo(
    () =>
      bridgeSteps.some(
        (step) =>
          step.sourceChain === "POLYGON" && step.status === "COMPLETED"
      ),
    [bridgeSteps]
  );
  const ethereumDone = useMemo(
    () =>
      bridgeSteps.some(
        (step) =>
          step.sourceChain === "ETHEREUM" && step.status === "COMPLETED"
      ),
    [bridgeSteps]
  );

  const recordBridge = useCallback(
    async (sourceChain: BridgeSourceChain) => {
      if (!projectId || !walletAddress) {
        setMessage("ADDRESS_REQUIRED");
        return;
      }

      const amount =
        sourceChain === "POLYGON" ? bridgeAmountPolygon : bridgeAmountEthereum;
      const txHash =
        sourceChain === "POLYGON"
          ? bridgeTxPolygon.trim()
          : bridgeTxEthereum.trim();

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
        const result = await recordProjectSettlementBridge({
          projectId,
          address: walletAddress,
          sourceChain,
          token: projectCurrency,
          bridgedAmountAtomic: amount,
          txHash: txHash || undefined,
          completedAt: new Date().toISOString(),
        });

        if (!result.ok) {
          setMessage(result.error);
          return;
        }

        setMessage(`${formatChainName(sourceChain)} bridge を記録しました`);
        await refresh();
      } catch {
        setMessage("BRIDGE_RECORD_FAILED");
      } finally {
        setLoading(false);
      }
    },
    [
      bridgeAmountEthereum,
      bridgeAmountPolygon,
      bridgeTxEthereum,
      bridgeTxPolygon,
      projectCurrency,
      projectId,
      refresh,
      setLoading,
      setMessage,
      walletAddress,
    ]
  );

  const runOneClickBridge = useCallback(
    async (sourceChain: BridgeSourceChain) => {
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

        const prepareResult = await prepareProjectBridge({
          projectId,
          address: walletAddress,
          currency: projectCurrency,
          provider: "MANUAL",
        });
        if (!prepareResult.ok) {
          setBridgeNowStatus((prev) => ({
            ...prev,
            [sourceChain]: prepareResult.error,
          }));
          return;
        }

        const prepared = asBridgePrepareResponse(prepareResult.data);
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

        const config =
          cfgFromPrepare ??
          getBridgeExecutionConfig(prepared.source.chainId, projectCurrency);
        if (!config) {
          const missing = prepared.ictt?.missing?.length
            ? `: ${prepared.ictt.missing.join(", ")}`
            : "";
          setBridgeNowStatus((prev) => ({
            ...prev,
            [sourceChain]: `ICTT_CONFIG_NOT_READY${missing}`,
          }));
          return;
        }

        const atomicAmount = parseBridgeAmountAtomic(
          prepared.snapshotConfirmedTotalAmountDecimal,
          config.tokenDecimals
        );
        if (atomicAmount === null || atomicAmount <= 0n) {
          setBridgeNowStatus((prev) => ({
            ...prev,
            [sourceChain]: "BRIDGE_AMOUNT_INVALID",
          }));
          return;
        }

        if (config.sourceTokenAddress) {
          setBridgeNowStatus((prev) => ({
            ...prev,
            [sourceChain]: "approve確認中...",
          }));

          const allowance = await sourcePublicClient.readContract({
            address: config.sourceTokenAddress,
            abi: ERC20_ALLOWANCE_ABI,
            functionName: "allowance",
            args: [getAddress(walletAddress), config.tokenTransferrerAddress],
          });

          if (allowance < atomicAmount) {
            setBridgeNowStatus((prev) => ({
              ...prev,
              [sourceChain]: "approve署名を待っています...",
            }));
            const approveHash = await walletClient.writeContract({
              address: config.sourceTokenAddress,
              abi: ERC20_APPROVE_ABI,
              functionName: "approve",
              args: [config.tokenTransferrerAddress, atomicAmount],
              account: getAddress(walletAddress),
              chain: undefined,
            });
            const approveReceipt =
              await sourcePublicClient.waitForTransactionReceipt({
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
          address: config.tokenTransferrerAddress,
          abi: ICTT_SEND_ABI,
          functionName: "send",
          args: [
            {
              destinationBlockchainId: config.destinationBlockchainId,
              destinationTokenTransferrerAddress:
                config.destinationTokenTransferrerAddress,
              recipient: getAddress(prepared.destination.recipientAddress),
              amount: atomicAmount,
              requiredGasLimit: config.requiredGasLimit,
            },
          ],
          account: getAddress(walletAddress),
          chain: undefined,
        });

        const bridgeReceipt = await sourcePublicClient.waitForTransactionReceipt({
          hash: bridgeHash,
          confirmations: 1,
          timeout: 180_000,
        });
        if (bridgeReceipt.status !== "success") {
          setBridgeNowStatus((prev) => ({
            ...prev,
            [sourceChain]: "BRIDGE_TX_FAILED",
          }));
          return;
        }

        setBridgeNowStatus((prev) => ({
          ...prev,
          [sourceChain]: "bridge/run保存中...",
        }));

        const runResult = await saveProjectBridgeRun({
          projectId,
          address: walletAddress,
          bridgeRunId: prepared.bridgeRunId,
          bridgeTxHash: bridgeHash,
        });
        if (!runResult.ok) {
          setBridgeNowStatus((prev) => ({
            ...prev,
            [sourceChain]: runResult.error,
          }));
          return;
        }

        setBridgeNowStatus((prev) => ({
          ...prev,
          [sourceChain]: "着金確認中(reverify)...",
        }));

        let verified = false;
        for (let index = 0; index < 20; index += 1) {
          const reverifyResult = await reverifyProjectBridge({
            projectId,
            address: walletAddress,
            bridgeRunId: prepared.bridgeRunId,
          });
          if (!reverifyResult.ok) {
            setBridgeNowStatus((prev) => ({
              ...prev,
              [sourceChain]: reverifyResult.error,
            }));
            return;
          }

          const parsed =
            reverifyResult.data && typeof reverifyResult.data === "object"
              ? (reverifyResult.data as BridgeReverifyApiResponse)
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

        const settlementBridgeResult = await recordProjectSettlementBridge({
          projectId,
          address: walletAddress,
          sourceChain,
          token: projectCurrency,
          bridgedAmountAtomic: atomicAmount.toString(),
          txHash: bridgeHash,
          completedAt: new Date().toISOString(),
          memo: "AUTO_ONE_CLICK_BRIDGE",
        });
        if (!settlementBridgeResult.ok) {
          setBridgeNowStatus((prev) => ({
            ...prev,
            [sourceChain]: settlementBridgeResult.error,
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
      } catch (error) {
        const messageText =
          error instanceof Error ? error.message : "BRIDGE_NOW_FAILED";
        setBridgeNowStatus((prev) => ({ ...prev, [sourceChain]: messageText }));
      } finally {
        setBridgeNowBusy((prev) => ({ ...prev, [sourceChain]: false }));
      }
    },
    [
      chainId,
      isConnected,
      projectCurrency,
      projectId,
      refresh,
      setMessage,
      sourcePublicClient,
      walletAddress,
      walletClient,
    ]
  );

  return {
    bridgeAmountPolygon,
    setBridgeAmountPolygon,
    bridgeTxPolygon,
    setBridgeTxPolygon,
    bridgeAmountEthereum,
    setBridgeAmountEthereum,
    bridgeTxEthereum,
    setBridgeTxEthereum,
    bridgeNowBusy,
    bridgeNowStatus,
    polygonDone,
    ethereumDone,
    recordBridge,
    runOneClickBridge,
  };
}
