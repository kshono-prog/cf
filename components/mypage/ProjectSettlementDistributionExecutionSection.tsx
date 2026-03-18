"use client";

import React from "react";

type DistributionEntry = {
  status: "DRAFT" | "QUEUED" | "SENT" | "FAILED" | "CANCELLED";
};

export type ProjectSettlementDistributionExecutionSectionProps = {
  canDistribute: boolean;
  hasCheckedPreflight: boolean;
  isDistributing: boolean;
  entries: DistributionEntry[];
  executeDistribution: (mode: "ALL" | "FAILED_ONLY") => Promise<void>;
};

export function ProjectSettlementDistributionExecutionSection(
  props: ProjectSettlementDistributionExecutionSectionProps
) {
  const { entries } = props;

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
        <div className="text-sm font-medium">配分の実行</div>
        <div className="text-[11px] leading-5 text-gray-500 sm:text-xs">
          送金は接続ウォレットの署名で1件ずつ実行されます
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          className="w-full rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-40"
          onClick={() => void props.executeDistribution("ALL")}
          disabled={!props.canDistribute}
        >
          {props.isDistributing ? "送信中..." : "Avalanche で配分する"}
        </button>
        <button
          type="button"
          className="w-full rounded border px-4 py-2 text-sm disabled:opacity-40"
          onClick={() => void props.executeDistribution("FAILED_ONLY")}
          disabled={
            !props.canDistribute || !entries.some((entry) => entry.status === "FAILED")
          }
        >
          失敗分のみ再送
        </button>
      </div>
      <div className="text-[11px] leading-5 text-gray-500 sm:text-xs">
        {props.hasCheckedPreflight
          ? "送信前確認完了後に、接続ウォレットの署名で1件ずつ送金します。"
          : "先に手順3の送信前確認を実行してから配分を開始します。"}
      </div>
    </div>
  );
}
