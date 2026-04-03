"use client";

import React from "react";

import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";

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
  const hasFailedEntries = entries.some((entry) => entry.status === "FAILED");

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
        <div className="text-sm font-medium">配分の実行</div>
        <div className="text-[11px] leading-5 text-gray-500 sm:text-xs">
          送金は接続ウォレットの署名で1件ずつ実行されます
        </div>
      </div>
      {!props.hasCheckedPreflight ? (
        <WorkspaceStatusNotice
          tone="attention"
          title="先に手順3の送信前確認を実行してください。"
          description="この手順ではまだ送金できません。残高と設定不足を確認できてから、実際の配分へ進みます。"
        />
      ) : props.canDistribute ? (
        <WorkspaceStatusNotice
          tone="attention"
          title="ここから先はウォレットで実際の送金を行います。"
          description="各行の宛先と金額を最終確認し、署名ごとに送信内容を確認しながら進めてください。"
        />
      ) : hasFailedEntries ? (
        <WorkspaceStatusNotice
          tone="info"
          title="失敗した行だけを再送できます。"
          description="Review step で失敗理由を確認したあと、必要な行だけ再送してください。"
        />
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          className="btn w-full disabled:opacity-40"
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
