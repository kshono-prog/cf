"use client";

import Link from "next/link";

import { useAccount } from "wagmi";

import { ManagerDeskAiSuggestionsSection } from "@/components/managerDesk/ManagerDeskAiSuggestionsSection";
import { ManagerDeskAuthRequiredNotice } from "@/components/managerDesk/ManagerDeskAuthRequiredNotice";
import { ManagerDeskMissingItemsSection } from "@/components/managerDesk/ManagerDeskMissingItemsSection";
import {
  ManagerDeskRefreshingNotice,
  ManagerDeskStaleDataNotice,
} from "@/components/managerDesk/ManagerDeskQueryFeedback";
import { useManagerDeskAccessState } from "@/components/managerDesk/useManagerDeskAccessState";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import {
  WorkspaceEmptyState,
  WorkspaceLoadingCard,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import { useManagerDeskDashboard } from "@/components/managerDesk/useManagerDeskDashboard";
import { useManagerDeskMissingItems } from "@/components/managerDesk/useManagerDeskMissingItems";
import type { ManagerDeskDashboardCard } from "@/lib/managerDesk/readModelTypes";
import {
  buildManagerDeskDashboardAiSuggestions,
  buildManagerDeskDashboardAiSummary,
} from "@/lib/operations/managerDeskAiAssistance";

function formatRelativeDays(days: number | null): string {
  if (days == null) return "最新アクション不明";
  if (days <= 0) return "今日動きあり";
  if (days === 1) return "1日停滞";
  return `${days}日停滞`;
}

function formatGeneratedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "更新時刻不明";
  return date.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function priorityBadgeClass(level: ManagerDeskDashboardCard["priority"]["level"]): string {
  if (level === "HIGH") return "status-badge status-badge-error";
  if (level === "MEDIUM") return "status-badge status-badge-warn";
  return "status-badge status-badge-neutral";
}

function formatAmount(value: number, currency: "JPYC" | "USDC"): string {
  return `${value.toLocaleString("ja-JP")} ${currency}`;
}

const secondaryActionClassName = "btn-secondary justify-center text-sm";

function progressLabel(card: ManagerDeskDashboardCard): string {
  if (!card.activeProject) return "進行中の Project はまだありません";
  if (card.activeProject.targetAmount == null) {
    return `確認済み ${formatAmount(
      card.activeProject.confirmedAmount,
      card.activeProject.currency
    )}`;
  }
  return `${card.activeProject.progressPct.toFixed(0)}% ・ ${formatAmount(
    card.activeProject.confirmedAmount,
    card.activeProject.currency
  )} / ${formatAmount(
    card.activeProject.targetAmount,
    card.activeProject.currency
  )}`;
}

function SummaryMetric(props: {
  label: string;
  value: string;
  tone?: "default" | "high";
}) {
  const toneClass =
    props.tone === "high"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : "border-[var(--line)] bg-[var(--surface)] text-[var(--text)]";
  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-subtle)]">
        {props.label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{props.value}</div>
    </div>
  );
}

