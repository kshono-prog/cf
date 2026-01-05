"use client";

import React from "react";
import type { WalletBalances } from "@/lib/walletService";
import { getChainConfig, type SupportedChainId } from "@/lib/chainConfig";
import type { Currency } from "@/components/profile/profileClientHelpers";

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

    onSend,
    onSendEnter,

    incrementButtons,
    sending,
  } = props;

  const requiredChainConfig = getChainConfig(selectedChainId);

  return (
    <div className="mt-6 w-full rounded-2xl border border-gray-200 dark:border-gray-300 bg-white/95 dark:bg-white/95 backdrop-blur p-4 sm:p-5 space-y-3">
      <div className="text-center">
        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-500">
          Wallet
        </p>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-900">
          {connected
            ? `${walletLabel} に接続済み`
            : isWalletConnecting
            ? "ウォレットに接続中…"
            : "ウォレットに接続して投げ銭する"}
        </h3>
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
                切断 / Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      {inApp && !connected && (
        <>
          <p className="mt-2 text-[11px] text-center text-amber-700 dark:text-amber-700 leading-relaxed">
            アプリ内ブラウザではウォレットアプリが起動しない場合があります。
            「ブラウザで開く」または「MetaMaskアプリで開く」からアクセスしてください。
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
            {!onWrongChain && (
              <div
                className="
                  mt-3 px-5 py-4 
                  border border-gray-200 
                  rounded-2xl 
                  bg-white 
                  shadow-sm 
                  inline-block 
                  text-left
                  w-[260px]
                "
              >
                <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  ウォレット残高
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
                          const formatted =
                            v >= 0.001 ? v.toFixed(4) : v.toExponential(2);
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
                          const int = Math.floor(v);
                          return `${int.toLocaleString()} JPYC`;
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
                    className="text-[11px] px-2 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                    onClick={onRefreshBalances}
                    disabled={walletBalancesLoading}
                  >
                    残高を更新 / Refresh
                  </button>
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-col items-center gap-1 text-xs text-gray-500 dark:text-gray-600">
              <div>
                接続中ネットワーク:{" "}
                <span className="font-medium">
                  {currentChainId !== undefined
                    ? getChainConfig(currentChainId as SupportedChainId)
                        ?.shortName ?? `Chain(${currentChainId})`
                    : "未接続"}
                </span>
              </div>
            </div>

            {/* 送金UI（ネットワーク一致時のみ） */}
            {showSendUI && (
              <>
                <div className="mt-6 mb-2 text-center">
                  <h3
                    className="text-base sm:text-lg font-semibold"
                    style={{ color: headerColor }}
                  >
                    {creatorDisplayName} さんへの投げ銭
                  </h3>
                </div>

                {/* チェーン選択 */}
                <div className="mt-6">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-800">
                    ネットワーク / Network
                  </label>
                  <div className="mt-1">
                    <select
                      className="input w-52 px-2 py-2 text-sm"
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
                  <div className="mt-1 text-[11px] text-gray-500">
                    ※
                    この「送金ネットワーク」に合わせてウォレット側も切り替えてください
                  </div>
                </div>

                {/* 通貨 */}
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-800">
                    通貨 / Currency
                  </label>
                  <div className="mt-1">
                    <select
                      className="input w-28 px-2 py-2 text-sm"
                      value={currency}
                      onChange={(e) =>
                        onChangeCurrency(e.target.value as Currency)
                      }
                    >
                      <option value="JPYC">JPYC</option>
                      <option value="USDC">USDC</option>
                    </select>
                  </div>
                </div>

                {/* 金額 */}
                <div className="mt-4 space-y-3">
                  <label className="block text-sm text-gray-700 dark:text-gray-800">
                    送金金額 / Amount to send
                  </label>

                  <div className="flex items-center gap-2">
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

                    <span className="text-sm text-gray-500 dark:text-gray-700">
                      {currency === "JPYC" ? "円 / JPYC" : "USD"}
                    </span>

                    <button
                      style={{
                        backgroundColor: headerColor,
                        color: "#fff",
                        padding: "0.5rem 1rem",
                        borderRadius: "0.75rem",
                        fontWeight: 600,
                        transition: "0.2s",
                      }}
                      onClick={onSend}
                      disabled={sending || !amount}
                    >
                      投げ銭 / Send
                    </button>
                  </div>

                  <div className="flex gap-3">
                    {incrementButtons.map((b) => (
                      <button
                        key={b.key}
                        type="button"
                        style={{
                          flex: 1,
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

                  <div className="mt-6 mb-2 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-600 mt-1">
                      送金先を間違えないようご確認ください
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-600 mt-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              <span>接続中</span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-600">
            <span className="inline-flex h-2 w-2 rounded-full bg-gray-400" />
            <span>未接続</span>
          </div>
        )}
      </div>

      {/* ネットワーク警告 */}
      {connected && onWrongChain && (
        <div className="mt-3 rounded-xl border border-amber-300/60 bg-amber-50/80 dark:border-amber-300/80 dark:bg-amber-50/80 p-3 text-amber-800">
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
