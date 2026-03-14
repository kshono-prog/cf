"use client";

import { useEffect, useState } from "react";
import { useChainId, useDisconnect } from "wagmi";
import type { Address } from "viem";

import { getChainConfig, getDefaultChainId, isSupportedChainId } from "@/lib/chainConfig";
import { formatReadableNumber } from "@/lib/numberFormat";
import type { WalletBalances } from "@/lib/walletService";

type WalletOverviewCardProps = {
  address: Address | undefined;
  isConnected: boolean;
};

export function WalletOverviewCard(props: WalletOverviewCardProps) {
  const chainId = useChainId();
  const { disconnectAsync } = useDisconnect();
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!props.address || !props.isConnected) {
      setBalances(null);
      return;
    }

    let cancelled = false;

    async function loadBalances() {
      setLoading(true);
      try {
        const { readBalances } = await import("@/lib/walletService");
        const balanceChainId = isSupportedChainId(chainId)
          ? chainId
          : getDefaultChainId();
        const nextBalances = await readBalances({
          chainId: balanceChainId,
          account: props.address as Address,
          tokenKeys: ["JPYC", "USDC"],
        });

        if (!cancelled) {
          setBalances(nextBalances);
        }
      } catch {
        if (!cancelled) {
          setBalances(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadBalances();

    return () => {
      cancelled = true;
    };
  }, [chainId, props.address, props.isConnected]);

  async function handleDisconnect(): Promise<void> {
    try {
      await disconnectAsync();
    } catch {
      // ignore connector disconnect errors
    }

    const { appkit } = await import("@/lib/appkitInstance");
    await appkit.disconnect();
  }

  const chainLabel =
    chainId && isSupportedChainId(chainId)
      ? getChainConfig(chainId)?.name ?? `Chain ${chainId}`
      : "未接続";

  return (
    <section className="surface-card p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">ウォレット</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
            応援の受け取りや接続状態に関わる情報を、ここで静かに確認できます。
          </p>
        </div>
        {props.isConnected ? (
          <button type="button" className="btn-secondary" onClick={() => void handleDisconnect()}>
            接続解除
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="surface-subtle px-4 py-4">
          <div className="text-sm text-[var(--text-subtle)]">接続状態</div>
          <div className="mt-2 text-base font-semibold text-[var(--text)]">
            {props.isConnected ? "接続中" : "未接続"}
          </div>
        </div>
        <div className="surface-subtle px-4 py-4">
          <div className="text-sm text-[var(--text-subtle)]">ネットワーク</div>
          <div className="mt-2 text-base font-semibold text-[var(--text)]">
            {chainLabel}
          </div>
        </div>
        <div className="surface-subtle px-4 py-4">
          <div className="text-sm text-[var(--text-subtle)]">残高</div>
          <div className="mt-2 text-base font-semibold text-[var(--text)]">
            {loading
              ? "読み込み中です"
              : balances
              ? `${formatReadableNumber(
                  Number(balances.tokens.JPYC?.formatted ?? "0"),
                  { maximumFractionDigits: 2 }
                )} JPYC`
              : "うまく読み込めませんでした"}
          </div>
        </div>
      </div>

      {props.address ? (
        <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
          <div className="text-sm text-[var(--text-subtle)]">接続中アドレス</div>
          <div className="mt-2 break-all font-mono text-sm text-[var(--text)]">
            {props.address}
          </div>
        </div>
      ) : null}
    </section>
  );
}
