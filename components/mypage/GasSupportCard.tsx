// /components/mypage/GasSupportCard.tsx
"use client";

import React from "react";

import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import type { GasEligibility } from "@/lib/mypage/types";
import { reasonToJa } from "@/lib/mypage/helpers";

function resolveGasSupportNotice(params: {
  error: string | null;
  errorContext: "eligibility" | "claim" | null;
}): {
  tone: "error" | "attention";
  title: string;
  description?: string;
} | null {
  const { error, errorContext } = params;
  if (!error) {
    return null;
  }

  const normalized = error.trim().toUpperCase();
  const lower = error.trim().toLowerCase();

  switch (normalized) {
    case "FAUCET_DISABLED":
      return {
        tone: "attention",
        title: "現在はガス代支援を受け付けていません。",
        description: "時間をおいてから、もう一度判定を更新してください。",
      };
    case "ALREADY_CLAIMED":
      return {
        tone: "attention",
        title: "このアドレスはすでに受け取り済みです。",
        description: "必要なら判定を更新して、最新状態を確認してください。",
      };
    case "RATE_LIMITED":
      return {
        tone: "attention",
        title: "短時間に実行が集中しています。",
        description: "少し時間をおいてから、もう一度お試しください。",
      };
    case "FAUCET_INSUFFICIENT":
      return {
        tone: "attention",
        title: "現在は支援原資が不足しています。",
        description: "時間をおいてから、もう一度判定を更新してください。",
      };
    case "NONCE_ERROR":
    case "NONCE_RESPONSE_INVALID":
      return {
        tone: "error",
        title: "署名の準備に失敗しました。",
        description: "少し待ってから、もう一度お試しください。",
      };
    case "FAUCET_WALLET_NOT_CONFIGURED":
    case "FAUCET_PRIVATE_KEY_NOT_CONFIGURED":
    case "FAUCET_SIGNER_MISMATCH":
    case "FAUCET_ADDRESS_INVALID":
      return {
        tone: "error",
        title: "ガス代支援の設定を確認できませんでした。",
        description: "運営設定の反映を待ってから、もう一度お試しください。",
      };
    case "CLAIM_ERROR":
      return {
        tone: "error",
        title: "ガス代支援の実行に失敗しました。",
        description: "ウォレットとネットワークの状態を確認して、もう一度お試しください。",
      };
    case "GAS_ELIGIBILITY_FETCH_FAILED":
      return {
        tone: "error",
        title: "判定情報を取得できませんでした。",
        description: "少し待ってから、もう一度判定を更新してください。",
      };
    default:
      break;
  }

  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("user cancelled") ||
    lower.includes("user canceled")
  ) {
    return {
      tone: "attention",
      title: "ウォレット署名がキャンセルされました。",
      description: "受け取るときだけ署名が必要です。内容を確認して、もう一度お試しください。",
    };
  }

  if (errorContext === "eligibility") {
    return {
      tone: "error",
      title: "判定情報を取得できませんでした。",
      description: "少し待ってから、もう一度判定を更新してください。",
    };
  }

  return {
    tone: "error",
    title: "ガス代支援の実行に失敗しました。",
    description: "ウォレットとネットワークの状態を確認して、もう一度お試しください。",
  };
}

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
  error: string | null;
  errorContext: "eligibility" | "claim" | null;
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
    error,
    errorContext,
    onClaim,
    onRefresh,
  } = props;

  if (!address) return null;
  if (!shouldShow) return null;

  const eligible = !!gas?.eligible;
  const reasons = gas?.reasons ?? [];
  const claimAmt = gas?.claimableAmount ?? "";
  const faucetAddress = gas?.faucetAddress;
  const claimLabel =
    claimAmt.trim().length > 0
      ? `${claimAmt} ${tokenSymbol} を受け取る`
      : `${tokenSymbol} を受け取る`;
  const notice = resolveGasSupportNotice({ error, errorContext });

  return (
    <div className="card p-4 space-y-2 bg-white">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        {gasLoading && (
          <span className="text-[11px] text-gray-500">判定中...</span>
        )}
      </div>

      <p className="text-xs text-gray-600">{description}</p>

      {eligible && !gasClaiming && !gasTxHash ? (
        <WorkspaceStatusNotice
          tone="info"
          title="受け取る準備ができています。"
          description="受け取るボタンを押したときだけ、ウォレット署名が必要です。内容を確認してから進めてください。"
        />
      ) : null}

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
        <WorkspaceStatusNotice
          tone="success"
          title="送付トランザクションを送信しました。"
          description="反映まで少し時間がかかることがあります。必要なら判定を更新して状態を確認してください。"
        >
          <div className="w-full text-xs text-emerald-900">
            <span className="font-mono break-all">{gasTxHash}</span>
          </div>
        </WorkspaceStatusNotice>
      )}

      {gas && !eligible && reasons.length > 0 && (
        <WorkspaceStatusNotice
          tone="attention"
          title="今は受け取れません。"
          description="対象外の理由を確認して、条件がそろった後で再判定してください。"
        >
          <ul className="w-full list-disc list-inside text-[11px] text-amber-900 space-y-0.5">
            {reasons.map((r) => (
              <li key={r}>{reasonToJa(r)}</li>
            ))}
          </ul>
        </WorkspaceStatusNotice>
      )}

      {notice ? (
        <WorkspaceStatusNotice
          tone={notice.tone}
          title={notice.title}
          description={notice.description}
        />
      ) : null}

      <button
        type="button"
        className="btn w-full"
        onClick={onClaim}
        disabled={!eligible || gasClaiming || gasLoading}
      >
        {gasClaiming
          ? "受取処理中..."
          : claimLabel}
      </button>

      {eligible && !gasClaiming && !gasTxHash ? (
        <p className="text-[11px] text-gray-500">
          署名が表示されるのは受け取る操作を実行したときだけです。
        </p>
      ) : null}

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
