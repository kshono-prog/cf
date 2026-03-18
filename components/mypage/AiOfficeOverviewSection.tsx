"use client";

import React, { useMemo } from "react";

import { AiOfficeEmptyState } from "@/components/mypage/AiOfficeFeedback";
import {
  formatAiOfficeRecentRoleShortcutTime,
  sortAiOfficeRecentCopiedRoleLinksByRecency,
  sortAiOfficeRecentRoleShortcutsByPriority,
  type AiOfficeRecentCopiedRoleLink,
  type AiOfficeRecentRoleShortcut,
} from "@/components/mypage/aiOfficeRecentRoleShortcuts";
import { buildAiOfficePanelHref } from "@/components/mypage/aiOfficePanelUrlState";
import type {
  AiOfficeContentSummaryView,
  AiOfficeUsefulnessSummaryView,
  AgentTaskView,
  MetricSnapshotView,
  MetricTrendDayView,
} from "@/components/mypage/aiOfficeTypes";
import { getAiOfficeRoleChoices } from "@/components/mypage/aiOfficeTaskConfig";
import type { CreatorAiAgentRole } from "@/lib/creator-ai/agentRoleRegistry";
import {
  getAgentTaskStatusCopy,
  getAgentTaskTypeCopy,
} from "@/lib/uxCopy";

type Props = {
  loading: boolean;
  waitingApprovalCount: number;
  tasks: AgentTaskView[];
  contentSummary: AiOfficeContentSummaryView;
  usefulness: AiOfficeUsefulnessSummaryView;
  metricsTotals: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  metricsSnapshots: MetricSnapshotView[];
  metricTrends: MetricTrendDayView[];
  recentRoleShortcuts: AiOfficeRecentRoleShortcut[];
  recentCopiedRoleLinks: AiOfficeRecentCopiedRoleLink[];
  onOpenCreate: () => void;
  onOpenCreateForRole: (roleId: CreatorAiAgentRole) => void;
  onOpenInbox: (roleId?: CreatorAiAgentRole) => void;
  onCopiedRoleLink: (
    roleId: CreatorAiAgentRole,
    activeView: "CREATE" | "INBOX"
  ) => void;
  onCollectMetrics: () => void;
};

