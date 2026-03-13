"use client";

import React, { useEffect } from "react";
import type { WalletBalances } from "@/lib/walletService";
import { getChainConfig, type SupportedChainId } from "@/lib/chainConfig";
import type { Currency } from "@/components/profile/profileClientHelpers";
import { formatReadableNumber } from "@/lib/numberFormat";

export type WalletSectionProps = {
  // 状態
  connected: boolean;
  isWalletConnecting: boolean;
  walletLabel: string;

  activeAddress: string;
  currentChainId: number | undefined;
  selectedChainId: SupportedChainId;
  connectedChainId: number | null;

  onWrongChain: boolean;

  // in-app
  inApp: boolean;
  suppressConnectUI: boolean;
  resumeBusy: boolean;

  // balances
  walletBalances: WalletBalances | null;
  walletBalancesLoading: boolean;

  // send ui 表示条件（親で判定して渡す）
  showSendUI: boolean;

  // 表示に必要
  headerColor: string;
  creatorDisplayName: string; // displayName or username
  selectedPostSummary: string | null;

  // 送金フォームの入力状態（親管理のまま）
  selectableChainIds: SupportedChainId[];
  currency: Currency;
  amount: string;

  // handlers
  onDisconnect: () => void;
  onOpenInMetaMaskDapp: () => void;
  onSwitchChainToSelected: () => void;
  onRefreshBalances: () => void;

  onChangeChain: (next: SupportedChainId) => void;
  onChangeCurrency: (next: Currency) => void;
  onChangeAmount: (next: string) => void;
  onClearSelectedPost: () => void;

  onSend: () => void;
  onSendEnter: () => void;

  // increments UI
  incrementButtons: Array<{
    key: string;
    label: string;
    disabled: boolean;
    onClick: () => void;
  }>;

  // 送金中フラグ（UI disable 用）
  sending: boolean;
};

