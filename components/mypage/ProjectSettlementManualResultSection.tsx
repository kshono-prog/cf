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
    <div className="rounded-lg border p-3 space-y-2">
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
              className="flex flex-wrap items-center gap-2 border rounded p-2 text-xs"
            >
              <span className="font-mono">{entry.recipientAddressChecksum}</span>
              <span>{entry.amountAtomic}</span>
              <span className="px-2 py-0.5 rounded bg-gray-100">
                {getDistributionEntryStatusLabel(entry.status)}
              </span>
              {props.runtimeRowStatus[entry.id] ? (
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                  実行中の状態:
                  {getDistributionRuntimeStatusLabel(props.runtimeRowStatus[entry.id])}
                </span>
              ) : null}
              {props.activeEntryId === entry.id && props.isDistributing ? (
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
                  送信中...
                </span>
              ) : null}
              <button
                type="button"
                className="rounded border px-2 py-1"
                onClick={() => void props.markEntryResult(entry, "SENT")}
                disabled={
                  props.loading || props.isDistributing || entry.status === "SENT"
                }
              >
                送信済みにする
              </button>
              <button
                type="button"
                className="rounded border px-2 py-1"
                onClick={() => void props.markEntryResult(entry, "FAILED")}
                disabled={props.loading || props.isDistributing}
              >
                失敗にする
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
