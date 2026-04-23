"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import {
  getChainConfig,
  getDefaultChainId,
  isSupportedChainId,
  type SupportedChainId,
} from "@/lib/chainConfig";
import {
  type ExternalWalletTipAssetKey,
  type ExternalWalletTipQrPayload,
  buildExternalWalletTipDeepLinkHref,
  buildExternalWalletTipQrPayload,
  listExternalWalletTipAssets,
  normalizeExternalWalletTipAmountInput,
} from "@/lib/externalWalletTipQr";

type Props = {
  username: string;
  displayName: string;
  creatorAddress: string;
};

type GeneratedTipQrState = {
  chainId: SupportedChainId;
  asset: ExternalWalletTipAssetKey;
  amount: string;
  payload: ExternalWalletTipQrPayload;
};

const EXTERNAL_TIP_CHAIN_IDS: SupportedChainId[] = [137, 1, 43114].filter(
  (value) => isSupportedChainId(value)
) as SupportedChainId[];

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function buildGeneratedSummary(payload: ExternalWalletTipQrPayload): string {
  if (payload.mode === "address") {
    return `アドレスのみ / ${shortAddress(payload.address)}`;
  }
  if (payload.amount) {
    return `${payload.amount} ${payload.symbol} / ${payload.displayName}`;
  }
  return `${payload.symbol} / 金額はウォレットで入力`;
}

