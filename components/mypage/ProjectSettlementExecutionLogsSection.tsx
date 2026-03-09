"use client";

import React from "react";

import { WorkspaceEmptyState } from "@/components/mypage/WorkspaceFeedback";
import type { ProjectSettlementData } from "@/lib/projectSettlementView";
import {
  getDistributionEntryStatusLabel,
  getDistributionExecutionResultLabel,
} from "@/lib/uxCopy";

type ExecutionLog = ProjectSettlementData["recentExecutions"][number];

export type ProjectSettlementExecutionLogsSectionProps = {
  recentExecutions: ExecutionLog[];
};

export function ProjectSettlementExecutionLogsSection(
  props: ProjectSettlementExecutionLogsSectionProps
) {
  const { recentExecutions } = props;

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="text-sm font-medium">実行ログ</div>
      {recentExecutions.length === 0 ? (
        <WorkspaceEmptyState
          compact
          title="まだ実行ログがありません"
          description="配分を実行したあとに、ここで履歴と結果を確認できます。"
        />
      ) : (
        <div className="space-y-2">
          {recentExecutions.map((execution) => (
            <details key={execution.id} className="rounded border p-3">
              <summary className="cursor-pointer space-y-2 text-[11px] sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:space-y-0 sm:text-xs">
                <span className="block font-mono">
                  {execution.id.slice(0, 10)}...
                </span>
                <span className="inline-flex rounded bg-gray-100 px-2 py-0.5">
                  {getDistributionExecutionResultLabel(execution.result)}
                </span>
                <span className="block text-gray-600">
                  開始: {execution.startedAt}
                </span>
              </summary>
              <div className="mt-3 space-y-2 text-[11px] leading-5 sm:text-xs">
                <div>実行ウォレット: {execution.initiatedByWallet ?? "N/A"}</div>
                <div>終了: {execution.finishedAt ?? "N/A"}</div>
                {execution.note ? <div>メモ: {execution.note}</div> : null}
                {execution.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-1 rounded border p-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 sm:p-1"
                  >
                    <span className="font-mono">
                      {item.distributionEntryId.slice(0, 8)}...
                    </span>
                    <span className="w-fit rounded bg-gray-100 px-2 py-0.5">
                      {getDistributionEntryStatusLabel(item.status)}
                    </span>
                    {item.txHash ? (
                      <a
                        className="break-all font-mono text-blue-600 underline"
                        href={`https://snowtrace.io/tx/${item.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {item.txHash.slice(0, 10)}...
                      </a>
                    ) : null}
                    {item.errorReason ? (
                      <span className="text-rose-700">{item.errorReason}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