export function AiOfficeOverviewSection(props: Props) {
  const [copiedLinkKey, setCopiedLinkKey] = React.useState<string | null>(null);
  const { onCopiedRoleLink } = props;
  const interactionTotal =
    props.metricsTotals.likes +
    props.metricsTotals.comments +
    props.metricsTotals.shares;
  const latestTrend = props.metricTrends[props.metricTrends.length - 1] ?? null;
  const recentTasks = useMemo(() => props.tasks.slice(0, 3), [props.tasks]);
  const roleChoices = useMemo(() => getAiOfficeRoleChoices(), []);
  const pendingTasks = useMemo(
    () =>
      props.tasks
        .filter((task) => task.status === "WAITING_APPROVAL")
        .slice(0, 3),
    [props.tasks]
  );
  const recentRoleShortcutCards = useMemo(
    () =>
      sortAiOfficeRecentRoleShortcutsByPriority(
        props.recentRoleShortcuts.map((shortcut) => {
        const roleChoice = roleChoices.find(
          (role) => role.roleId === shortcut.roleId
        );
        const roleBreakdown =
          props.usefulness.roleBreakdown.find(
            (role) => role.roleId === shortcut.roleId
          ) ?? null;
        return {
          ...shortcut,
          label: roleChoice?.label ?? shortcut.roleId,
          helper: roleChoice?.roleHelper ?? "",
          waitingApprovalCount: roleBreakdown?.waitingApprovalCount ?? 0,
          ignoredCount: roleBreakdown?.ignoredCount ?? 0,
          lastUsedLabel: formatAiOfficeRecentRoleShortcutTime(shortcut.lastUsedAt),
        };
      })
      ),
    [props.recentRoleShortcuts, props.usefulness.roleBreakdown, roleChoices]
  );
  const recentCopiedRoleLinkCards = useMemo(
    () =>
      sortAiOfficeRecentCopiedRoleLinksByRecency(
        props.recentCopiedRoleLinks.map((link) => {
          const roleChoice = roleChoices.find(
            (role) => role.roleId === link.roleId
          );

          return {
            ...link,
            label: roleChoice?.label ?? link.roleId,
            copiedLabel: formatAiOfficeRecentRoleShortcutTime(link.copiedAt),
          };
        })
      ),
    [props.recentCopiedRoleLinks, roleChoices]
  );

  React.useEffect(() => {
    if (copiedLinkKey === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopiedLinkKey((current) =>
        current === copiedLinkKey ? null : current
      );
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [copiedLinkKey]);

  const copyRoleLink = React.useCallback(
    async (
      roleId: CreatorAiAgentRole,
      activeView: "CREATE" | "INBOX",
      key: string
    ) => {
      if (
        typeof window === "undefined" ||
        typeof window.navigator.clipboard?.writeText !== "function"
      ) {
        return;
      }

      const href = buildAiOfficePanelHref({
        pathname: window.location.pathname,
        hash: window.location.hash || "#ai-office-phase1",
        currentSearchParams: new URLSearchParams(window.location.search),
        state: {
          activeView,
          selectedRoleId: roleId,
          selectedInboxRoleId: activeView === "INBOX" ? roleId : null,
        },
      });

      try {
        await window.navigator.clipboard.writeText(
          `${window.location.origin}${href}`
        );
        onCopiedRoleLink(roleId, activeView);
        setCopiedLinkKey(key);
      } catch {
        return;
      }
    },
    [onCopiedRoleLink]
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
            onClick={() => props.onOpenInbox()}
            disabled={props.loading}
          >
            承認待ちを確認する
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="text-xs text-gray-500">Creator Founding の投稿</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">
            {props.contentSummary.publishedPosts}
          </div>
          <p className="mt-2 text-xs leading-5 text-gray-600">
            {props.contentSummary.totalPosts === 0
              ? "まだ Creator Founding 内の投稿がありません。先に1本投稿すると、AI が実績をもとに提案しやすくなります。"
              : `公開中 ${props.contentSummary.publishedPosts} 件 / 下書き ${props.contentSummary.draftPosts} 件を土台に、AI が次の一手や文案を整理します。`}
          </p>
          <button
            type="button"
            className="mt-3 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 disabled:opacity-40"
            onClick={props.onOpenCreate}
            disabled={props.loading}
          >
            AI事務所で下書きを作る
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="text-xs text-gray-500">投稿の反応</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">
            {interactionTotal}
          </div>
          <p className="mt-2 text-xs leading-5 text-gray-600">
            {latestTrend
              ? `直近の Creator Founding 投稿の反応率は ${(latestTrend.interactionRate * 100).toFixed(
                  1
                )}% です。最新のデータに更新してから下書きを作れます。`
              : "まだ十分な内部指標がありません。Creator Founding の投稿から最新の指標を取り込みます。"}
          </p>
          <button
            type="button"
            className="mt-3 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 disabled:opacity-40"
            onClick={props.onCollectMetrics}
            disabled={props.loading}
          >
            内部指標を更新する
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
                description="Creator Founding の投稿指標を取り込むと、ここに最近の動きが表示されます。"
              />
            ) : (
              props.metricTrends.slice(-5).map((day) => (
                <div key={day.date} className="rounded-xl bg-gray-50 px-3 py-2">
                  {day.date} / 表示 {day.views} / 反応率{" "}
                  {(day.interactionRate * 100).toFixed(2)}%
                  {day.topPlatform
                    ? ` / 反応がよい導線 ${day.topPlatform.platform}`
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
                description="内部指標を更新すると、Creator Founding 投稿の最新データをここで確認できます。"
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
            <div className="text-sm font-semibold text-gray-900">AI事務所の役割</div>
            <div className="mt-1 text-xs text-gray-500">
              どの役割に相談するかを先に決めると、近い task type が選びやすくなります。
            </div>
            <div className="mt-3 grid gap-2">
              {roleChoices.map((role) => (
                <button
                  key={role.roleId}
                  type="button"
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-left transition hover:border-slate-400"
                  onClick={() => props.onOpenCreateForRole(role.roleId)}
                  disabled={props.loading}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-gray-900">
                      {role.label}
                    </div>
                    <span className="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                      {role.taskChoices.length} task
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] leading-5 text-gray-600">
                    {role.roleHelper}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900">
              最近使った role 導線
            </div>
            <div className="mt-1 text-xs text-gray-500">
              よく使う role の `Create / Inbox` を、同じ文脈で開き直せます。
            </div>
            <div className="mt-3 space-y-2">
              {recentRoleShortcutCards.length === 0 ? (
                <AiOfficeEmptyState
                  compact
                  title="まだ最近使った role 導線はありません"
                  description="role を選んで Create や Inbox を開くと、ここからすぐ再開できるようになります。"
                />
              ) : (
                recentRoleShortcutCards.map((shortcut, index) => (
                  <div
                    key={`${shortcut.roleId}:${shortcut.activeView}`}
                    className="rounded-xl bg-gray-50 px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-semibold text-gray-900">
                          {shortcut.label}
                        </div>
                        {index === 0 &&
                        (shortcut.ignoredCount > 0 ||
                          shortcut.waitingApprovalCount > 0) ? (
                          <span className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-medium text-amber-900">
                            先に確認
                          </span>
                        ) : null}
                      </div>
                      <span className="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-700">
                        {shortcut.activeView === "INBOX" ? "承認待ち" : "下書き"}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] leading-5 text-gray-600">
                      {shortcut.helper}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-600">
                      <span className="rounded-full border border-gray-200 bg-white px-2 py-1">
                        最終利用: {shortcut.lastUsedLabel}
                      </span>
                      {shortcut.waitingApprovalCount > 0 ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-900">
                          承認待ち {shortcut.waitingApprovalCount} 件
                        </span>
                      ) : null}
                      {shortcut.ignoredCount > 0 ? (
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">
                          保留が長い {shortcut.ignoredCount} 件
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={`rounded-full border bg-white px-3 py-1.5 text-[11px] font-medium disabled:opacity-40 ${
                          shortcut.waitingApprovalCount > 0 ||
                          shortcut.ignoredCount > 0
                            ? "border-amber-300 text-amber-900"
                            : "border-gray-300 text-gray-800"
                        }`}
                        onClick={() => props.onOpenInbox(shortcut.roleId)}
                        disabled={props.loading}
                      >
                        この role の承認待ちを開く
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-800 disabled:opacity-40"
                        onClick={() =>
                          props.onOpenCreateForRole(shortcut.roleId)
                        }
                        disabled={props.loading}
                      >
                        この role で下書きを開く
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 disabled:opacity-40"
                        onClick={() =>
                          void copyRoleLink(
                            shortcut.roleId,
                            "INBOX",
                            `${shortcut.roleId}:INBOX:recent`
                          )
                        }
                        disabled={props.loading}
                      >
                        {copiedLinkKey === `${shortcut.roleId}:INBOX:recent`
                          ? "Inbox リンクをコピー済み"
                          : "Inbox リンクをコピー"}
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 disabled:opacity-40"
                        onClick={() =>
                          void copyRoleLink(
                            shortcut.roleId,
                            "CREATE",
                            `${shortcut.roleId}:CREATE:recent`
                          )
                        }
                        disabled={props.loading}
                      >
                        {copiedLinkKey === `${shortcut.roleId}:CREATE:recent`
                          ? "Create リンクをコピー済み"
                          : "Create リンクをコピー"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900">
              最近コピーした role link
            </div>
            <div className="mt-1 text-xs text-gray-500">
              運用メモや共有で使った `Inbox / Create` の link を、ここから再コピーできます。
            </div>
            <div className="mt-3 space-y-2">
              {recentCopiedRoleLinkCards.length === 0 ? (
                <AiOfficeEmptyState
                  compact
                  title="まだコピーした role link はありません"
                  description="recent shortcut から link をコピーすると、ここに直近の履歴が残ります。"
                />
              ) : (
                recentCopiedRoleLinkCards.map((link) => (
                  <div
                    key={`${link.roleId}:${link.activeView}`}
                    className="rounded-xl bg-gray-50 px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-gray-900">
                        {link.label}
                      </div>
                      <span className="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-700">
                        {link.activeView === "INBOX" ? "Inbox" : "Create"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-600">
                      <span className="rounded-full border border-gray-200 bg-white px-2 py-1">
                        コピー: {link.copiedLabel}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-800 disabled:opacity-40"
                        onClick={() =>
                          link.activeView === "INBOX"
                            ? props.onOpenInbox(link.roleId)
                            : props.onOpenCreateForRole(link.roleId)
                        }
                        disabled={props.loading}
                      >
                        {link.activeView === "INBOX"
                          ? "この Inbox を開く"
                          : "この Create を開く"}
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 disabled:opacity-40"
                        onClick={() =>
                          void copyRoleLink(
                            link.roleId,
                            link.activeView,
                            `${link.roleId}:${link.activeView}:copied`
                          )
                        }
                        disabled={props.loading}
                      >
                        {copiedLinkKey === `${link.roleId}:${link.activeView}:copied`
                          ? "リンクをコピー済み"
                          : "この link を再コピー"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900">
              AI の使われ方
            </div>
            <div className="mt-1 text-xs text-gray-500">
              直近 {props.usefulness.windowDays} 日。`保留が長い` は{" "}
              {props.usefulness.staleAfterHours} 時間以上の承認待ちです。
            </div>
            <div className="mt-3">
              {props.usefulness.actionableCount === 0 ? (
                <AiOfficeEmptyState
                  compact
                  title="まだ承認前提の下書きは多くありません"
                  description="承認前提の task が増えると、ここで対応率や保留の長さを追えます。"
                />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-gray-50 p-3">
                      <div className="text-[11px] text-gray-500">対応率</div>
                      <div className="mt-1 text-lg font-semibold text-gray-900">
                        {(props.usefulness.followThroughRate * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <div className="text-[11px] text-gray-500">承認</div>
                      <div className="mt-1 text-lg font-semibold text-gray-900">
                        {props.usefulness.approvedCount}
                      </div>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <div className="text-[11px] text-gray-500">却下</div>
                      <div className="mt-1 text-lg font-semibold text-gray-900">
                        {props.usefulness.rejectedCount}
                      </div>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <div className="text-[11px] text-gray-500">保留が長い</div>
                      <div className="mt-1 text-lg font-semibold text-gray-900">
                        {props.usefulness.ignoredCount}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-[11px] leading-5 text-gray-600">
                    <div>
                      承認前提: {props.usefulness.actionableCount} 件 / 対応済み:{" "}
                      {props.usefulness.followThroughCount} 件 / 承認待ち:{" "}
                      {props.usefulness.waitingApprovalCount} 件
                    </div>
                    <div>
                      自動完了: {props.usefulness.autoCompletedCount} 件
                      {props.usefulness.medianDecisionHours !== null
                        ? ` / 中央判断時間: ${props.usefulness.medianDecisionHours.toFixed(
                            2
                          )} 時間`
                        : ""}
                    </div>
                  </div>
                  <div className="mt-4 border-t border-gray-200 pt-3">
                    <div className="text-[11px] font-medium text-gray-700">
                      role ごとの使われ方
                    </div>
                    <div className="mt-2 space-y-2">
                      {props.usefulness.roleBreakdown.length === 0 ? (
                        <AiOfficeEmptyState
                          compact
                          title="role 別の十分な履歴はまだありません"
                          description="role を選んで下書きを作ると、ここに Manager / Promotion などの傾向が出ます。"
                        />
                      ) : (
                        props.usefulness.roleBreakdown.map((role) => (
                          <div
                            key={role.roleId}
                            className="rounded-xl bg-gray-50 px-3 py-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs font-medium text-gray-900">
                                {role.label}
                              </div>
                              <div className="flex items-center gap-2">
                                {role.ignoredCount > 0 ? (
                                  <span className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-medium text-amber-900">
                                    先に確認
                                  </span>
                                ) : null}
                                <div className="text-[11px] text-gray-600">
                                  対応率{" "}
                                  {(role.followThroughRate * 100).toFixed(0)}%
                                </div>
                              </div>
                            </div>
                            <div className="mt-1 text-[11px] leading-5 text-gray-600">
                              承認前提 {role.actionableCount} 件 / 承認{" "}
                              {role.approvedCount} 件 / 却下 {role.rejectedCount} 件
                              / 保留が長い {role.ignoredCount} 件
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {role.waitingApprovalCount > 0 ||
                              role.ignoredCount > 0 ? (
                                <>
                                  <button
                                    type="button"
                                    className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-[11px] font-medium text-amber-900 disabled:opacity-40"
                                    onClick={() => props.onOpenInbox(role.roleId)}
                                    disabled={props.loading}
                                  >
                                    承認待ちを確認
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 disabled:opacity-40"
                                    onClick={() =>
                                      void copyRoleLink(
                                        role.roleId,
                                        "INBOX",
                                        `${role.roleId}:INBOX`
                                      )
                                    }
                                    disabled={props.loading}
                                  >
                                    {copiedLinkKey === `${role.roleId}:INBOX`
                                      ? "リンクをコピー済み"
                                      : "この role のリンクをコピー"}
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-800 disabled:opacity-40"
                                    onClick={() =>
                                      props.onOpenCreateForRole(role.roleId)
                                    }
                                    disabled={props.loading}
                                  >
                                    この role で作る
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 disabled:opacity-40"
                                    onClick={() =>
                                      void copyRoleLink(
                                        role.roleId,
                                        "CREATE",
                                        `${role.roleId}:CREATE`
                                      )
                                    }
                                    disabled={props.loading}
                                  >
                                    {copiedLinkKey === `${role.roleId}:CREATE`
                                      ? "リンクをコピー済み"
                                      : "この role のリンクをコピー"}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900">承認待ちの下書き</div>
            <div className="mt-1 text-xs text-gray-500">
              Manager / Promotion / Finance / Fan Relation の各役割で作られた下書きを、ここでざっと確認できます。
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
                    onClick={() => props.onOpenInbox()}
                    disabled={props.loading}
                  >
                    承認待ちでまとめて確認する
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900">
              Creator Founding 投稿の土台
            </div>
            <div className="mt-1 text-xs text-gray-500">
              外部SNS連携ではなく、このアプリ内の投稿と反応を根拠にします。
            </div>
            <div className="mt-3 space-y-2">
              {props.contentSummary.totalPosts === 0 ? (
                <AiOfficeEmptyState
                  compact
                  title="まだ Creator Founding 投稿がありません"
                  description="先に1本投稿すると、AI が反応や支援の文脈を読みやすくなります。"
                />
              ) : (
                <>
                  <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-800">
                    投稿総数: {props.contentSummary.totalPosts} 件
                  </div>
                  <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-800">
                    公開中: {props.contentSummary.publishedPosts} 件 / 下書き:{" "}
                    {props.contentSummary.draftPosts} 件 / AI生成:{" "}
                    {props.contentSummary.aiGeneratedPosts} 件
                  </div>
                  <div className="rounded-xl bg-gray-50 px-3 py-2 text-[11px] text-gray-600">
                    最終公開: {props.contentSummary.lastPublishedAt ?? "まだありません"}
                  </div>
                </>
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
