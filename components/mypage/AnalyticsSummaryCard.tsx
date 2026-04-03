"use client";

import React from "react";
import type { Address } from "viem";

import {
  fetchPostingAnalyticsSummary,
  type PostingAnalyticsSummary,
} from "@/lib/mypage/postingApi";
import {
  WorkspaceEmptyState,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import {
  mapWorkspaceActionError,
  type WorkspaceActionNotice,
} from "@/lib/mypage/workspaceActionCopy";
import { AI_OFFICE_LABEL } from "@/lib/uxCopy";

type Props = {
  address: Address | undefined;
  refreshToken: number;
};

function formatDateTime(value: string | null): string {
  if (!value) return "未更新";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AnalyticsSummaryCard(props: Props) {
  const [loading, setLoading] = React.useState(true);
  const [feedback, setFeedback] = React.useState<WorkspaceActionNotice | null>(null);
  const [summary, setSummary] = React.useState<PostingAnalyticsSummary | null>(null);

  const loadSummary = React.useCallback(async (): Promise<void> => {
    if (!props.address) {
      setSummary(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFeedback(null);

    const result = await fetchPostingAnalyticsSummary({ address: props.address });
    if (!result.ok) {
      setFeedback(
        mapWorkspaceActionError(
          result.error,
          "分析サマリーの取得に失敗しました。"
        )
      );
      setLoading(false);
      return;
    }

    setSummary(result.summary);
    setLoading(false);
  }, [props.address]);

  React.useEffect(() => {
    void loadSummary();
  }, [loadSummary, props.refreshToken]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">分析サマリー</div>
          <div className="mt-1 text-xs leading-5 text-gray-600">
            投稿、反応、支援、AI 運用の基本指標をまとめて見ます。
          </div>
        </div>
        <button
          type="button"
          className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800"
          onClick={() => void loadSummary()}
          disabled={loading}
        >
          更新
        </button>
      </div>

      {feedback ? (
        <div className="mt-4">
          <WorkspaceStatusNotice
            tone={feedback.tone}
            title={feedback.title}
            description={feedback.description}
          />
        </div>
      ) : null}

      {loading ? (
        <div className="mt-4 text-sm text-gray-500">分析サマリーを読み込み中です...</div>
      ) : !summary || summary.postCount === 0 ? (
        <div className="mt-4">
          <WorkspaceEmptyState
            title="まだ集計できる投稿がありません"
            description="投稿を始めると、反応・支援・AI job の集計がここに並びます。"
          />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-[11px] uppercase tracking-[0.14em] text-gray-500">
                投稿
              </div>
              <div className="mt-2 text-xl font-semibold text-gray-900">
                {summary.postCount}
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                公開 {summary.publishedCount} / 下書き {summary.draftCount}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-[11px] uppercase tracking-[0.14em] text-gray-500">
                反応
              </div>
              <div className="mt-2 text-xl font-semibold text-gray-900">
                {summary.totalLikes + summary.totalReplies}
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                いいね {summary.totalLikes} / 返信 {summary.totalReplies}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-[11px] uppercase tracking-[0.14em] text-gray-500">
                投稿支援
              </div>
              <div className="mt-2 text-xl font-semibold text-gray-900">
                {summary.totalTips}
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                JPYC {summary.tipTotals.JPYC} / USDC {summary.tipTotals.USDC}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-[11px] uppercase tracking-[0.14em] text-gray-500">
                {AI_OFFICE_LABEL}
              </div>
              <div className="mt-2 text-xl font-semibold text-gray-900">
                {summary.agents.total}
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                active {summary.agents.active} / queued job {summary.jobs.queued}
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                Feed analytics
              </div>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <div className="flex items-center justify-between gap-3">
                  <span>計測対象投稿</span>
                  <span className="font-semibold">
                    {summary.analytics.trackedPostCount}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>impression</span>
                  <span className="font-semibold">
                    {summary.analytics.impressionCount}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>profile click</span>
                  <span className="font-semibold">
                    {summary.analytics.profileClickCount}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>engagement</span>
                  <span className="font-semibold">
                    {summary.analytics.engagementScore}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                更新タイミング
              </div>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <div className="flex items-center justify-between gap-3">
                  <span>最後の投稿</span>
                  <span className="font-semibold">
                    {formatDateTime(summary.lastPostAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>最後の公開投稿</span>
                  <span className="font-semibold">
                    {formatDateTime(summary.lastPublishedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>完了 job</span>
                  <span className="font-semibold">{summary.jobs.done}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>失敗 job</span>
                  <span className="font-semibold">{summary.jobs.failed}</span>
                </div>
              </div>
            </div>
          </div>

          {summary.analytics.trackedPostCount === 0 ? (
            <WorkspaceStatusNotice
              tone="info"
              title="詳細 analytics はこれから育つ状態です。"
              description="この段階では投稿件数、反応数、支援件数を中心に見ながら、後続フェーズで計測粒度を上げられるようにしています。"
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
