"use client";

import React from "react";

import { WorkspaceEmptyState } from "@/components/mypage/WorkspaceFeedback";
import type { ProjectSettlementData } from "@/lib/projectSettlementView";
import {
  getDistributionEntryStatusLabel,
  getDistributionRuntimeStatusLabel,
} from "@/lib/uxCopy";

type DistributionEntry = ProjectSettlementData["distributionEntries"][number];

export type ProjectSettlementManualResultSectionProps = {
  loading: boolean;
  isDistributing: boolean;
  activeEntryId: string | null;
  runtimeRowStatus: Record<string, "QUEUED" | "SENT" | "FAILED">;
  entries: DistributionEntry[];
  markEntryResult: (
    entry: DistributionEntry,
    status: "SENT" | "FAILED"
  ) => Promise<void>;
};

export function ProjectSettlementManualResultSection(
  props: ProjectSettlementManualResultSectionProps
) {
  const { entries } = props;

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="text-sm font-medium">送信結果の記録（行単位）</div>
      {entries.length === 0 ? (
        <WorkspaceEmptyState
          compact
          title="まだ配分行がありません"
          description="下書きを保存すると、各送金先の結果をここで記録できます。"
        />
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="space-y-3 rounded border p-3 text-[11px] leading-5 sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:space-y-0 sm:p-2 sm:text-xs"
            >
              <span className="block break-all font-mono">
                {entry.recipientAddressChecksum}
              </span>
              <span>{entry.amountAtomic}</span>
              <span className="inline-flex rounded bg-gray-100 px-2 py-0.5">
                {getDistributionEntryStatusLabel(entry.status)}
              </span>
              {props.runtimeRowStatus[entry.id] ? (
                <span className="inline-flex rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-blue-700">
                  実行中の状態:
                  {getDistributionRuntimeStatusLabel(props.runtimeRowStatus[entry.id])}
                </span>
              ) : null}
              {props.activeEntryId === entry.id && props.isDistributing ? (
                <span className="inline-flex rounded border border-amber-100 bg-amber-50 px-2 py-0.5 text-amber-700">
                  送信中...
                </span>
              ) : null}
              <div className="grid gap-2 sm:ml-auto sm:grid-cols-2">
                <button
                  type="button"
                  className="w-full rounded border px-3 py-2 text-sm sm:px-2 sm:py-1 sm:text-xs"
                  onClick={() => void props.markEntryResult(entry, "SENT")}
                  disabled={
                    props.loading || props.isDistributing || entry.status === "SENT"
                  }
                >
                  送信済みにする
                </button>
                <button
                  type="button"
                  className="w-full rounded border px-3 py-2 text-sm sm:px-2 sm:py-1 sm:text-xs"
                  onClick={() => void props.markEntryResult(entry, "FAILED")}
                  disabled={props.loading || props.isDistributing}
                >
                  失敗にする
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
