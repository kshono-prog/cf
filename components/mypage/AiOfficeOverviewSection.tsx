"use client";

import React from "react";

import type {
  AiOfficeUsefulnessSummaryView,
  AgentTaskView,
} from "@/components/mypage/aiOfficeTypes";
import { getAiOfficeRoleChoices } from "@/components/mypage/aiOfficeTaskConfig";
import { AGENT_TASK_AUDIT_ACTION } from "@/lib/agentTaskAudit";
import { deriveAiManagerX402DeliveryEvents } from "@/lib/aiManager/x402DeliveryEvents";
import { deriveAiManagerPendingTimeline } from "@/lib/aiManager/pendingTimeline";
import { AiManagerPendingTimelineCard } from "@/components/mypage/AiManagerPendingTimelineCard";
import { AiManagerConnectorHealthDigest } from "@/components/mypage/AiManagerConnectorHealthDigest";
import { deriveConnectorHealthDigest } from "@/lib/aiManager/connectorHealthDigest";
import { deriveAiManagerX402FollowUps } from "@/lib/aiManager/x402FollowUps";
import { deriveAiManagerX402RecoveryItems } from "@/lib/aiManager/x402Recovery";
import { deriveAiManagerX402ActivityTimeline } from "@/lib/aiManager/x402Timeline";
import { AiManagerRecoveryTrendChart } from "@/components/mypage/AiManagerRecoveryTrendChart";
import { deriveAiManagerX402RecoverySummary } from "@/lib/aiManager/x402RecoverySummary";
import type { CreatorAiAgentRole } from "@/lib/creator-ai/agentRoleRegistry";
import type { SerializedAiManagerAccount } from "@/lib/serializers/aiManager";
import {
  getAgentTaskStatusCopy,
  getAgentTaskTypeCopy,
} from "@/lib/uxCopy";

type Props = {
  loading: boolean;
  waitingApprovalCount: number;
  tasks: AgentTaskView[];
  usefulness: AiOfficeUsefulnessSummaryView;
  aiManagerAccount: SerializedAiManagerAccount | null;
  aiManagerLoading: boolean;
  aiManagerError: string | null;
  onOpenCreate: () => void;
  onOpenCreateForRole: (roleId: CreatorAiAgentRole) => void;
  onOpenInbox: (roleId?: CreatorAiAgentRole) => void;
  onOpenTaskInInbox: (taskType: string) => void;
  onCollectMetrics: () => void;
};

function getAiManagerStatusLabel(
  status: SerializedAiManagerAccount["status"]
): string {
  switch (status) {
    case "ACTIVE":
      return "稼働中";
    case "PAUSED":
      return "一時停止";
    case "ARCHIVED":
      return "アーカイブ";
    case "DRAFT":
      return "準備中";
  }
}

function getAiManagerVisibilityLabel(
  visibility: SerializedAiManagerAccount["publicVisibility"]
): string {
  switch (visibility) {
    case "PUBLIC_BADGED":
      return "公開 + AI明記";
    case "PRIVATE":
      return "完全非公開";
    case "OWNER_ONLY":
      return "owner only";
  }
}

function formatJpycAmount(value: string | null): string {
  if (!value) return "0 JPYC";
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return `${value} JPYC`;
  }
  return `${amount.toLocaleString("ja-JP")} JPYC`;
}