export function WalletSection(props: WalletSectionProps) {
  useEffect(() => {
    void import("@/lib/appkitInstance");
  }, []);

  const {
    connected,
    isWalletConnecting,
    walletLabel,
    activeAddress,
    currentChainId,
    selectedChainId,
    connectedChainId,
    onWrongChain,

    inApp,
    suppressConnectUI,
    resumeBusy,

    walletBalances,
    walletBalancesLoading,

    showSendUI,

    headerColor,
    creatorDisplayName,
    selectedPostSummary,

    selectableChainIds,
    currency,
    amount,

    onDisconnect,
    onOpenInMetaMaskDapp,
    onSwitchChainToSelected,
    onRefreshBalances,

    onChangeChain,
    onChangeCurrency,
    onChangeAmount,
    onClearSelectedPost,

    onSend,
    onSendEnter,

    incrementButtons,
    sending,
  } = props;

  const requiredChainConfig = getChainConfig(selectedChainId);

  return (
    <div className="mt-6 w-full space-y-4 rounded-3xl border border-gray-200/80 bg-white p-5 shadow-sm sm:p-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-wide text-gray-500">
          Support
        </p>
        <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
          {connected
            ? `${walletLabel} に接続済み`
            : isWalletConnecting
            ? "ウォレットに接続中…"
            : "ウォレットを接続して支援する"}
        </h3>
        <p className="mt-1 text-xs leading-5 text-gray-500">
          接続したあとに、ネットワーク、通貨、金額の順で選びます。
        </p>
      </div>

      <div className="grid place-items-center">
        <div className="w-full flex justify-center">
          {suppressConnectUI ? (
            <div className="flex flex-col items-center gap-2">
              <div className="text-[11px] text-gray-500">
                送金結果を確認中…（再接続は不要です）
              </div>
              <div className="text-[11px] text-gray-400">
                画面を閉じずにお待ちください
              </div>
            </div>
          ) : !connected ? (
            <div className="flex flex-col items-center gap-2">
              <appkit-button />
              {isWalletConnecting && (
                <div className="text-[11px] text-gray-500">接続処理中…</div>
              )}
              {!isWalletConnecting ? (
                <div className="text-[11px] text-gray-500">
                  接続すると、この下に送金手順が表示されます。
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="text-[11px] text-gray-500">
                {activeAddress
                  ? `${activeAddress.slice(0, 6)}…${activeAddress.slice(-4)}`
                  : "接続済み"}
              </div>

              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={onDisconnect}
                disabled={isWalletConnecting || sending || resumeBusy}
              >
                ウォレットを切断
              </button>
            </div>
          )}
        </div>
      </div>

          {inApp && !connected && (
        <>
          <p className="mt-2 text-center text-[11px] leading-relaxed text-amber-700">
            アプリ内ブラウザではウォレットが開かないことがあります。
            その場合は外部ブラウザか MetaMask アプリで開いてください。
          </p>
          <div className="mt-1 flex justify-center">
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={onOpenInMetaMaskDapp}
            >
              MetaMaskアプリで開く
            </button>
          </div>
        </>
      )}

      {/* 接続状態表示＋残高 */}
      <div className="mt-2 text-center">
        {connected ? (
          <>
            <div className="mt-3 inline-block w-full max-w-md rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-left">
              <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                支援に使う残高
              </p>

              {walletBalancesLoading && (
                <div className="text-xs text-gray-500">読み込み中…</div>
              )}

              {!walletBalancesLoading && walletBalances && (
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-purple-500" />
                      <span>
                        {walletBalances.nativeSymbol ??
                          requiredChainConfig?.nativeSymbol ??
                          "Native"}
                        （ガス代）
                      </span>
                    </div>
                    <span className="font-mono font-semibold">
                      {(() => {
                        const v = Number(walletBalances.nativeFormatted);
                        if (!Number.isFinite(v)) {
                          return `0 ${
                            walletBalances.nativeSymbol ??
                            requiredChainConfig?.nativeSymbol ??
                            "Native"
                          }`;
                        }
                        const formatted = formatReadableNumber(v, {
                          maximumFractionDigits: 6,
                        });
                        return `${formatted} ${
                          walletBalances.nativeSymbol ??
                          requiredChainConfig?.nativeSymbol ??
                          "Native"
                        }`;
                      })()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
                      <span>JPYC</span>
                    </div>
                    <span className="font-mono font-semibold">
                      {(() => {
                        const jpyc = walletBalances.tokens?.JPYC;
                        if (!jpyc) return "…";
                        const v = Number(jpyc.formatted);
                        if (!Number.isFinite(v)) return "0 JPYC";
                        return `${formatReadableNumber(v, {
                          maximumFractionDigits: 2,
                        })} JPYC`;
                      })()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span>USDC</span>
                    </div>
                    <span className="font-mono font-semibold">
                      {(() => {
                        const usdc = walletBalances.tokens?.USDC;
                        if (!usdc) return "…";
                        const v = Number(usdc.formatted);
                        if (!Number.isFinite(v)) return "0.00 USDC";
                        return `${formatReadableNumber(v, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} USDC`;
                      })()}
                    </span>
                  </div>
                </div>
              )}

              {!walletBalancesLoading && !walletBalances && (
                <div className="text-xs text-gray-500">
                  残高を取得できませんでした
                </div>
              )}

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-100"
                  onClick={onRefreshBalances}
                  disabled={walletBalancesLoading}
                >
                  残高を更新
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-col items-center gap-1 text-xs text-gray-500">
              <div>
                接続中ネットワーク:{" "}
                <span className="font-medium">
                  {currentChainId !== undefined
                    ? getChainConfig(currentChainId as SupportedChainId)
                        ?.shortName ?? `Chain(${currentChainId})`
                    : "未接続"}
                </span>
              </div>
              <div>この下で支援内容を選べます。</div>
            </div>

            {/* 送金UI（ネットワーク一致時のみ） */}
            {showSendUI && (
              <div className="mx-auto mt-6 w-full max-w-2xl rounded-3xl border border-gray-200 bg-gray-50 p-5 text-left">
                <div className="mb-4 text-center">
                  <h3
                    className="text-base font-semibold sm:text-lg"
                    style={{ color: headerColor }}
                  >
                    {creatorDisplayName} さんを支援する
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    下から順に選ぶと、そのまま送金まで進めます。
                  </p>
                </div>

                {selectedPostSummary ? (
                  <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                          Post tip
                        </div>
                        <p className="mt-1 text-sm leading-6 text-emerald-900">
                          この投稿を支援対象に選択しています。
                        </p>
                        <p className="mt-2 text-xs leading-5 text-emerald-800">
                          {selectedPostSummary}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                        onClick={onClearSelectedPost}
                      >
                        選択を解除
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Step 1
                    </div>
                    <label className="mt-1 block text-sm font-medium text-gray-700">
                      ネットワークを選ぶ
                    </label>
                    <div className="mt-2">
                      <select
                        className="input w-full px-2 py-2 text-sm"
                        value={String(selectedChainId)}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          onChangeChain(v as SupportedChainId);
                        }}
                      >
                        {selectableChainIds.map((id) => {
                          const cfg = getChainConfig(id);
                          return (
                            <option key={String(id)} value={String(id)}>
                              {cfg?.name ?? `Chain(${id})`}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="mt-2 text-[11px] leading-5 text-gray-500">
                      ウォレット側も同じネットワークに切り替えてください。
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Step 2
                    </div>
                    <label className="mt-1 block text-sm font-medium text-gray-700">
                      通貨を選ぶ
                    </label>
                    <div className="mt-2">
                      <select
                        className="input w-full px-2 py-2 text-sm"
                        value={currency}
                        onChange={(e) =>
                          onChangeCurrency(e.target.value as Currency)
                        }
                      >
                        <option value="JPYC">JPYC</option>
                        <option value="USDC">USDC</option>
                      </select>
                    </div>
                    <div className="mt-2 text-[11px] leading-5 text-gray-500">
                      ここで選んだ通貨に合わせて金額表示も変わります。
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Step 3
                  </div>
                  <label className="mt-1 block text-sm font-medium text-gray-700">
                    金額を入力する
                  </label>
                  <div className="mt-2 text-[11px] leading-5 text-gray-500">
                    よく使う金額を選ぶか、直接入力します。
                  </div>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      className="input flex-1 px-3 py-2"
                      value={amount}
                      onChange={(e) => onChangeAmount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          onSendEnter();
                        }
                      }}
                    />

                    <span className="text-sm text-gray-500">
                      {currency === "JPYC" ? "円 / JPYC" : "USD"}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {incrementButtons.map((b) => (
                      <button
                        key={b.key}
                        type="button"
                        style={{
                          minHeight: "48px",
                          backgroundColor: headerColor,
                          color: "white",
                          borderRadius: "0.75rem",
                          fontWeight: 600,
                          transition: "0.2s",
                        }}
                        onClick={b.onClick}
                        disabled={b.disabled}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                      Step 4
                    </div>
                    <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs leading-5 text-gray-500">
                        送金先と金額を確認してから、ウォレットで承認します。
                      </p>
                      <button
                        style={{
                          backgroundColor: headerColor,
                          color: "#fff",
                          padding: "0.75rem 1rem",
                          borderRadius: "0.75rem",
                          fontWeight: 600,
                          transition: "0.2s",
                        }}
                        onClick={onSend}
                        disabled={sending || !amount}
                      >
                        支援を送る
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 text-center">
                    <p className="mt-1 text-xs text-gray-500">
                      送金先と金額を確認してから進んでください
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-500">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              <span>接続中</span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <span className="inline-flex h-2 w-2 rounded-full bg-gray-400" />
            <span>未接続</span>
          </div>
        )}
      </div>

      {/* ネットワーク警告 */}
      {connected && onWrongChain && (
        <div className="mt-3 rounded-xl border border-amber-300/60 bg-amber-50/80 p-3 text-amber-800">
          <div className="flex items-start justify-between gap-3">
            <div className="text-xs sm:text-sm">
              ネットワークが違います。選択中のネットワークに切り替えてください。
              <div className="mt-1 text-[11px] text-amber-800/90">
                選択中:{" "}
                <span className="font-semibold">
                  {getChainConfig(selectedChainId)?.shortName ??
                    `Chain(${selectedChainId})`}
                </span>{" "}
                / 接続中:{" "}
                <span className="font-semibold">
                  {connectedChainId != null
                    ? getChainConfig(connectedChainId as SupportedChainId)
                        ?.shortName ?? `Chain(${connectedChainId})`
                    : "-"}
                </span>
              </div>
            </div>
            <div className="shrink-0">
              <appkit-network-button />
            </div>
          </div>

          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 text-[11px] underline hover:no-underline"
            onClick={onSwitchChainToSelected}
          >
            ブラウザ拡張のMetaMaskで切り替える
          </button>
        </div>
      )}
    </div>
  );
}
