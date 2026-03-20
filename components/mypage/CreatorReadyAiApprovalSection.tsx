"use client";

import { WorkspaceEmptyState } from "@/components/mypage/WorkspaceFeedback";
import type { HomeTaskPreview } from "@/components/mypage/creatorReadyWorkspaceOverviewHelpers";
import { getAgentTaskTypeCopy } from "@/lib/uxCopy";

type Props = {
  waitingApprovalCount: number;
  loadingAiSummary: boolean;
  aiSummaryError: string | null;
  waitingTasks: HomeTaskPreview[];
  onOpenSupporterResponse: () => void;
};

export function CreatorReadyAiApprovalSection(props: Props) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-950">
        AIの提案・承認待ち
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        AIが作成した告知・お礼などの提案を確認・承認できます。
      </p>
      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold tracking-wide text-gray-500">
              承認待ち
            </div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">
              {props.waitingApprovalCount}
            </div>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:border-slate-900 hover:text-slate-950"
            onClick={props.onOpenSupporterResponse}
          >
            提案を確認する
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-gray-600">
          {props.waitingApprovalCount > 0
            ? "承認を待っている提案があります。確認して承認または却下してください。"
            : "現在、承認待ちの提案はありません。必要なら新しい下書きを作れます。"}
        </p>
        <div className="mt-3 space-y-2">
          {props.loadingAiSummary ? (
            <div className="rounded-xl bg-gray-50 px-3 py-2 text-[11px] text-gray-600">
              AIの提案状況を読み込んでいます。
            </div>
          ) : props.aiSummaryError ? (
            <WorkspaceEmptyState
              compact
              title="AIの提案状況を取得できませんでした"
              description={props.aiSummaryError}
            />
          ) : props.waitingTasks.length === 0 ? (
            <WorkspaceEmptyState
              compact
              title="いまは承認待ちの提案はありません"
              description="告知やお礼の下書きを作ると、ここからすぐ確認できます。"
            />
          ) : (
            props.waitingTasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                className="rounded-xl bg-gray-50 px-3 py-2 text-[11px] text-gray-700"
              >
                {getAgentTaskTypeCopy(task.taskType).label}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