function formatOverviewDate(value: string | null): string {
  if (!value) return "なし";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getBillableCapabilityLabel(capability: string): string {
  switch (capability) {
    case "POST_DRAFTING":
      return "投稿下書き";
    case "FAN_REPLY_ASSIST":
      return "ファン返信補助";
    case "PROGRESS_SUMMARY":
      return "進捗サマリー";
    case "WEB_RESEARCH":
      return "Web情報収集";
    default:
      return capability;
  }
}

function getUsageStateLabel(state: string): string {
  switch (state) {
    case "WAIVED":
      return "無料範囲";
    case "SETTLED":
      return "支払い記録済み";
    case "FAILED":
      return "失敗";
    case "PAYMENT_PENDING":
      return "支払い待ち";
    case "METERED":
      return "計測済み";
    default:
      return state;
  }
}

function getBudgetTransactionTypeLabel(type: string): string {
  switch (type) {
    case "OWNER_TOP_UP":
      return "owner top-up";
    case "OWNER_DEDUCTION":
      return "owner deduction";
    case "USAGE_SETTLEMENT":
      return "usage settlement";
    default:
      return type;
  }
}

function getPaymentAttemptStatusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "owner確認待ち";
    case "CONFIRMED":
      return "確認済み";
    case "FAILED":
      return "失敗";
    default:
      return status;
  }
}

const X402_DELIVERY_STATUS_LABELS = {
  NONE: "pending なし",
  ACTIVE: "callback 待ち",
  WATCH: "やや滞留",
  STALE: "長時間滞留",
} as const;

const X402_EVENT_SOURCE_LABELS = {
  BILLING_SYSTEM: "billing system",
  OWNER_REVIEW: "owner review",
  X402_CONNECTOR: "x402 connector",
} as const;

const X402_EVENT_TYPE_LABELS = {
  ATTEMPT_CREATED: "settlement started",
  PENDING_OBSERVED: "pending observed",
  SETTLEMENT_CONFIRMED: "settlement confirmed",
  SETTLEMENT_FAILED: "settlement failed",
  SETTLEMENT_REPLAYED: "duplicate replay accepted",
} as const;

const X402_FOLLOW_UP_PRIORITY_LABELS = {
  HIGH: "要確認",
  MEDIUM: "確認推奨",
} as const;

