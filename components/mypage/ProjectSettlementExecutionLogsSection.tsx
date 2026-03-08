"use client";

import React from "react";

import type { ProjectSettlementData } from "@/lib/projectSettlementView";

type ExecutionLog = ProjectSettlementData["recentExecutions"][number];

export type ProjectSettlementExecutionLogsSectionProps = {
  recentExecutions: ExecutionLog[];
};

export function ProjectSettlementExecutionLogsSection(
  props: ProjectSettlementExecutionLogsSectionProps
) {
  const { recentExecutions } = props;

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="text-sm font-medium">Execution logs</div>
      {recentExecutions.length === 0 ? (
        <div className="text-xs text-gray-500">まだ実行ログがありません。</div>
      ) : (
        <div className="space-y-2">
          {recentExecutions.map((execution) => (
            <details key={execution.id} className="rounded border p-2">
              <summary className="cursor-pointer text-xs flex flex-wrap items-center gap-2">
                <span className="font-mono">{execution.id.slice(0, 10)}...</span>
                <span className="px-2 py-0.5 rounded bg-gray-100">
                  {execution.result}
                </span>
                <span>started: {execution.startedAt}</span>
              </summary>
              <div className="mt-2 space-y-1 text-xs">
                <div>initiatedBy: {execution.initiatedByWallet ?? "N/A"}</div>
                <div>finishedAt: {execution.finishedAt ?? "N/A"}</div>
                {execution.note ? <div>note: {execution.note}</div> : null}
                {execution.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded border p-1 flex flex-wrap items-center gap-2"
                  >
                    <span className="font-mono">
                      {item.distributionEntryId.slice(0, 8)}...
                    </span>
                    <span className="px-2 py-0.5 rounded bg-gray-100">
                      {item.status}
                    </span>
                    {item.txHash ? (
                      <a
                        className="text-blue-600 underline font-mono"
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
