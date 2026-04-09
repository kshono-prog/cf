"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAccount, useChainId, useDisconnect } from "wagmi";
import type { Address } from "viem";

import { useOwnerSession } from "@/context/OwnerSessionProvider";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getChainConfig, getDefaultChainId, isSupportedChainId } from "@/lib/chainConfig";
import { formatReadableNumber } from "@/lib/numberFormat";
import { logoutOwnerSession } from "@/lib/ownerAuthClient";
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

function StatusChip(props: {
  tone: "muted" | "success" | "attention";
  children: string;
}) {
  const toneClass =
    props.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : props.tone === "attention"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-[var(--line)] bg-[var(--surface)] text-[var(--text-subtle)]";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${toneClass}`}
    >
      {props.children}
    </span>
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

type HeaderWalletMenuProps = {
  username: string;
  menuPlacement?: "bottom-end" | "top-start";
  triggerVariant?: "default" | "sidebar";
};

function resolveMenuPanelClass(
  menuPlacement: "bottom-end" | "top-start",
  triggerVariant: "default" | "sidebar"
): string {
  if (menuPlacement === "top-start") {
    return triggerVariant === "sidebar"
      ? "menu-panel absolute bottom-[calc(100%+10px)] left-0 right-0 z-[60] p-3"
      : "menu-panel absolute bottom-[calc(100%+12px)] left-0 z-[60] w-[min(92vw,320px)] p-3";
  }

  return "menu-panel absolute right-0 top-[calc(100%+12px)] z-[60] w-[min(92vw,320px)] p-3";
}

function resolveRootClass(triggerVariant: "default" | "sidebar"): string {
  return triggerVariant === "sidebar" ? "relative w-full" : "relative";
}

function resolveTriggerClass(triggerVariant: "default" | "sidebar"): string {
  return triggerVariant === "sidebar"
    ? "flex min-h-[52px] w-full items-center justify-between gap-3 rounded-[20px] border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-[var(--text)] transition hover:bg-[var(--surface)]"
    : "menu-trigger";
}

export function HeaderWalletMenu({
  username,
  menuPlacement = "bottom-end",
  triggerVariant = "default",
}: HeaderWalletMenuProps) {
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();
  const { disconnectAsync } = useDisconnect();
  const ownerSession = useOwnerSession();
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
    await logoutOwnerSession().catch(() => undefined);
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

  async function handleAuthenticate(): Promise<void> {
    try {
      await ownerSession.authenticate();
    } finally {
      setOpen(false);
    }
  }

  async function handleAppLogout(): Promise<void> {
    try {
      await ownerSession.logout();
    } finally {
      setOpen(false);
    }
  }

  const chainName =
    chainId && isSupportedChainId(chainId)
      ? getChainConfig(chainId)?.name ?? `Chain ${chainId}`
      : "未接続";
  const walletBusy = status === "connecting" || status === "reconnecting";
  const authChecking = ownerSession.status === "checking";
  const authReady = ownerSession.status === "authenticated";
  const walletTriggerLabel = !isConnected
    ? walletBusy
      ? "接続中です"
      : "未接続"
    : address
    ? shortAddress(address)
    : "接続済み";

  return (
    <div ref={rootRef} className={resolveRootClass(triggerVariant)}>
      <button
        type="button"
        className={resolveTriggerClass(triggerVariant)}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {triggerVariant === "sidebar" ? (
          <span className="flex min-w-0 items-center gap-3 text-left">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)]">
              <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M4.5 6.5h11M4.5 10h11M7 13.5h6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[var(--text)]">
                ウォレット
              </span>
              <span className="block truncate text-xs text-[var(--text-subtle)]">
                {walletTriggerLabel}
              </span>
            </span>
          </span>
        ) : (
          <>
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
          </>
        )}
        <MenuCaret open={open} />
      </button>

      {open ? (
        <div className={resolveMenuPanelClass(menuPlacement, triggerVariant)}>
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
                disabled={walletBusy}
              >
                {walletBusy ? "接続中です" : "ウォレット接続"}
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
              <div className="flex flex-wrap gap-2">
                <StatusChip tone="success">接続済み</StatusChip>
                {authReady ? (
                  <StatusChip tone="success">認証済み</StatusChip>
                ) : authChecking ? (
                  <StatusChip tone="muted">認証確認中</StatusChip>
                ) : (
                  <StatusChip tone="attention">認証が必要</StatusChip>
                )}
              </div>

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
                  <div className="grid gap-2 text-xs text-[var(--text-subtle)]">
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

              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-3">
                <div className="text-[11px] font-semibold tracking-[0.16em] text-[var(--text-subtle)]">
                  アプリ認証
                </div>
                <div className="mt-1 text-sm text-[var(--text)]">
                  {authReady
                    ? "署名検証済みセッションで保護機能を利用できます。"
                    : "署名はログインや保護操作が必要な時だけ求められます。"}
                </div>
              </div>

              <ThemeModeSection />

              {!authReady ? (
                <button
                  type="button"
                  className="btn w-full"
                  onClick={() => void handleAuthenticate()}
                  disabled={authChecking || walletBusy}
                >
                  {authChecking ? "認証を確認中です" : "アプリ認証"}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => void handleAppLogout()}
                  disabled={authChecking}
                >
                  アプリからログアウト
                </button>
              )}

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
