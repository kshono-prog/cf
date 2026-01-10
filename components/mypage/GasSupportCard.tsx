// /components/mypage/GasSupportCard.tsx
"use client";

import React from "react";
import type { GasEligibility } from "@/lib/mypage/types";
import { reasonToJa } from "@/lib/mypage/helpers";

export function GasSupportCard(props: {
  address: string | null;
  shouldShow: boolean;
  title: string;
  description: string;
  tokenSymbol: string;
  gas: GasEligibility | null;
  gasLoading: boolean;
  gasClaiming: boolean;
  gasTxHash: string | null;
  onClaim: () => void;
  onRefresh: () => void;
}) {
  const {
    address,
    shouldShow,
    title,
    description,
    tokenSymbol,
    gas,
    gasLoading,
    gasClaiming,
    gasTxHash,
    onClaim,
    onRefresh,
  } = props;

  if (!address) return null;
  if (!shouldShow) return null;

  const eligible = !!gas?.eligible;
  const reasons = gas?.reasons ?? [];
  const claimAmt = gas?.claimableAmount ?? "";
  const faucetAddress = gas?.faucetAddress;

  return (
    <div className="card p-4 space-y-2 bg-white">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        {gasLoading && (
          <span className="text-[11px] text-gray-500">判定中...</span>
        )}
      </div>

      <p className="text-xs text-gray-600">{description}</p>

      {gas && (
        <div className="text-[11px] text-gray-700 space-y-1">
          <div>JPYC残高：{gas.jpycBalance ?? "-"}</div>
          <div>
            {tokenSymbol}残高：{gas.nativeBalance ?? "-"}
          </div>
          <div>
            受取予定：{claimAmt} {tokenSymbol}
          </div>
        </div>
      )}

      {gasTxHash && (
        <div className="alert-ok">
          <p className="text-[11px]">
            送付トランザクションを送信しました：
            <span className="font-mono break-all"> {gasTxHash}</span>
          </p>
        </div>
      )}

      {gas && !eligible && reasons.length > 0 && (
        <div className="alert-warn">
          <p className="text-xs font-semibold mb-1">対象外</p>
          <ul className="list-disc list-inside text-[11px] text-gray-700 space-y-0.5">
            {reasons.map((r) => (
              <li key={r}>{reasonToJa(r)}</li>
            ))}
          </ul>
        </div>
      )}

      {!gas && !gasLoading && (
        <div className="alert-warn">
          <p className="text-[11px]">判定情報を取得できませんでした。</p>
        </div>
      )}

      <button
        type="button"
        className="btn w-full"
        onClick={onClaim}
        disabled={!eligible || gasClaiming || gasLoading}
      >
        {gasClaiming
          ? "受取処理中..."
          : `${claimAmt} ${tokenSymbol} を受け取る`}
      </button>

      {faucetAddress && (
        <div className="pt-2 border-t border-gray-200 space-y-1">
          <p className="text-xs text-gray-600">
            この機能を支援する（寄付 / Faucet原資）
          </p>
          <p className="text-xs font-mono break-all">{faucetAddress}</p>
          {gas?.faucetBalance && (
            <p className="text-[11px] text-gray-500">
              Faucet残高：{gas.faucetBalance} {tokenSymbol}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        className="btn-secondary w-full"
        onClick={onRefresh}
        disabled={gasLoading}
      >
        {gasLoading ? "判定を更新中..." : "判定を更新する"}
      </button>
    </div>
  );
}
