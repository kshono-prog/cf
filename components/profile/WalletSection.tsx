"use client";

import { getChainConfig, type SupportedChainId } from "@/lib/chainConfig";
import { formatReadableNumber } from "@/lib/numberFormat";
import type { WalletBalances } from "@/lib/walletService";
import type { Currency } from "@/components/profile/profileClientHelpers";

export type WalletSectionProps = {
  connected: boolean;
  isWalletConnecting: boolean;
  walletLabel: string;
  activeAddress: string;
  currentChainId: number | undefined;
  selectedChainId: SupportedChainId;
  connectedChainId: number | null;
  onWrongChain: boolean;
  inApp: boolean;
  suppressConnectUI: boolean;
  resumeBusy: boolean;
  walletBalances: WalletBalances | null;
  walletBalancesLoading: boolean;
  showSendUI: boolean;
  headerColor: string;
  creatorDisplayName: string;
  selectedProjectTitle: string | null;
  selectedProjectCurrency: Currency | null;
  currencyLocked: boolean;
  selectedPostSummary: string | null;
  selectableChainIds: SupportedChainId[];
  currency: Currency;
  amount: string;
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
  incrementButtons: Array<{
    key: string;
    label: string;
    disabled: boolean;
    onClick: () => void;
  }>;
  sending: boolean;
};

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function WalletSection(props: WalletSectionProps) {
  const currentChainLabel =
    props.currentChainId != null
      ? getChainConfig(props.currentChainId as SupportedChainId)?.shortName ??
        `Chain ${props.currentChainId}`
      : "未接続";
  const selectedChainLabel =
    getChainConfig(props.selectedChainId)?.shortName ??
    `Chain ${props.selectedChainId}`;

  return (
    <div className="space-y-4">
      <div className="surface-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">
              {props.connected
                ? "応援の準備ができています"
                : "ウォレット接続で応援を始められます"}
            </div>
            <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
              {props.connected
                ? `${props.creatorDisplayName} さんへの応援は、接続したウォレットから直接送ります。`
                : `${props.creatorDisplayName} さんへの応援は、右上のウォレットから接続すると始められます。`}
            </p>
          </div>
          {props.connected ? (
            <button
              type="button"
              className="btn-secondary shrink-0"
              onClick={props.onDisconnect}
              disabled={props.sending || props.resumeBusy}
            >
              接続解除
            </button>
          ) : null}
        </div>

        {!props.connected ? (
          <div className="mt-4 surface-subtle px-4 py-3 text-sm leading-6 text-[var(--text-subtle)]">
            {props.isWalletConnecting
              ? "ウォレット接続を待っています。右上のメニューで承認を完了してください。"
              : "右上のウォレットから接続すると、この場で送金内容を確認して応援できます。"}
          </div>
        ) : null}

        {props.connected ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="surface-subtle px-4 py-3">
              <div className="text-[11px] font-semibold tracking-[0.16em] text-[var(--text-subtle)]">
                接続中アドレス
              </div>
              <div className="mt-1 font-mono text-sm text-[var(--text)]">
                {shortAddress(props.activeAddress)}
              </div>
            </div>
            <div className="surface-subtle px-4 py-3">
              <div className="text-[11px] font-semibold tracking-[0.16em] text-[var(--text-subtle)]">
                ネットワーク
              </div>
              <div className="mt-1 text-sm text-[var(--text)]">{currentChainLabel}</div>
            </div>
            <div className="surface-subtle px-4 py-3">
              <div className="flex items-center justify-between gap-2 text-[11px] font-semibold tracking-[0.16em] text-[var(--text-subtle)]">
                <span>残高</span>
                <button
                  type="button"
                  className="text-[11px] text-[var(--accent)]"
                  onClick={props.onRefreshBalances}
                  disabled={props.walletBalancesLoading}
                >
                  更新
                </button>
              </div>
              <div className="mt-1 text-sm text-[var(--text)]">
                {props.walletBalancesLoading
                  ? "読み込み中です"
                  : props.walletBalances
                  ? `${formatReadableNumber(
                      Number(props.walletBalances.tokens.JPYC?.formatted ?? "0"),
                      { maximumFractionDigits: 2 }
                    )} JPYC`
                  : "うまく読み込めませんでした"}
              </div>
            </div>
          </div>
        ) : null}

        {props.inApp && !props.connected ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            アプリ内ブラウザではウォレットが開かないことがあります。
            <div className="mt-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={props.onOpenInMetaMaskDapp}
              >
                MetaMaskアプリで開く
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {props.connected && props.onWrongChain ? (
        <div className="alert-warn">
          選んだネットワークと接続中のネットワークが違います。
          <div className="mt-2 text-xs">
            選択中: {selectedChainLabel} / 接続中: {currentChainLabel}
          </div>
          <button
            type="button"
            className="btn-secondary mt-3"
            onClick={props.onSwitchChainToSelected}
          >
            選択中のネットワークへ切り替える
          </button>
        </div>
      ) : null}

      {props.showSendUI ? (
        <div className="surface-card p-4 sm:p-5">
          {props.selectedProjectTitle ? (
            <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
              <div className="text-sm font-semibold text-sky-900">
                このプロジェクトを応援します
              </div>
              <p className="mt-1 text-sm leading-6 text-sky-800">
                {props.selectedProjectTitle}
                {props.selectedProjectCurrency
                  ? ` / ${props.selectedProjectCurrency}`
                  : ""}
              </p>
            </div>
          ) : null}

          {props.selectedPostSummary ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-emerald-900">
                    この投稿を応援します
                  </div>
                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    {props.selectedPostSummary}
                  </p>
                </div>
                <button
                  type="button"
                  className="chip-button border-emerald-200 bg-white text-emerald-700"
                  onClick={props.onClearSelectedPost}
                >
                  解除
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[var(--text)]">
                ネットワーク
              </label>
              <select
                className="input mt-2"
                value={String(props.selectedChainId)}
                onChange={(event) =>
                  props.onChangeChain(Number(event.target.value) as SupportedChainId)
                }
              >
                {props.selectableChainIds.map((chainId) => {
                  const chain = getChainConfig(chainId);
                  return (
                    <option key={chainId} value={String(chainId)}>
                      {chain?.name ?? `Chain ${chainId}`}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text)]">
                通貨
              </label>
              <select
                className="input mt-2"
                value={props.currency}
                disabled={props.currencyLocked}
                onChange={(event) =>
                  props.onChangeCurrency(event.target.value as Currency)
                }
              >
                <option value="JPYC">JPYC</option>
                <option value="USDC">USDC</option>
              </select>
              {props.currencyLocked ? (
                <p className="mt-2 text-xs text-[var(--text-subtle)]">
                  この project に合わせて通貨を固定しています。
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-[var(--text)]">
              金額
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="text"
                className="input"
                value={props.amount}
                onChange={(event) => props.onChangeAmount(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    props.onSendEnter();
                  }
                }}
              />
              <span className="shrink-0 text-sm text-[var(--text-subtle)]">
                {props.currency}
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {props.incrementButtons.map((button) => (
              <button
                key={button.key}
                type="button"
                className="chip-button"
                onClick={button.onClick}
                disabled={button.disabled}
              >
                {button.label}
              </button>
            ))}
          </div>

          {props.walletBalances ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="surface-subtle px-4 py-3 text-sm text-[var(--text-subtle)]">
                ネイティブ
                <div className="mt-1 font-semibold text-[var(--text)]">
                  {formatReadableNumber(Number(props.walletBalances.nativeFormatted), {
                    maximumFractionDigits: 6,
                  })}{" "}
                  {props.walletBalances.nativeSymbol}
                </div>
              </div>
              <div className="surface-subtle px-4 py-3 text-sm text-[var(--text-subtle)]">
                JPYC
                <div className="mt-1 font-semibold text-[var(--text)]">
                  {formatReadableNumber(
                    Number(props.walletBalances.tokens.JPYC?.formatted ?? "0"),
                    { maximumFractionDigits: 2 }
                  )}
                </div>
              </div>
              <div className="surface-subtle px-4 py-3 text-sm text-[var(--text-subtle)]">
                USDC
                <div className="mt-1 font-semibold text-[var(--text)]">
                  {formatReadableNumber(
                    Number(props.walletBalances.tokens.USDC?.formatted ?? "0"),
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-sm leading-6 text-[var(--text-subtle)]">
              金額と通貨を確認してから、ウォレットで承認してください。
            </p>
            <button
              type="button"
              className="btn"
              onClick={props.onSend}
              disabled={props.sending || !props.amount}
              style={{ backgroundColor: props.headerColor || undefined }}
            >
              {props.sending ? "送信中です" : "送る"}
            </button>
          </div>
        </div>
      ) : null}

      {props.suppressConnectUI ? (
        <div className="text-sm text-[var(--text-subtle)]">
          送金結果を確認しています。画面を閉じずにお待ちください。
        </div>
      ) : null}
    </div>
  );
}
