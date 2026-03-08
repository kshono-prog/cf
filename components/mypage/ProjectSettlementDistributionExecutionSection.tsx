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
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="text-sm font-medium">配分の実行</div>
        <div className="text-xs text-gray-500">
          送金は接続ウォレットの署名で1件ずつ実行されます
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded bg-black text-white px-4 py-2 text-sm disabled:opacity-40"
          onClick={() => void props.executeDistribution("ALL")}
          disabled={!props.canDistribute}
        >
          {props.isDistributing ? "送信中..." : "Avalanche で配分する"}
        </button>
        <button
          type="button"
          className="rounded border px-4 py-2 text-sm disabled:opacity-40"
          onClick={() => void props.executeDistribution("FAILED_ONLY")}
          disabled={
            !props.canDistribute || !entries.some((entry) => entry.status === "FAILED")
          }
        >
          失敗分のみ再送
        </button>
      </div>
      <div className="text-xs text-gray-500">
        {props.hasCheckedPreflight
          ? "送信前チェック完了後に、接続ウォレットの署名で1件ずつ送金します。"
          : "先に Step 3 の送信前チェックを行ってから配分を開始します。"}
      </div>
    </div>
  );
}
