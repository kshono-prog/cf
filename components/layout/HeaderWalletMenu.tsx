"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAccount, useChainId, useDisconnect } from "wagmi";
import type { Address } from "viem";

import { useTheme } from "@/components/theme/ThemeProvider";
import { getChainConfig, getDefaultChainId, isSupportedChainId } from "@/lib/chainConfig";
import { formatReadableNumber } from "@/lib/numberFormat";
import { clearPublicViewerIdentityCache } from "@/lib/publicViewerIdentityClient";
import {
  getSystemTheme,
  resolveTheme,
  type ThemePreference,
} from "@/lib/theme";
import type { WalletBalances } from "@/lib/walletService";

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function MenuCaret(props: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 transition ${props.open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path
        d="M5 7.5 10 12.5 15 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const themeOptions: Array<{ value: ThemePreference; label: string }> = [
  { value: "light", label: "ライト" },
  { value: "dark", label: "ダーク" },
  { value: "system", label: "自動" },
];

function ThemeModeSection() {
  const { preference, setPreference } = useTheme();

  async function handleThemeChange(nextPreference: ThemePreference): Promise<void> {
    setPreference(nextPreference);

    const nextResolvedTheme = resolveTheme(nextPreference, getSystemTheme());
    const maybeAppKit = await import("@/lib/appkitInstance").catch(() => null);
    maybeAppKit?.appkit.setThemeMode(nextResolvedTheme);
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-3">
      <div className="text-[11px] font-semibold tracking-[0.16em] text-[var(--text-subtle)]">
        表示モード
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {themeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={
              preference === option.value ? "action-pill-active" : "action-pill"
            }
            onClick={() => void handleThemeChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function HeaderWalletMenu({ username }: { username: string }) {
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();
  const { disconnectAsync } = useDisconnect();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !isConnected || !address) {
      if (!isConnected) {
        setBalances(null);
      }
      return;
    }

    let cancelled = false;

    async function loadBalances() {
      setBalancesLoading(true);
      try {
        const { readBalances } = await import("@/lib/walletService");
        const resolvedChainId = isSupportedChainId(chainId)
          ? chainId
          : getDefaultChainId();
        const nextBalances = await readBalances({
          chainId: resolvedChainId,
          account: address as Address,
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
          setBalancesLoading(false);
        }
      }
    }

    void loadBalances();

    return () => {
      cancelled = true;
    };
  }, [address, chainId, isConnected, open]);

  async function handleConnect(): Promise<void> {
    const { appkit } = await import("@/lib/appkitInstance");
    await appkit.open({ view: "Connect" });
  }

  async function handleDisconnect(): Promise<void> {
    const connectedAddress = address ?? null;
    try {
      await disconnectAsync();
    } catch {
      // ignore disconnect errors from connector
    }

    const { appkit } = await import("@/lib/appkitInstance");
    await appkit.disconnect();

    if (typeof window !== "undefined") {
      const keys = Object.keys(window.localStorage);
      for (const key of keys) {
        if (
          key.startsWith("wc@2:") ||
          key.startsWith("walletconnect") ||
          key.includes("WALLETCONNECT") ||
          key.includes("appkit") ||
          key.includes("reown")
        ) {
          window.localStorage.removeItem(key);
        }
      }
    }

    if (connectedAddress) {
      clearPublicViewerIdentityCache(connectedAddress);
    } else {
      clearPublicViewerIdentityCache();
    }

    setOpen(false);
  }

  const chainName =
    chainId && isSupportedChainId(chainId)
      ? getChainConfig(chainId)?.name ?? `Chain ${chainId}`
      : "未接続";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="menu-trigger"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
          <path
            d="M4.5 6.5h11M4.5 10h11M7 13.5h6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-sm font-semibold">ウォレット</span>
        <MenuCaret open={open} />
      </button>

      {open ? (
        <div className="menu-panel absolute right-0 top-[calc(100%+12px)] z-[60] w-[min(92vw,320px)] p-3">
          {!isConnected ? (
            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-[var(--text)]">
                  ウォレット接続
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
                  接続すると、応援や自分の設定をここから確認できます。
                </p>
              </div>
              <button
                type="button"
                className="btn w-full"
                onClick={() => void handleConnect()}
                disabled={status === "connecting" || status === "reconnecting"}
              >
                {status === "connecting" || status === "reconnecting"
                  ? "接続中です"
                  : "ウォレット接続"}
              </button>
              <ThemeModeSection />
              <Link
                href={`/${username}/mypage`}
                className="btn-secondary block w-full text-center"
                onClick={() => setOpen(false)}
              >
                使い方を見る
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-3">
                <div className="text-[11px] font-semibold tracking-[0.16em] text-[var(--text-subtle)]">
                  接続中アドレス
                </div>
                <div className="mt-1 font-mono text-sm text-[var(--text)]">
                  {address ? shortAddress(address) : "未接続"}
                </div>
              </div>

              <div className="grid gap-2">
                <div className="menu-item bg-[var(--surface-subtle)]">
                  <span className="text-sm">ネットワーク</span>
                  <span className="text-sm text-[var(--text-subtle)]">{chainName}</span>
                </div>
                <div className="menu-item bg-[var(--surface-subtle)]">
                  <span className="text-sm">残高</span>
                  <span className="text-sm text-[var(--text-subtle)]">
                    {balancesLoading
                      ? "読み込み中です"
                      : balances
                      ? `${formatReadableNumber(
                          Number(balances.tokens.JPYC?.formatted ?? "0"),
                          { maximumFractionDigits: 2 }
                        )} JPYC`
                      : "うまく読み込めませんでした"}
                  </span>
                </div>
                {balances ? (
                  <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-subtle)]">
                    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
                      JPYC {formatReadableNumber(
                        Number(balances.tokens.JPYC?.formatted ?? "0"),
                        { maximumFractionDigits: 2 }
                      )}
                    </div>
                    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
                      USDC {formatReadableNumber(
                        Number(balances.tokens.USDC?.formatted ?? "0"),
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <ThemeModeSection />

              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => void handleDisconnect()}
              >
                接続解除
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
