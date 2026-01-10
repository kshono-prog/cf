"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import type { Address } from "viem";

import { GasSupportCard } from "@/components/mypage/GasSupportCard";
import {
  claimGasSupport,
  fetchGasEligibility,
  fetchGasNonce,
} from "@/lib/mypage/api";
import type { GasEligibility } from "@/lib/mypage/types";
import { getChainConfig } from "@/lib/chainConfig";

type GasState = {
  data: GasEligibility | null;
  loading: boolean;
  claiming: boolean;
  txHash: string | null;
  error: string | null;
};

type ChainOption = {
  chainId: number;
  tokenSymbol: string;
  title: string;
  description: string;
};

const GAS_SUPPORT_CHAIN_IDS = [137, 43114] as const;
const API_BASE = "";

const EMPTY_STATE: GasState = {
  data: null,
  loading: false,
  claiming: false,
  txHash: null,
  error: null,
};

function buildChainOptions(): ChainOption[] {
  return GAS_SUPPORT_CHAIN_IDS.map((chainId) => {
    const config = getChainConfig(chainId);
    const tokenSymbol = config?.nativeSymbol ?? "POL";
    return {
      chainId,
      tokenSymbol,
      title: `ガス代支援（${tokenSymbol}）`,
      description: `JPYCを100円以上保有し、${tokenSymbol}残高が0の方は、少額の${tokenSymbol}を受け取って初回の送金を始められます。`,
    };
  });
}

export function GasSupportTabs() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const chainOptions = useMemo(() => buildChainOptions(), []);
  const [activeChainId, setActiveChainId] = useState<number>(
    chainOptions[0]?.chainId ?? 137
  );

  const [gasStates, setGasStates] = useState<Record<number, GasState>>(() => {
    const initial: Record<number, GasState> = {};
    chainOptions.forEach((option) => {
      initial[option.chainId] = { ...EMPTY_STATE };
    });
    return initial;
  });

  const updateGasState = useCallback(
    (chainId: number, patch: Partial<GasState>) => {
      setGasStates((prev) => ({
        ...prev,
        [chainId]: {
          ...(prev[chainId] ?? EMPTY_STATE),
          ...patch,
        },
      }));
    },
    []
  );

  const refreshEligibility = useCallback(
    async (chainId: number) => {
      if (!address) return;
      const addr: Address = address;
      updateGasState(chainId, { loading: true, error: null });
      try {
        const res = await fetchGasEligibility({
          apiBase: API_BASE,
          address: addr,
          chainId,
        });
        if (res.ok) {
          updateGasState(chainId, { data: res.data });
        } else {
          updateGasState(chainId, { data: null, error: res.error });
        }
      } catch {
        updateGasState(chainId, {
          data: null,
          error: "判定情報を取得できませんでした。",
        });
      } finally {
        updateGasState(chainId, { loading: false });
      }
    },
    [address, updateGasState]
  );

  const handleClaim = useCallback(
    async (chainId: number) => {
      if (!address) return;
      const addr: Address = address;
      updateGasState(chainId, { claiming: true, txHash: null, error: null });
      try {
        const nonce = await fetchGasNonce({
          apiBase: API_BASE,
          address: addr,
          chainId,
        });
        if (!nonce.ok) throw new Error(nonce.error);

        const signature = await signMessageAsync({ message: nonce.message });

        const claimed = await claimGasSupport({
          apiBase: API_BASE,
          address: addr,
          message: nonce.message,
          signature,
          chainId,
        });
        if (!claimed.ok) throw new Error(claimed.error);

        if (claimed.txHash) {
          updateGasState(chainId, { txHash: claimed.txHash });
        }
        await refreshEligibility(chainId);
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "ガス支援の実行に失敗しました。";
        updateGasState(chainId, { error: message });
      } finally {
        updateGasState(chainId, { claiming: false });
      }
    },
    [address, refreshEligibility, signMessageAsync, updateGasState]
  );

  useEffect(() => {
    if (!isConnected || !address) return;
    void refreshEligibility(activeChainId);
  }, [address, activeChainId, isConnected, refreshEligibility]);

  if (!isConnected || !address) return null;

  const activeOption =
    chainOptions.find((option) => option.chainId === activeChainId) ??
    chainOptions[0];
  const activeState = gasStates[activeChainId] ?? EMPTY_STATE;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-800">ガス代支援</h3>

      <div className="flex flex-wrap gap-2">
        {chainOptions.map((option) => {
          const isActive = option.chainId === activeChainId;
          return (
            <button
              key={option.chainId}
              type="button"
              onClick={() => setActiveChainId(option.chainId)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                isActive
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {option.tokenSymbol}
            </button>
          );
        })}
      </div>

      {activeOption && (
        <GasSupportCard
          address={address}
          shouldShow
          title={activeOption.title}
          description={activeOption.description}
          tokenSymbol={activeOption.tokenSymbol}
          gas={activeState.data}
          gasLoading={activeState.loading}
          gasClaiming={activeState.claiming}
          gasTxHash={activeState.txHash}
          onClaim={() => void handleClaim(activeOption.chainId)}
          onRefresh={() => void refreshEligibility(activeOption.chainId)}
        />
      )}

      {activeState.error && (
        <div className="alert-warn">
          <p className="text-[11px]">{activeState.error}</p>
        </div>
      )}
    </div>
  );
}