function DashboardCard(props: { card: ManagerDeskDashboardCard }) {
  const { card } = props;
  const creatorName = card.creator.displayName || card.creator.username;
  const publicHref = `/${card.creator.username}`;
  const detailHref = `/manager-desk/creators/${card.creator.id}`;

  return (
    <article className="surface-card space-y-4 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={priorityBadgeClass(card.priority.level)}>
              {card.priority.level === "HIGH"
                ? "優先度 高"
                : card.priority.level === "MEDIUM"
                  ? "優先度 中"
                  : "優先度 低"}
            </span>
            <span className="status-badge status-badge-neutral">
              {card.assignment.roleType === "PRIMARY" ? "主担当" : "副担当"}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-[var(--text)]">
            {creatorName}
          </h2>
          <div className="text-sm text-[var(--text-subtle)]">
            @{card.creator.username}
          </div>
        </div>

        <div className="text-left text-xs text-[var(--text-subtle)] sm:text-right">
          <div>{formatRelativeDays(card.staleDays)}</div>
          <div className="mt-1">
            {card.latestActionAt
              ? `最終更新 ${formatGeneratedAt(card.latestActionAt)}`
              : "最終更新なし"}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1.3fr,1fr]">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
            進行中 Project
          </div>
          {card.activeProject ? (
            <div className="mt-2 space-y-2">
              <div className="text-sm font-semibold text-[var(--text)]">
                {card.activeProject.title}
              </div>
              <div className="text-sm text-[var(--text-subtle)]">
                {progressLabel(card)}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-[var(--text-subtle)]">
                <span className="status-badge status-badge-neutral">
                  {card.activeProject.status}
                </span>
                {card.activeProject.deadline ? (
                  <span>期限 {formatGeneratedAt(card.activeProject.deadline)}</span>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-[var(--text-subtle)]">
              まだ進行中の Project がありません。
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
            対応シグナル
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="status-badge status-badge-neutral">
              Risk {card.riskNoteCount}
            </span>
            <span className="status-badge status-badge-warn">
              Follow-up {card.followUpNoteCount}
            </span>
            <span className="status-badge status-badge-neutral">
              Contact {card.contactActionCount}
            </span>
          </div>
          <div className="mt-3 text-sm text-[var(--text-subtle)]">
            {card.latestActionTitle
              ? `直近の動き: ${card.latestActionTitle}`
              : "直近の動きはまだ記録されていません。"}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
            最新 Manager Note
          </div>
          {card.latestManagerNote ? (
            <div className="mt-2 space-y-2">
              <div className="text-sm font-semibold text-[var(--text)]">
                {card.latestManagerNote.title}
              </div>
              <div className="line-clamp-3 text-sm leading-6 text-[var(--text-subtle)]">
                {card.latestManagerNote.aiSummary ?? card.latestManagerNote.body}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-[var(--text-subtle)]">
                <span className="status-badge status-badge-neutral">
                  {card.latestManagerNote.noteType}
                </span>
                {card.latestManagerNote.followUpDueAt ? (
                  <span>期限 {formatGeneratedAt(card.latestManagerNote.followUpDueAt)}</span>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-[var(--text-subtle)]">
              Manager Note はまだありません。
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
            次の外部連絡
          </div>
          {card.nextContact ? (
            <div className="mt-2 space-y-2">
              <div className="text-sm font-semibold text-[var(--text)]">
                {card.nextContact.organizationName}
              </div>
              <div className="text-sm text-[var(--text-subtle)]">
                {card.nextContact.nextAction ?? "次アクションはまだ設定されていません。"}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-[var(--text-subtle)]">
                <span className="status-badge status-badge-neutral">
                  {card.nextContact.status}
                </span>
                <span className="status-badge status-badge-neutral">
                  温度感 {card.nextContact.temperature}
                </span>
                {card.nextContact.nextActionDueAt ? (
                  <span>期限 {formatGeneratedAt(card.nextContact.nextActionDueAt)}</span>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-[var(--text-subtle)]">
              対外接点はまだ登録されていません。
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
          優先理由
        </div>
        {card.priority.reasons.length > 0 ? (
          <ul className="space-y-1 text-sm text-[var(--text-subtle)]">
            {card.priority.reasons.map((reason) => (
              <li key={reason}>・{reason}</li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-[var(--text-subtle)]">
            直近では強いアラートはありません。
          </div>
        )}
      </div>

      <div className="grid gap-2 sm:flex sm:flex-wrap">
        <Link
          href={detailHref}
          className="btn-raised btn-raised-sm justify-center"
        >
          Creator Detail
        </Link>
        <Link
          href={`/manager-desk/activity?creatorProfileId=${card.creator.id}`}
          className={secondaryActionClassName}
        >
          Activity Timeline
        </Link>
        <Link
          href={publicHref}
          className={secondaryActionClassName}
        >
          公開ページを見る
        </Link>
      </div>
    </article>
  );
}

export function ManagerDeskDashboardClient() {
  const { address, isConnected } = useAccount();
  const access = useManagerDeskAccessState({ isConnected });
  const { loading, error, data, reload } = useManagerDeskDashboard({
    address,
    isConnected: access.canReadProtectedData,
  });
  const missingItems = useManagerDeskMissingItems({
    address,
    isConnected: access.canReadProtectedData,
  });
  const aiSummary = data ? buildManagerDeskDashboardAiSummary(data) : null;
  const aiSuggestions = data ? buildManagerDeskDashboardAiSuggestions(data) : [];
  const isInitialLoading = access.authChecking || (loading && !data);
  const isRefreshing = !access.authChecking && loading && Boolean(data);
  const hasBlockingError = Boolean(error && !data);
  const hasStaleError = Boolean(error && data);

  return (
    <MyPageShell headerColor="#0f172a" showPromo={false}>
      <div className="container-narrow space-y-4">
        <section className="surface-card space-y-4 p-5 sm:p-6">
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">
              Manager Desk
            </div>
            <h1 className="text-2xl font-semibold text-[var(--text)]">
              複数 Creator の進行をまとめて見る
            </h1>
            <p className="text-sm leading-6 text-[var(--text-subtle)]">
              first slice では、担当 Creator の優先度、止まり、対外フォロー、
              Manager Note の最新状況を 1 画面で見渡せるようにしています。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Link
              href="/manager-desk/contacts"
              className={secondaryActionClassName}
            >
              Contact Pipeline
            </Link>
            <Link
              href="/manager-desk/notes"
              className={secondaryActionClassName}
            >
              Notes Surface
            </Link>
            <Link
              href="/manager-desk/activity"
              className={secondaryActionClassName}
            >
              Activity Timeline
            </Link>
            <Link
              href="/manager-desk/opportunities"
              className={secondaryActionClassName}
            >
              Opportunity CRM
            </Link>
          </div>

          {!isConnected ? (
            <WorkspaceStatusNotice
              tone="info"
              title="ウォレット接続後に Manager Desk を読み込みます"
              description="manager assignment に紐づく Creator だけを安全に表示します。"
            />
          ) : null}

          {access.authRequired ? (
            <ManagerDeskAuthRequiredNotice
              authenticating={access.authChecking}
              onAuthenticate={access.authenticate}
            />
          ) : null}

          {isInitialLoading ? (
            <WorkspaceLoadingCard
              title="Manager Desk を読み込んでいます"
              description="担当 Creator の進捗とフォロー状況、認証状態を集約しています。"
            />
          ) : null}

          {isRefreshing ? (
            <ManagerDeskRefreshingNotice
              title="最新の担当状況を反映しています"
              description="前回の dashboard を表示したまま、priority と follow-up を更新しています。"
            />
          ) : null}

          {hasBlockingError ? (
            <WorkspaceStatusNotice
              tone="error"
              title="Manager Desk の取得に失敗しました"
              description="接続状態を確認してから、もう一度試してください。"
              onRetry={() => {
                void reload();
              }}
            />
          ) : null}

          {hasStaleError ? (
            <ManagerDeskStaleDataNotice
              title="最新の Manager Desk を更新できませんでした"
              description="前回の dashboard を表示しています。接続状態を確認してから再読み込みしてください。"
              onRetry={() => {
                void reload();
              }}
            />
          ) : null}

          {access.canReadProtectedData ? (
            <ManagerDeskMissingItemsSection
              loading={missingItems.loading}
              error={missingItems.error}
              data={missingItems.data}
            />
          ) : null}

          {data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <SummaryMetric
                  label="担当 Creator"
                  value={String(data.summary.creatorCount)}
                />
                <SummaryMetric
                  label="高優先度"
                  value={String(data.summary.highPriorityCount)}
                  tone={data.summary.highPriorityCount > 0 ? "high" : "default"}
                />
                <SummaryMetric
                  label="要フォロー"
                  value={String(data.summary.followUpCreatorCount)}
                />
                <SummaryMetric
                  label="接点アクション"
                  value={String(data.summary.contactActionCreatorCount)}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-subtle)]">
                <div>
                  今日見るべき Creator を priority 順に並べています。
                </div>
                <div>更新時刻 {formatGeneratedAt(data.generatedAt)}</div>
              </div>

              <ManagerDeskAiSuggestionsSection
                eyebrow="AI Office"
                title="今日の優先対応"
                summary={aiSummary ?? "AI summary を準備中です。"}
                suggestions={aiSuggestions}
                emptyTitle="AI attention はまだありません"
                emptyDescription="priority signal や follow-up が積み上がると、ここに短い実務カードで返します。"
              />

              {data.cards.length > 0 ? (
                <div className="space-y-4">
                  {data.cards.map((card) => (
                    <DashboardCard key={card.assignment.id} card={card} />
                  ))}
                </div>
              ) : (
                <WorkspaceEmptyState
                  title="担当 Creator はまだ割り当てられていません"
                  description="ManagerAssignment が追加されると、ここに優先度つきで並びます。"
                />
              )}
            </div>
          ) : null}
        </section>
      </div>
    </MyPageShell>
  );
}
