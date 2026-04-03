"use client";

import React from "react";

import {
  WorkspaceEmptyState,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import type { ProjectSettlementData } from "@/lib/projectSettlementView";
import {
  getDistributionEntryStatusLabel,
  getDistributionExecutionResultLabel,
} from "@/lib/uxCopy";

type ExecutionLog = ProjectSettlementData["recentExecutions"][number];

function getExecutionReviewNotice(
  result: ExecutionLog["result"]
): {
  tone: "success" | "error" | "info" | "attention";
  title: string;
  description: string;
} {
  switch (result) {
    case "SUCCESS":
      return {
        tone: "success",
        title: "この実行は送信結果まで記録できています。",
        description:
          "終了時刻と txHash を確認できれば、通常はこのまま review を終えて問題ありません。",
      };
    case "PARTIAL_SUCCESS":
      return {
        tone: "attention",
        title: "一部の行が未完了です。",
        description:
          "失敗理由を確認し、必要な行だけ再送するか、外部確認済みの結果だけを手動で補完します。",
      };
    case "FAILED":
      return {
        tone: "error",
        title: "この実行では送信完了まで進めませんでした。",
        description:
          "失敗理由を確認してから再実行してください。手動記録は外部で結果確認できた行だけに限定します。",
      };
  }
}

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
      <WorkspaceStatusNotice
        tone="info"
        title="通常の確認はまずここで行います。"
        description="各実行の結果、終了時刻、txHash、失敗理由を先に確認し、手動記録は必要な場合だけに絞ります。"
      />
      {recentExecutions.length === 0 ? (
        <WorkspaceEmptyState
          compact
          title="まだ実行ログがありません"
          description="配分を実行したあとに、ここで履歴と結果を確認できます。"
        />
      ) : (
        <div className="space-y-2">
          {recentExecutions.map((execution) => {
            const reviewNotice = getExecutionReviewNotice(execution.result);
            return (
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
                  <WorkspaceStatusNotice
                    tone={reviewNotice.tone}
                    title={reviewNotice.title}
                    description={reviewNotice.description}
                  />
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
                        <div className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-rose-800">
                          失敗理由: {item.errorReason}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
