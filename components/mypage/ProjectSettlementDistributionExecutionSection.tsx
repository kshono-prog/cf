"use client";

import React from "react";

import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";

type DistributionEntry = {
  status: "DRAFT" | "QUEUED" | "SENT" | "FAILED" | "CANCELLED";
};

type TokenPreflight = {
  token: CurrencyCode;
  requiredAtomic: bigint;
  walletBalanceAtomic: bigint | null;
  sufficient: boolean;
};

export type ProjectSettlementDistributionExecutionSectionProps = {
  loading: boolean;
  walletAddress: string | null;
  isConnected: boolean;
  canDistribute: boolean;
  hasPreflightFailure: boolean;
  isDistributing: boolean;
  entries: DistributionEntry[];
  preflight: TokenPreflight[];
  checkBalances: (mode?: "ALL" | "FAILED_ONLY") => Promise<unknown>;
  executeDistribution: (mode: "ALL" | "FAILED_ONLY") => Promise<void>;
};

export function ProjectSettlementDistributionExecutionSection(
  props: ProjectSettlementDistributionExecutionSectionProps
) {
  const { entries, preflight, hasPreflightFailure } = props;

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="text-sm font-medium">Distribution execution</div>
        <div className="text-xs text-gray-500">
          送金は接続ウォレットの署名で1件ずつ実行されます
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded border px-4 py-2 text-sm disabled:opacity-40"
          onClick={() => void props.checkBalances("ALL")}
          disabled={props.loading || !props.walletAddress || !props.isConnected}
        >
          送信前に残高チェック
        </button>
        <button
          type="button"
          className="rounded bg-black text-white px-4 py-2 text-sm disabled:opacity-40"
          onClick={() => void props.executeDistribution("ALL")}
          disabled={!props.canDistribute || hasPreflightFailure}
        >
          {props.isDistributing ? "Distributing..." : "Distribute on Avalanche"}
        </button>
        <button
          type="button"
          className="rounded border px-4 py-2 text-sm disabled:opacity-40"
          onClick={() => void props.executeDistribution("FAILED_ONLY")}
          disabled={
            !props.canDistribute ||
            !entries.some((entry) => entry.status === "FAILED") ||
            hasPreflightFailure
          }
        >
          失敗分のみ再送
        </button>
      </div>
      {preflight.length > 0 ? (
        <div className="rounded border bg-gray-50 p-2 text-xs space-y-1">
          {preflight.map((item) => (
            <div key={item.token} className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{item.token}</span>
              <span>required: {item.requiredAtomic.toString()}</span>
              <span>
                balance:{" "}
                {item.walletBalanceAtomic === null
                  ? "N/A"
                  : item.walletBalanceAtomic.toString()}
              </span>
              <span
                className={`px-2 py-0.5 rounded border ${
                  item.sufficient
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-rose-50 text-rose-700 border-rose-100"
                }`}
              >
                {item.sufficient ? "OK" : "不足"}
              </span>
            </div>
          ))}
          {hasPreflightFailure ? (
            <div className="text-rose-700">
              残高不足またはトークン設定不足があります。
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
