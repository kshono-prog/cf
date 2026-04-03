"use client";

import {
  ManagerDeskRefreshingNotice,
  ManagerDeskStaleDataNotice,
} from "@/components/managerDesk/ManagerDeskQueryFeedback";
import {
  WorkspaceEmptyState,
  WorkspaceLoadingCard,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import type {
  MissingItem,
  MissingItemsData,
  MissingItemSeverity,
} from "@/lib/operations/missingItemsTypes";

type Props = {
  loading: boolean;
  error: string | null;
  data: MissingItemsData | null;
};

function severityBadgeClass(severity: MissingItemSeverity): string {
  switch (severity) {
    case "HIGH":
      return "status-badge status-badge-error";
    case "MEDIUM":
      return "status-badge status-badge-warn";
    default:
      return "status-badge status-badge-neutral";
  }
}

function severityLabel(severity: MissingItemSeverity): string {
  switch (severity) {
    case "HIGH":
      return "要対応";
    case "MEDIUM":
      return "確認";
    default:
      return "低優先";
  }
}

function categoryLabel(category: MissingItem["category"]): string {
  switch (category) {
    case "NOTE_FOLLOW_UP_NO_DUE_DATE":
      return "期限未設定";
    case "NOTE_FOLLOW_UP_OVERDUE":
      return "期限超過";
    case "CONTACT_NO_NEXT_ACTION":
      return "次アクション未設定";
    case "CONTACT_NEXT_ACTION_OVERDUE":
      return "次アクション期限超過";
    case "MEETING_NO_AGENDA":
      return "アジェンダ未設定";
    case "MEETING_NO_FOLLOW_UP":
      return "フォローアップ未記録";
  }
}

function entityTypeLabel(entityType: MissingItem["entityType"]): string {
  switch (entityType) {
    case "MANAGER_NOTE":
      return "Note";
    case "EXTERNAL_CONTACT":
      return "Contact";
    case "MEETING":
      return "Meeting";
  }
}

function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
  });
}

function SummaryChip(props: { label: string; value: string; tone?: "high" | "warn" | "default" }) {
  const toneClass =
    props.tone === "high"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : props.tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-slate-200 bg-slate-50 text-slate-800";
  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <div className="text-[10px] uppercase tracking-[0.14em] text-current opacity-60">
        {props.label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{props.value}</div>
    </div>
  );
}

function MissingItemRow(props: { item: MissingItem }) {
  const { item } = props;
  return (
    <li className="flex items-start gap-3 py-3">
      <div className="mt-0.5 flex shrink-0 flex-col items-center gap-1">
        <span className={severityBadgeClass(item.severity)}>
          {severityLabel(item.severity)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
          <span>{entityTypeLabel(item.entityType)}</span>
          <span>·</span>
          <span>{categoryLabel(item.category)}</span>
          <span>·</span>
          <span className="font-medium text-slate-700">{item.creatorName}</span>
          {item.dueAt ? (
            <>
              <span>·</span>
              <span>{formatDate(item.dueAt)}</span>
            </>
          ) : null}
        </div>
        <div className="mt-1 text-sm font-semibold text-slate-950">{item.title}</div>
        <p className="mt-0.5 text-xs leading-5 text-slate-600">{item.detail}</p>
      </div>
    </li>
  );
}

export function ManagerDeskMissingItemsSection(props: Props) {
  const { data } = props;

  return (
    <section className="surface-card space-y-4 p-5 sm:p-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
          Missing Items
        </div>
        <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">
          記録の抜け・期限切れを検出
        </h2>
        <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
          Note フォローアップ / 対外接点の次アクション / ミーティング準備の記録が欠けている箇所を一覧します。
        </p>
      </div>

      {props.loading && !data ? (
        <WorkspaceLoadingCard
          title="記録の抜けを確認しています"
          description="Note・Contact・Meeting のシグナルを横断してギャップを検出しています。"
        />
      ) : null}

      {props.loading && data ? (
        <ManagerDeskRefreshingNotice
          title="記録の抜けを更新しています"
          description="前回の一覧を残したまま、最新の missing items を再確認しています。"
        />
      ) : null}

      {props.error && !data ? (
        <WorkspaceStatusNotice
          tone="error"
          title="Missing Items の取得に失敗しました"
          description="接続状態を確認してから、もう一度試してください。"
        />
      ) : null}

      {props.error && data ? (
        <ManagerDeskStaleDataNotice
          title="最新の Missing Items を更新できませんでした"
          description="前回の一覧を表示しています。時間をおいて再読み込みしてください。"
        />
      ) : null}

      {data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SummaryChip
              label="合計"
              value={String(data.summary.totalCount)}
            />
            <SummaryChip
              label="要対応"
              value={String(data.summary.highCount)}
              tone={data.summary.highCount > 0 ? "high" : "default"}
            />
            <SummaryChip
              label="確認"
              value={String(data.summary.mediumCount)}
              tone={data.summary.mediumCount > 0 ? "warn" : "default"}
            />
            <SummaryChip
              label="低優先"
              value={String(data.summary.lowCount)}
            />
          </div>

          {data.summary.byCreator.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.summary.byCreator.map((c) => (
                <span key={c.creatorProfileId} className="status-badge status-badge-neutral">
                  {c.creatorName} {c.count}件
                </span>
              ))}
            </div>
          ) : null}

          {data.items.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {data.items.map((item) => (
                <MissingItemRow key={item.id} item={item} />
              ))}
            </ul>
          ) : (
            <WorkspaceEmptyState
              title="記録の抜けは検出されませんでした"
              description="Note・Contact・Meeting のフォローアップと期限はすべて適切に設定されています。"
            />
          )}
        </div>
      ) : null}

      {!props.loading && !props.error && !data ? (
        <WorkspaceEmptyState
          title="担当 Creator がまだ割り当てられていません"
          description="ManagerAssignment が追加されると、ここで記録の抜けを検出します。"
        />
      ) : null}
    </section>
  );
}