export function PublicExternalWalletTipQrCard({
  username,
  displayName,
  creatorAddress,
}: Props) {
  const initialChainId = EXTERNAL_TIP_CHAIN_IDS.includes(getDefaultChainId())
    ? getDefaultChainId()
    : EXTERNAL_TIP_CHAIN_IDS[0];
  const [chainId, setChainId] = useState<SupportedChainId>(initialChainId);
  const [asset, setAsset] = useState<ExternalWalletTipAssetKey>("NATIVE");
  const [amountInput, setAmountInput] = useState<string>("");
  const [generatedQr, setGeneratedQr] = useState<GeneratedTipQrState | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const selectedChain = getChainConfig(chainId);
  const selectedChainLabel = selectedChain?.shortName ?? `Chain ${chainId}`;
  const availableAssets = useMemo(
    () => listExternalWalletTipAssets(chainId),
    [chainId]
  );
  const selectedAsset =
    availableAssets.find((candidate) => candidate.key === asset) ??
    availableAssets[0];
  const selectedAssetKey = selectedAsset.key;
  const generatedChain = generatedQr
    ? getChainConfig(generatedQr.chainId)
    : null;
  const needsRegeneration =
    generatedQr !== null &&
    (generatedQr.chainId !== chainId ||
      generatedQr.asset !== selectedAssetKey ||
      generatedQr.amount !== amountInput);

  useEffect(() => {
    if (selectedAsset.key === asset) {
      return;
    }
    setAsset(selectedAsset.key);
  }, [asset, selectedAsset]);

  const qrImageSrc = useMemo(() => {
    if (!generatedQr) {
      return null;
    }

    const params = new URLSearchParams({
      chainId: String(generatedQr.chainId),
      asset: generatedQr.asset,
    });
    if (generatedQr.amount.trim().length > 0) {
      params.set("amount", generatedQr.amount.trim());
    }
    return `/api/creators/${encodeURIComponent(username)}/wallet-tip-qrcode?${params.toString()}`;
  }, [generatedQr, username]);
  const generatedDeepLinkHref = useMemo(
    () =>
      generatedQr ? buildExternalWalletTipDeepLinkHref(generatedQr.payload) : null,
    [generatedQr]
  );

  const handleCopy = async (value: string, successMessage: string) => {
    if (typeof navigator === "undefined") {
      setCopyFeedback("この環境ではコピーできません。");
      return;
    }

    if (typeof navigator.clipboard?.writeText !== "function") {
      setCopyFeedback("この環境ではコピーできません。");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(successMessage);
    } catch {
      setCopyFeedback("コピーに失敗しました。");
    }
  };

  const handleGenerate = () => {
    try {
      const payload = buildExternalWalletTipQrPayload({
        address: creatorAddress,
        chainId,
        asset: selectedAssetKey,
        amountInput,
      });
      setGeneratedQr({
        chainId,
        asset: selectedAssetKey,
        amount: payload.amount ?? "",
        payload,
      });
      setErrorMessage(null);
      setCopyFeedback(null);
    } catch (error: unknown) {
      setGeneratedQr(null);
      setErrorMessage(
        error instanceof Error && error.message === "TIP_AMOUNT_INVALID"
          ? "金額は 0 より大きい値を入れてください。"
          : error instanceof Error && error.message === "TIP_ASSET_UNAVAILABLE"
          ? "このチェーンでは選択したトークンを使えません。"
          : "QRコードを生成できませんでした。"
      );
    }
  };

  return (
    <section
      className="panel-card px-4 py-4 sm:px-5 sm:py-5"
      data-testid="wallet-section"
    >
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
            External Wallet Tip
          </div>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">
            外部ウォレットから送金する
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
            チェーンとトークンを選んで QRコードを生成できます。金額を空欄にすると、
            ネイティブはアドレスのみ、JPYC / USDC はウォレット側で金額入力する transfer QR
            を生成します。
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),220px]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-[var(--text)]">
                  ネットワーク
                </span>
                <select
                  className="input mt-2"
                  value={String(chainId)}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (isSupportedChainId(next)) {
                      setErrorMessage(null);
                      setChainId(next);
                    }
                  }}
                >
                  {EXTERNAL_TIP_CHAIN_IDS.map((candidate) => {
                    const chain = getChainConfig(candidate);
                    return (
                      <option key={candidate} value={candidate}>
                        {chain?.shortName ?? `Chain ${candidate}`} /{" "}
                        {chain?.nativeSymbol ?? ""}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[var(--text)]">
                  送金トークン
                </span>
                <select
                  className="input mt-2"
                  value={selectedAssetKey}
                  onChange={(event) => {
                    setErrorMessage(null);
                    setAsset(event.target.value as ExternalWalletTipAssetKey);
                  }}
                >
                  {availableAssets.map((candidate) => (
                    <option key={candidate.key} value={candidate.key}>
                      {candidate.symbol}
                      {candidate.kind === "native"
                        ? ` / ${selectedChainLabel}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-[var(--text)]">
                金額 ({selectedAsset.symbol})
              </span>
              <input
                className="input mt-2"
                data-testid="send-amount-input"
                inputMode="decimal"
                placeholder={`例: ${
                  selectedAsset.key === "JPYC"
                    ? "1000"
                    : selectedAsset.key === "USDC"
                    ? "5"
                    : "0.1"
                } ${selectedAsset.symbol}`}
                value={amountInput}
                onChange={(event) => {
                  setErrorMessage(null);
                  setAmountInput(
                    normalizeExternalWalletTipAmountInput(event.target.value)
                  );
                }}
              />
            </label>

            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-medium text-[var(--text-subtle)]">
                  送金先アドレス
                </div>
                <button
                  type="button"
                  className="btn-secondary px-3 py-1.5 text-xs"
                  onClick={() =>
                    void handleCopy(creatorAddress, "送金先アドレスをコピーしました。")
                  }
                >
                  アドレスをコピー
                </button>
              </div>
              <div className="mt-2 break-all font-mono text-sm text-[var(--text)]">
                {creatorAddress}
              </div>
              {selectedAsset.tokenAddress ? (
                <div className="mt-3">
                  <div className="text-xs font-medium text-[var(--text-subtle)]">
                    トークンコントラクト
                  </div>
                  <div className="mt-1 break-all font-mono text-xs text-[var(--text-subtle)]">
                    {selectedAsset.tokenAddress}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn"
                data-testid="send-button"
                onClick={handleGenerate}
              >
                QRコードを生成
              </button>
              {generatedDeepLinkHref ? (
                <>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      void handleCopy(
                        generatedDeepLinkHref,
                        "送金リンクをコピーしました。"
                      )
                    }
                  >
                    リンクをコピー
                  </button>
                  <a href={generatedDeepLinkHref} className="btn-secondary">
                    ウォレットを開く
                  </a>
                </>
              ) : null}
              <div className="text-sm text-[var(--text-subtle)]">
                {generatedQr === null
                  ? "まだ QR は生成していません"
                  : generatedQr.payload.amount
                  ? `${generatedQr.payload.amount} ${generatedQr.payload.symbol} を送る QR`
                  : generatedQr.payload.mode === "address"
                  ? "アドレスのみの QR"
                  : `${generatedQr.payload.symbol} の transfer QR`}
              </div>
            </div>

            {needsRegeneration ? (
              <div className="text-sm text-[var(--text-subtle)]">
                入力を変更したので、もう一度 QRコードを生成してください。
              </div>
            ) : null}

            {copyFeedback ? (
              <div className="text-sm text-[var(--text-subtle)]">{copyFeedback}</div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              外部ウォレット送金は Creator Founding の通常の支援フローとは別です。
              この送金は、サイト内の支援履歴や project progress には自動反映されません。
              ウォレットによっては ERC-20 transfer QR の解釈に差が出る場合があります。
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
            {generatedQr && qrImageSrc ? (
              <>
                <div className="mx-auto w-fit rounded-2xl border border-[var(--line)] bg-white p-2 shadow-sm">
                  <Image
                    unoptimized
                    src={qrImageSrc}
                    alt={`${displayName} の外部ウォレット送金QR`}
                    width={180}
                    height={180}
                    className="h-[180px] w-[180px] rounded-xl"
                  />
                </div>
                <div className="mt-3 text-center text-xs text-[var(--text-subtle)]">
                  {buildGeneratedSummary(generatedQr.payload)}
                  <br />
                  {generatedChain?.shortName ?? `Chain ${generatedQr.chainId}`}
                </div>
              </>
            ) : (
              <div className="flex h-[212px] items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-white/70 px-5 text-center text-sm leading-6 text-[var(--text-subtle)]">
                チェーンとトークンを選んで
                <br />
                QRコードを生成してください
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