function RejectionPatternCard({ tasks }: { tasks: AgentTaskView[] }) {
  const rejectedTasks = tasks.filter(
    (t) => t.status === "FAILED" && t.rejectReason != null && t.rejectReason.trim().length > 0
  );

  const countsByType = new Map<string, number>();
  for (const t of tasks.filter((t) => t.status === "FAILED")) {
    countsByType.set(t.taskType, (countsByType.get(t.taskType) ?? 0) + 1);
  }
  const topRejectedTypes = [...countsByType.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="card p-5 space-y-3 border-l-4 border-rose-400">
      <div>
        <div className="section-label text-rose-700">却下パターン分析</div>
        <p className="caption-text mt-0.5">
          却下が多い担当・理由を確認して、次の依頼に活かしましょう。
        </p>
      </div>

      {topRejectedTypes.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
            却下が多い Task Type
          </div>
          <div className="flex flex-wrap gap-2">
            {topRejectedTypes.map(([type, count]) => (
              <span key={type} className="status-badge status-badge-error">
                {getAgentTaskTypeCopy(type).label} — {count}件
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {rejectedTasks.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
            直近の却下理由
          </div>
          <div className="space-y-1.5">
            {rejectedTasks.slice(0, 3).map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2"
              >
                <div className="text-[11px] font-semibold text-rose-700">
                  {getAgentTaskTypeCopy(t.taskType).label}
                </div>
                <div className="mt-0.5 text-xs leading-5 text-rose-900">
                  {t.rejectReason}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-subtle)]">
          理由付き却下がまだありません。次回から却下時にコメントを入れると、ここに表示されます。
        </p>
      )}
    </div>
  );
}

export function AiOfficeOverviewSection(props: Props) {
  const roleChoices = React.useMemo(() => getAiOfficeRoleChoices(), []);
  const recentTasks = React.useMemo(() => props.tasks.slice(0, 5), [props.tasks]);
  const roleUsefulnessMap = React.useMemo(
    () =>
      new Map(
        props.usefulness.roleBreakdown.map((role) => [role.roleId, role] as const)
      ),
    [props.usefulness.roleBreakdown]
  );
  const aiManagerAvailableAmount =
    props.aiManagerAccount?.budgetBalance?.availableAmount ?? null;
  const aiManagerAvailableValue = Number(aiManagerAvailableAmount ?? "0");
  const aiManagerHasBudget =
    Number.isFinite(aiManagerAvailableValue) && aiManagerAvailableValue > 0;
  const aiManagerBillingPaused =
    props.aiManagerAccount?.billingPolicy?.status === "PAUSED";
  const pendingX402Settlements =
    props.aiManagerAccount?.recentUsageRecords.filter(
      (usage) =>
        usage.latestPaymentAttempt?.rail === "X402" &&
        usage.latestPaymentAttempt.status === "PENDING"
    ) ?? [];
  const pendingTimeline = deriveAiManagerPendingTimeline(props.aiManagerAccount);
  const connectorHealthDigest = deriveConnectorHealthDigest(props.aiManagerAccount);
  const x402FollowUps = deriveAiManagerX402FollowUps(props.aiManagerAccount);
  const x402RecoveryItems = deriveAiManagerX402RecoveryItems(
    props.aiManagerAccount
  );
  const x402RecoverySummary = deriveAiManagerX402RecoverySummary(
    props.aiManagerAccount
  );
  const recentX402DeliveryEvents = deriveAiManagerX402DeliveryEvents(
    props.aiManagerAccount
  );
  const recentX402Activity = deriveAiManagerX402ActivityTimeline(
    props.aiManagerAccount
  );

  return (
    <div className="space-y-4">
      {/* ── Area 1: Status ── */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="section-label">現在の状況</div>
            {props.waitingApprovalCount > 0 ? (
              <>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-amber-500">{props.waitingApprovalCount}</span>
                  <span className="body-text">件の承認待ちがあります</span>
                </div>
                <p className="mt-1 caption-text">AIが作成した下書きの確認が必要です。</p>
              </>
            ) : (
              <>
                <div className="mt-1 text-lg font-semibold text-[var(--support)]">問題ありません</div>
                <p className="mt-1 caption-text">承認待ちはありません。新しい依頼や下書きを試してみましょう。</p>
              </>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {props.waitingApprovalCount > 0 ? (
              <button
                type="button"
                className="btn"
                onClick={() => props.onOpenInbox()}
                disabled={props.loading}
              >
                承認待ちを確認する ({props.waitingApprovalCount}件)
              </button>
            ) : (
              <button
                type="button"
                className="btn"
                onClick={props.onOpenCreate}
                disabled={props.loading}
              >
                新しく作成する →
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={props.onCollectMetrics}
              disabled={props.loading}
            >
              {props.loading ? "更新中..." : "指標を更新する"}
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
            <div className="text-[11px] font-medium text-[var(--text)]">計測対象</div>
            <div className="mt-1 text-2xl font-semibold text-[var(--text)]">
              {props.usefulness.trackedReadyCount}
            </div>
            <div className="caption-text">compose / draft / copy に進める結果</div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="text-[11px] font-medium text-emerald-800">使われた結果</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-700">
              {props.usefulness.usedCount}
            </div>
            <div className="text-[11px] text-emerald-700">
              handoff または copy に進んだ件数
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            <div className="text-[11px] font-medium text-[var(--text)]">活用率</div>
            <div className="mt-1 text-2xl font-semibold text-[var(--text)]">
              {(props.usefulness.usedRate * 100).toFixed(0)}%
            </div>
            <div className="caption-text">計測対象に限った downstream 利用率</div>
          </div>
        </div>
        {props.usefulness.actionableCount > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-subtle)]">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
              今月の承認実績
            </span>
            <span>
              承認{" "}
              <span className="font-semibold text-emerald-700">
                {props.usefulness.approvedCount}
              </span>
              件
            </span>
            <span>
              却下{" "}
              <span className="font-semibold text-rose-700">
                {props.usefulness.rejectedCount}
              </span>
              件
            </span>
            <span>
              承認率{" "}
              <span className="font-semibold text-[var(--text)]">
                {(props.usefulness.approvalRate * 100).toFixed(0)}%
              </span>
            </span>
            {props.usefulness.medianDecisionHours !== null ? (
              <span>
                中央値{" "}
                <span className="font-semibold text-[var(--text)]">
                  {props.usefulness.medianDecisionHours.toFixed(1)}h
                </span>
                で判断
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* ── Area 1.25: AI Manager Identity / Billing Boundary ── */}
      <div className="card p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="section-label">AIマネージャーの運用境界</div>
            <p className="caption-text mt-0.5">
              だれが動き、どこまで無料で、どの予算ルールで billable task を使うかを確認できます。
            </p>
          </div>
          <div className="text-[11px] text-[var(--text-subtle)]">
            公開時は常に AI 明記
          </div>
        </div>

        {props.aiManagerLoading ? (
          <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-5 text-sm text-[var(--text-subtle)]">
            AIマネージャーの状態を読み込んでいます。
          </div>
        ) : null}

        {!props.aiManagerLoading && props.aiManagerError ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
              案内
            </div>
            <div className="mt-1 text-sm font-semibold text-amber-950">
              AIマネージャー情報は次回の読み込みで更新されます
            </div>
            <div className="mt-1 text-xs leading-5 text-amber-800">
              {props.aiManagerError}
            </div>
          </div>
        ) : null}

        {!props.aiManagerLoading && !props.aiManagerAccount ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[var(--line)] px-4 py-5">
            <div className="text-sm font-semibold text-[var(--text)]">
              AIマネージャーはまだ作成されていません
            </div>
            <p className="mt-1 caption-text">
              1 creator = 1 AIマネージャーを前提に、まず owner only で作成してから運営ルールを育てます。
            </p>
          </div>
        ) : null}

        {props.aiManagerAccount ? (
          <>
            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
                <div className="text-[11px] font-medium text-[var(--text)]">人格</div>
                <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                  {props.aiManagerAccount.displayName}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <div className="text-[11px] font-medium text-[var(--text)]">状態</div>
                <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                  {getAiManagerStatusLabel(props.aiManagerAccount.status)}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <div className="text-[11px] font-medium text-[var(--text)]">公開範囲</div>
                <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                  {getAiManagerVisibilityLabel(
                    props.aiManagerAccount.publicVisibility
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <div className="text-[11px] font-medium text-[var(--text)]">利用モード</div>
                <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                  {aiManagerBillingPaused
                    ? "billable 一時停止"
                    : props.aiManagerAccount.billingPolicy?.autoPayEnabled
                    ? "cap 付き自動支払い"
                    : "手動 top-up"}
                </div>
              </div>
            </div>

            {aiManagerBillingPaused ? (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                  billable pause
                </div>
                <div className="mt-1 text-sm font-semibold text-amber-950">
                  billable capability は現在停止中です
                </div>
                <div className="mt-1 text-xs leading-5 text-amber-900">
                  {props.aiManagerAccount.billingPolicy?.pauseReason ??
                    "Settings で pause reason を確認し、再開条件を整えてください。"}
                </div>
                {pendingTimeline.length > 0 ? (
                  <div className="mt-3 grid gap-2">
                    {pendingTimeline.slice(0, 3).map((item) => (
                      <AiManagerPendingTimelineCard
                        key={item.paymentAttemptId}
                        item={item}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {!aiManagerBillingPaused && pendingX402Settlements.length > 0 ? (
              <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                  x402 confirmation pending
                </div>
                <div className="mt-1 text-sm font-semibold text-sky-950">
                  owner 確認待ちの x402 settlement が{" "}
                  {pendingX402Settlements.length}件あります
                </div>
                <div className="mt-1 text-xs leading-5 text-sky-900">
                  budget は消費済みです。Settings の AIマネージャーから tx hash を記録して、
                  settlement を confirmed に進めてください。
                </div>
              </div>
            ) : null}

            <div className="mt-3 grid gap-2 lg:grid-cols-[1.2fr,0.8fr]">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                  行動ルール
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--line)] bg-white px-3 py-3">
                    <div className="text-[11px] text-[var(--text-subtle)]">無料範囲</div>
                    <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                      内部ブリーフィング + 軽い下書き
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-white px-3 py-3">
                    <div className="text-[11px] text-[var(--text-subtle)]">Web収集</div>
                    <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                      手動トリガーのみ
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(props.aiManagerAccount.billingPolicy?.allowedBillableCapabilities ??
                    []
                  ).map((capability) => (
                    <span key={capability} className="status-badge status-badge-neutral">
                      {getBillableCapabilityLabel(capability)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                  予算と cap
                </div>
                <div className="mt-2 text-sm text-[var(--text)]">
                  {aiManagerHasBudget
                    ? "残高の範囲で billable capability を使えます。"
                    : "残高ゼロのため、現在は無料範囲で動作します。"}
                </div>
                <div className="mt-3 space-y-2">
                  <div className="rounded-2xl border border-[var(--line)] bg-white px-3 py-3">
                    <div className="text-[11px] text-[var(--text-subtle)]">available</div>
                    <div className="mt-1 text-base font-semibold text-[var(--text)]">
                      {formatJpycAmount(aiManagerAvailableAmount)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-white px-3 py-3 text-xs leading-6 text-[var(--text-subtle)]">
                    <div>
                      per action:{" "}
                      {props.aiManagerAccount.billingPolicy?.perActionJpycCap ?? 0} JPYC
                    </div>
                    <div>
                      daily: {props.aiManagerAccount.billingPolicy?.dailyJpycCap ?? 0} JPYC
                    </div>
                    <div>
                      monthly:{" "}
                      {props.aiManagerAccount.billingPolicy?.monthlyJpycCap ?? 0} JPYC
                    </div>
                  </div>
                  {props.aiManagerAccount.recentBudgetTransactions[0] ? (
                    <div className="rounded-2xl border border-[var(--line)] bg-white px-3 py-3 text-xs leading-5 text-[var(--text-subtle)]">
                      <div className="font-semibold text-[var(--text)]">
                        直近の予算操作
                      </div>
                      <div className="mt-1">
                        {props.aiManagerAccount.recentBudgetTransactions[0].direction ===
                        "CREDIT"
                          ? "+"
                          : "-"}
                        {props.aiManagerAccount.recentBudgetTransactions[0].amount}{" "}
                        {props.aiManagerAccount.recentBudgetTransactions[0].currency}
                      </div>
                      <div>
                        {getBudgetTransactionTypeLabel(
                          props.aiManagerAccount.recentBudgetTransactions[0]
                            .transactionType
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {props.aiManagerAccount.reconciliation.requiresAttention ? (
              <div className="mt-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                  reconciliation summary
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[var(--line)] bg-white px-3 py-3 text-xs leading-5 text-[var(--text-subtle)]">
                    <div className="font-semibold text-[var(--text)]">
                      pending x402
                    </div>
                    <div>
                      {props.aiManagerAccount.reconciliation.pendingX402Count}件 /{" "}
                      {formatJpycAmount(
                        props.aiManagerAccount.reconciliation.pendingX402Amount
                      )}
                    </div>
                    <div>
                      oldest:{" "}
                      {formatOverviewDate(
                        props.aiManagerAccount.reconciliation
                          .oldestPendingX402CreatedAt
                      )}
                    </div>
                    <div>
                      delivery:{" "}
                      {
                        X402_DELIVERY_STATUS_LABELS[
                          props.aiManagerAccount.reconciliation
                            .pendingX402DeliveryStatus
                        ]
                      }
                    </div>
                    {props.aiManagerAccount.reconciliation
                      .latestPendingX402EventSource &&
                    props.aiManagerAccount.reconciliation
                      .latestPendingX402EventType ? (
                      <div>
                        latest event:{" "}
                        {
                          X402_EVENT_SOURCE_LABELS[
                            props.aiManagerAccount.reconciliation
                              .latestPendingX402EventSource
                          ]
                        }{" "}
                        /{" "}
                        {
                          X402_EVENT_TYPE_LABELS[
                            props.aiManagerAccount.reconciliation
                              .latestPendingX402EventType
                          ]
                        }
                      </div>
                    ) : null}
                    {props.aiManagerAccount.reconciliation
                      .pendingX402DeliveryHint ? (
                      <div>
                        {
                          props.aiManagerAccount.reconciliation
                            .pendingX402DeliveryHint
                        }
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-white px-3 py-3 text-xs leading-5 text-[var(--text-subtle)]">
                    <div className="font-semibold text-[var(--text)]">
                      unmatched evidence
                    </div>
                    <div>
                      {
                        props.aiManagerAccount.reconciliation
                          .unmatchedFundingEvidenceCount
                      }
                      件 /{" "}
                      {formatJpycAmount(
                        props.aiManagerAccount.reconciliation
                          .unmatchedFundingEvidenceAmount
                      )}
                    </div>
                    <div>
                      latest confirmed:{" "}
                      {formatOverviewDate(
                        props.aiManagerAccount.reconciliation.latestConfirmedX402At
                      )}
                    </div>
                    <div>
                      recovery: {props.aiManagerAccount.reconciliation.recoveryCount}件
                      {props.aiManagerAccount.reconciliation.latestRecoveryLabel &&
                      props.aiManagerAccount.reconciliation.latestRecoverySourceLabel
                        ? ` / ${props.aiManagerAccount.reconciliation.latestRecoveryLabel} / ${props.aiManagerAccount.reconciliation.latestRecoverySourceLabel}`
                        : ""}
                    </div>
                    <div>
                      connector {props.aiManagerAccount.reconciliation.recoveryConnectorCount} / owner review{" "}
                      {props.aiManagerAccount.reconciliation.recoveryOwnerReviewCount}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-white px-3 py-3 text-xs leading-5 text-[var(--text-subtle)]">
                    <div className="font-semibold text-[var(--text)]">
                      failed x402
                    </div>
                    <div>
                      {props.aiManagerAccount.reconciliation.failedX402Count}件 /{" "}
                      {formatJpycAmount(
                        props.aiManagerAccount.reconciliation.failedX402Amount
                      )}
                    </div>
                    <div>
                      {props.aiManagerAccount.reconciliation.failedX402Count > 0
                        ? "pause と合わせて確認してください。"
                        : "現在は問題ありません。"}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {x402FollowUps.length > 0 ? (
              <div className="mt-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                  owner follow-up
                </div>
                <div className="mt-3 space-y-2">
                  {x402FollowUps.slice(0, 3).map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-[var(--line)] bg-white px-3 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-[var(--text)]">
                          {entry.title}
                        </div>
                        <span className="status-badge status-badge-neutral">
                          {X402_FOLLOW_UP_PRIORITY_LABELS[entry.priority]}
                        </span>
                        {entry.slaBreached ? (
                          <span className="status-badge status-badge-error">
                            SLA 超過
                            {entry.slaAgeHours !== null
                              ? ` (${entry.slaAgeHours.toString()}h)`
                              : ""}
                          </span>
                        ) : null}
                        {entry.routeLabel ? (
                          <span className="status-badge status-badge-neutral">
                            {entry.routeLabel}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
                        {entry.detail}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
                        next: {entry.actionLabel}
                        {entry.createdAt
                          ? ` / ${formatOverviewDate(entry.createdAt)}`
                          : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <AiManagerConnectorHealthDigest digest={connectorHealthDigest} />

            <div className="mt-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                recent delivery events
              </div>
              {recentX402DeliveryEvents.length === 0 ? (
                <div className="mt-2 text-sm text-[var(--text-subtle)]">
                  まだ x402 delivery event はありません。
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {recentX402DeliveryEvents.slice(0, 3).map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-[var(--line)] bg-white px-3 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-[var(--text)]">
                          {entry.taskLabel ?? entry.capabilityLabel}
                        </div>
                        <div className="text-xs text-[var(--text-subtle)]">
                          {entry.sourceLabel}
                        </div>
                      </div>
                      <div className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
                        {entry.eventLabel} / {formatOverviewDate(entry.createdAt)}
                      </div>
                      {entry.detail ? (
                        <div className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
                          {entry.detail}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                recent x402 activity
              </div>
              {recentX402Activity.length === 0 ? (
                <div className="mt-2 text-sm text-[var(--text-subtle)]">
                  まだ x402 activity はありません。
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {recentX402Activity.slice(0, 3).map((entry) => (
                    <div
                      key={entry.paymentAttemptId}
                      className="rounded-2xl border border-[var(--line)] bg-white px-3 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-[var(--text)]">
                          {entry.taskLabel ?? entry.capabilityLabel}
                        </div>
                        <div className="text-xs text-[var(--text-subtle)]">
                          {getPaymentAttemptStatusLabel(entry.status)}
                        </div>
                      </div>
                      <div className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
                        {formatJpycAmount(entry.amount)} / {formatOverviewDate(entry.eventAt)}
                      </div>
                      {entry.failureReason ? (
                        <div className="mt-1 text-xs leading-5 text-amber-800">
                          {entry.failureReason}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                直近の usage ledger
              </div>
              {props.aiManagerAccount.recentUsageRecords.length === 0 ? (
                <div className="mt-2 text-sm text-[var(--text-subtle)]">
                  まだ AIマネージャーの利用記録はありません。
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {props.aiManagerAccount.recentUsageRecords.slice(0, 3).map((usage) => (
                    <div
                      key={usage.id}
                      className="rounded-2xl border border-[var(--line)] bg-white px-3 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-[var(--text)]">
                          {getBillableCapabilityLabel(usage.capability)}
                        </div>
                        <div className="text-xs text-[var(--text-subtle)]">
                          {getUsageStateLabel(usage.billingState)}
                        </div>
                      </div>
                      <div className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
                        {usage.taskType ? `${getAgentTaskTypeCopy(usage.taskType).label} / ` : ""}
                        {usage.chargeAmount} {usage.currency}
                      </div>
                      {usage.latestPaymentAttempt ? (
                        <div className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
                          settlement:{" "}
                          {usage.latestPaymentAttempt.rail === "X402"
                            ? "x402"
                            : "internal ledger fallback"}{" "}
                          /{" "}
                          {getPaymentAttemptStatusLabel(
                            usage.latestPaymentAttempt.status
                          )}
                        </div>
                      ) : null}
                      {usage.failureReason ? (
                        <div className="mt-1 text-xs leading-5 text-amber-800">
                          {usage.failureReason}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
              <AiManagerRecoveryTrendChart summary={x402RecoverySummary} />
              {x402RecoveryItems.length > 0 && (
                <div className="mt-3 space-y-2">
                  {x402RecoveryItems.slice(0, 3).map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-[var(--line)] bg-white px-3 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-[var(--text)]">
                          {entry.taskLabel ?? entry.capabilityLabel}
                        </div>
                        <span className="status-badge status-badge-neutral">
                          {entry.recoveryLabel}
                        </span>
                        <span className="status-badge status-badge-neutral">
                          {entry.sourceLabel}
                        </span>
                      </div>
                      <div className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
                        {formatOverviewDate(entry.createdAt)}
                      </div>
                      {entry.detail ? (
                        <div className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
                          {entry.detail}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* ── Area 1.5: 却下パターン分析 ── */}
      {props.usefulness.rejectedCount >= 3 && props.usefulness.approvalRate < 0.7 ? (
        <RejectionPatternCard tasks={props.tasks} />
      ) : null}

      {/* ── Area 2: 最近の作成履歴 ── */}
      <div className="card">
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3 border-b border-[var(--line)]">
          <div>
            <div className="section-title">最近の作成履歴</div>
            <p className="caption-text mt-0.5">AIが作成した結果や下書きの一覧です。</p>
          </div>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {recentTasks.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="body-text text-[var(--text-subtle)]">まだ依頼結果が作成されていません</p>
              <p className="caption-text mt-1">「新しく作成する」から最初の依頼を試してみてください。</p>
              <button
                type="button"
                className="btn mt-3"
                onClick={props.onOpenCreate}
                disabled={props.loading}
              >
                下書きを作る →
              </button>
            </div>
          ) : (
            recentTasks.map((task) => {
              const statusCopy = getAgentTaskStatusCopy(task.status);
              const used = task.auditLogs.some(
                (log) =>
                  log.action === AGENT_TASK_AUDIT_ACTION.POSTING_COMPOSE_OPENED ||
                  log.action === AGENT_TASK_AUDIT_ACTION.SETTLEMENT_DRAFT_APPLIED ||
                  log.action === AGENT_TASK_AUDIT_ACTION.OUTPUT_COPIED
              );
              return (
                <button
                  key={task.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-subtle)] disabled:opacity-50"
                  onClick={() => props.onOpenTaskInInbox(task.taskType)}
                  disabled={props.loading}
                  title="受信トレイで確認する"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[var(--text)] truncate">
                      {getAgentTaskTypeCopy(task.taskType).label}
                    </div>
                    <div className="caption-text mt-0.5">{task.createdAt}</div>
                  </div>
                  <span
                    className="flex shrink-0 items-center gap-1"
                  >
                    {used ? (
                      <span className="status-badge status-badge-ok">使われた</span>
                    ) : null}
                    <span
                      className={`status-badge ${
                        task.status === "WAITING_APPROVAL"
                          ? "status-badge-warn"
                          : task.status === "APPROVED"
                            ? "status-badge-ok"
                            : task.status === "REJECTED"
                              ? "status-badge-error"
                              : "status-badge-neutral"
                      }`}
                    >
                      {statusCopy.label}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
        {recentTasks.length > 0 ? (
          <div className="px-4 py-3 border-t border-[var(--line)]">
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => props.onOpenInbox()}
              disabled={props.loading}
            >
              すべての履歴を見る →
            </button>
          </div>
        ) : null}
      </div>

      {/* ── Area 3: AIの担当一覧 ── */}
      <div className="card overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-[var(--line)]">
          <div className="section-title">AIの担当一覧</div>
          <p className="caption-text mt-0.5">担当を選んで下書きを作れます。</p>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {roleChoices.map((role) => {
            const roleUsefulness = roleUsefulnessMap.get(role.roleId) ?? null;

            return (
              <div key={role.roleId} className="flex items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--text)]">{role.label}</span>
                    <span className="status-badge status-badge-neutral">{role.taskChoices.length}種類</span>
                    {roleUsefulness?.usedCount ? (
                      <span className="status-badge status-badge-ok">
                        利用 {roleUsefulness.usedCount}
                      </span>
                    ) : null}
                    {roleUsefulness?.waitingApprovalCount ? (
                      <span className="status-badge status-badge-warn">
                        承認待ち {roleUsefulness.waitingApprovalCount}
                      </span>
                    ) : null}
                  </div>
                  <div className="caption-text mt-0.5">
                    {role.roleHelper}
                    {roleUsefulness?.trackedReadyCount
                      ? ` / 活用率 ${(roleUsefulness.usedRate * 100).toFixed(0)}%`
                      : ""}
                  </div>
                  {roleUsefulness &&
                  roleUsefulness.trackedReadyCount >= 2 &&
                  roleUsefulness.usedRate < 0.3 ? (
                    <div className="mt-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                      採択率が低め（{(roleUsefulness.usedRate * 100).toFixed(0)}%）。
                      承認後に投稿・メモ・コピーへ反映させると活用率がカウントされます。
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="btn-secondary shrink-0"
                  onClick={() => props.onOpenCreateForRole(role.roleId)}
                  disabled={props.loading}
                >
                  下書きを作る
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
