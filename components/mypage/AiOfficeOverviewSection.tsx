"use client";

import React, { useMemo } from "react";

import { AiOfficeEmptyState } from "@/components/mypage/AiOfficeFeedback";
import type {
  AgentTaskView,
  MetricSnapshotView,
  MetricTrendDayView,
  SocialConnectionView,
} from "@/components/mypage/aiOfficeTypes";
import {
  getAgentTaskStatusCopy,
  getAgentTaskTypeCopy,
  getSocialConnectionStatusLabel,
} from "@/lib/uxCopy";

type Props = {
  loading: boolean;
  waitingApprovalCount: number;
  tasks: AgentTaskView[];
  connections: SocialConnectionView[];
  metricsTotals: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  metricsSnapshots: MetricSnapshotView[];
  metricTrends: MetricTrendDayView[];
  onOpenCreate: () => void;
  onOpenInbox: () => void;
  onCollectMetrics: () => void;
};

export function AiOfficeOverviewSection(props: Props) {
  const interactionTotal =
    props.metricsTotals.likes +
    props.metricsTotals.comments +
    props.metricsTotals.shares;
  const latestTrend = props.metricTrends[props.metricTrends.length - 1] ?? null;
  const recentTasks = useMemo(() => props.tasks.slice(0, 3), [props.tasks]);
  const pendingTasks = useMemo(
    () =>
      props.tasks
        .filter((task) => task.status === "WAITING_APPROVAL")
        .slice(0, 3),
    [props.tasks]
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="text-xs text-gray-500">承認待ち</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">
            {props.waitingApprovalCount}
          </div>
          <p className="mt-2 text-xs leading-5 text-gray-600">
            公開前に確認が必要な下書きです。まずここを確認すると運営が止まりません。
          </p>
          <button
            type="button"
            className="mt-3 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 disabled:opacity-40"
            onClick={props.onOpenInbox}
            disabled={props.loading}
          >
            承認待ちを確認する
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="text-xs text-gray-500">連携中の SNS</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">
            {props.connections.length}
          </div>
          <p className="mt-2 text-xs leading-5 text-gray-600">
            {props.connections.length === 0
              ? "まだ SNS が連携されていません。まずは使うアカウントを登録します。"
              : "AI が下書きを作る前提になる連携先です。増減があればここから更新します。"}
          </p>
          <button
            type="button"
            className="mt-3 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 disabled:opacity-40"
            onClick={props.onOpenCreate}
            disabled={props.loading}
          >
            下書き作成を開く
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="text-xs text-gray-500">最近の反応</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">
            {interactionTotal}
          </div>
          <p className="mt-2 text-xs leading-5 text-gray-600">
            {latestTrend
              ? `直近の反応率は ${(latestTrend.interactionRate * 100).toFixed(
                  1
                )}% です。最新のデータに更新してから下書きを作れます。`
              : "まだ十分な指標がありません。先に最新の指標を取り込みます。"}
          </p>
          <button
            type="button"
            className="mt-3 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 disabled:opacity-40"
            onClick={props.onCollectMetrics}
            disabled={props.loading}
          >
            指標を更新する
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-gray-900">最近の指標</div>
              <div className="mt-1 text-xs text-gray-500">
                週次レポートや告知文案の根拠になる数値です。
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4 text-xs">
            <div className="rounded-xl bg-gray-50 p-3">表示: {props.metricsTotals.views}</div>
            <div className="rounded-xl bg-gray-50 p-3">いいね: {props.metricsTotals.likes}</div>
            <div className="rounded-xl bg-gray-50 p-3">コメント: {props.metricsTotals.comments}</div>
            <div className="rounded-xl bg-gray-50 p-3">シェア: {props.metricsTotals.shares}</div>
          </div>
          <div className="mt-4 space-y-2 text-[11px] text-gray-700">
            {props.metricTrends.length === 0 ? (
              <AiOfficeEmptyState
                compact
                title="まだ推移データがありません"
                description="最新の指標を取得すると、ここに最近の動きが表示されます。"
              />
            ) : (
              props.metricTrends.slice(-5).map((day) => (
                <div key={day.date} className="rounded-xl bg-gray-50 px-3 py-2">
                  {day.date} / 表示 {day.views} / 反応率{" "}
                  {(day.interactionRate * 100).toFixed(2)}%
                  {day.topPlatform
                    ? ` / 反応がよいSNS ${day.topPlatform.platform}`
                    : ""}
                </div>
              ))
            )}
          </div>
          <div className="mt-4 rounded-xl border border-gray-200 p-3">
            <div className="text-xs font-medium text-gray-700">直近の取得データ</div>
            <div className="mt-2 space-y-1 text-[11px] text-gray-600">
              {props.metricsSnapshots.length === 0 ? (
                <AiOfficeEmptyState
                  compact
                  title="まだ取得データがありません"
                  description="指標を更新すると、SNS ごとの最新データをここで確認できます。"
                />
              ) : (
                props.metricsSnapshots.slice(0, 4).map((snapshot) => (
                  <div key={snapshot.id}>
                    {snapshot.platform} / 表示 {snapshot.views ?? 0} / いいね{" "}
                    {snapshot.likes ?? 0}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900">承認待ちの下書き</div>
            <div className="mt-1 text-xs text-gray-500">
              ここで内容をざっと確認して、必要なら承認待ち画面で承認します。
            </div>
            <div className="mt-3 space-y-2">
              {pendingTasks.length === 0 ? (
                <AiOfficeEmptyState
                  compact
                  title="承認待ちの下書きはありません"
                  description="新しく作った下書きが承認待ちになると、ここから確認できます。"
                />
              ) : (
                <>
                  {pendingTasks.map((task) => (
                    <div key={task.id} className="rounded-xl bg-gray-50 px-3 py-2">
                      <div className="text-xs font-medium text-gray-900">
                        {getAgentTaskTypeCopy(task.taskType).label}
                      </div>
                      <div className="mt-1 text-[11px] text-gray-600">
                        {getAgentTaskStatusCopy(task.status).helper}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 disabled:opacity-40"
                    onClick={props.onOpenInbox}
                    disabled={props.loading}
                  >
                    承認待ちでまとめて確認する
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900">連携中のアカウント</div>
            <div className="mt-1 text-xs text-gray-500">
              AI が指標を読む対象です。増減や停止があればここで把握します。
            </div>
            <div className="mt-3 space-y-2">
              {props.connections.length === 0 ? (
                <AiOfficeEmptyState
                  compact
                  title="まだ SNS 連携がありません"
                  description="下書き作成で連携先を追加すると、ここで状態を確認できます。"
                />
              ) : (
                props.connections.map((connection) => (
                  <div key={connection.id} className="rounded-xl bg-gray-50 px-3 py-2">
                    <div className="text-xs font-medium text-gray-900">
                      {connection.platform} / @{connection.accountHandle}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-600">
                      {getSocialConnectionStatusLabel(connection.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900">最近作った内容</div>
            <div className="mt-3 space-y-2">
              {recentTasks.length === 0 ? (
                <AiOfficeEmptyState
                  compact
                  title="まだ AI タスクがありません"
                  description="下書き作成から最初の 1 件を作ると、ここに最近の履歴が並びます。"
                />
              ) : (
                recentTasks.map((task) => (
                  <div key={task.id} className="rounded-xl bg-gray-50 px-3 py-2">
                    <div className="text-xs font-medium text-gray-900">
                      {getAgentTaskTypeCopy(task.taskType).label}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-600">
                      {getAgentTaskStatusCopy(task.status).label}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
