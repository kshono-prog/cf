"use client";

import Link from "next/link";

import { useAccount } from "wagmi";

import { MyPageShell } from "@/components/mypage/MyPageShell";
import {
  WorkspaceEmptyState,
  WorkspaceLoadingCard,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import { useManagerDeskCreatorDetail } from "@/components/managerDesk/useManagerDeskCreatorDetail";
import type { ManagerDeskCreatorDetailData } from "@/lib/managerDesk/readModelTypes";
import type { PlannerTimelineItem } from "@/lib/operations/plannerTypes";

function formatDateTime(value: string | null): string {
  if (!value) return "未設定";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未設定";
  return date.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(value: number, currency: "JPYC" | "USDC"): string {
  return `${value.toLocaleString("ja-JP")} ${currency}`;
}

function formatStaleLabel(days: number | null): string {
  if (days == null) return "最近の動きは未記録";
  if (days <= 0) return "今日動きあり";
  if (days === 1) return "1日停滞";
  return `${days}日停滞`;
}

function roleLabel(roleType: string | null): string {
  if (roleType === "PRIMARY") return "主担当";
  if (roleType === "SUPPORTING") return "副担当";
  return "担当未設定";
}

type NextActionItem = {
  key: string;
  title: string;
  description: string;
  dueAt: string | null;
  tone: "attention" | "info";
};

function buildNextActions(data: ManagerDeskCreatorDetailData): NextActionItem[] {
  const items: NextActionItem[] = [];

  const followUpNotes = data.latestManagerNotes
    .filter((note) => note.followUpNeeded)
    .slice(0, 2);
  for (const note of followUpNotes) {
    items.push({
      key: `note-${note.id}`,
      title: `Manager Note follow-up: ${note.title}`,
      description:
        note.aiSummary ?? note.body.slice(0, 100) ?? "次回確認事項として残っています。",
      dueAt: note.followUpDueAt,
      tone: "attention",
    });
  }

  const actionContacts = data.keyContacts
    .filter((contact) => contact.nextAction || contact.nextActionDueAt)
    .slice(0, 2);
  for (const contact of actionContacts) {
    items.push({
      key: `contact-${contact.id}`,
      title: `${contact.organizationName} への次アクション`,
      description:
        contact.nextAction ?? "接点の更新と温度感確認を進めてください。",
      dueAt: contact.nextActionDueAt,
      tone: "info",
    });
  }

  if (
    data.activeProject &&
    data.activeProject.achievedAt == null &&
    data.activeProject.deadline
  ) {
    items.push({
      key: `project-${data.activeProject.projectId}`,
      title: `${data.activeProject.title} の期限確認`,
      description:
        data.activeProject.targetAmount != null
          ? `進捗 ${data.activeProject.progressPct.toFixed(0)}% / 目標 ${formatAmount(
              data.activeProject.targetAmount,
              data.activeProject.currency
            )}`
          : "goal 進捗の確認が必要です。",
      dueAt: data.activeProject.deadline,
      tone: "attention",
    });
  }

  if (items.length === 0 && data.summary.latestActionTitle) {
    items.push({
      key: "latest-action",
      title: "まずは直近の動きを確認する",
      description: data.summary.latestActionTitle,
      dueAt: data.summary.nextActionDueAt,
      tone: "info",
    });
  }

  return items.slice(0, 4);
}

function buildOperatingSummary(data: ManagerDeskCreatorDetailData): string[] {
  const items: string[] = [];

  if (data.activeProject) {
    items.push(
      `${data.activeProject.title} が進行中です。進捗は ${data.activeProject.progressPct.toFixed(
        0
      )}% です。`
    );
  } else {
    items.push("進行中の Project はまだありません。");
  }

  if (data.summary.riskNoteCount > 0) {
    items.push(`Risk note が ${data.summary.riskNoteCount} 件あります。`);
  }

  if (data.summary.followUpNoteCount > 0) {
    items.push(
      `Manager follow-up が ${data.summary.followUpNoteCount} 件残っています。`
    );
  }

  if (data.summary.contactActionCount > 0) {
    items.push(
      `対外接点の次アクションが ${data.summary.contactActionCount} 件あります。`
    );
  }

  if (items.length === 0 && data.summary.latestActionTitle) {
    items.push(`直近の動きは「${data.summary.latestActionTitle}」です。`);
  }

  return items.slice(0, 4);
}

function plannerStatusBadgeClass(status: PlannerTimelineItem["status"]): string {
  if (status === "OVERDUE") return "status-badge status-badge-error";
  if (status === "DUE_SOON") return "status-badge status-badge-warn";
  return "status-badge status-badge-neutral";
}

function plannerStatusLabel(status: PlannerTimelineItem["status"]): string {
  if (status === "OVERDUE") return "期限超過";
  if (status === "DUE_SOON") return "近日中";
  return "予定";
}

function plannerOwnerLabel(owner: PlannerTimelineItem["owner"]): string {
  if (owner === "CREATOR") return "Creator";
  if (owner === "MANAGER") return "Manager";
  return "Shared";
}

function plannerSourceLabel(source: PlannerTimelineItem["sourceType"]): string {
  switch (source) {
    case "MEETING":
      return "Meeting";
    case "MANAGER_NOTE_FOLLOW_UP":
      return "Follow-up";
    case "EXTERNAL_CONTACT_NEXT_ACTION":
      return "Contact";
    case "PROJECT_DEADLINE":
      return "Goal deadline";
  }
}

export function ManagerDeskCreatorDetailPreviewClient(props: {
  creatorProfileId: string;
}) {
  const { address, isConnected } = useAccount();
  const { loading, error, data, reload } = useManagerDeskCreatorDetail({
    creatorProfileId: props.creatorProfileId,
    address,
    isConnected,
  });

  const nextActions = data ? buildNextActions(data) : [];
  const operatingSummary = data ? buildOperatingSummary(data) : [];

  return (
    <MyPageShell headerColor="#0f172a">
      <div className="container-narrow space-y-4">
        <section className="surface-card space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">
                Creator Detail
              </div>
              <h1 className="text-2xl font-semibold text-[var(--text)]">
                1 Creator の現在地をまとめて確認する
              </h1>
              <p className="text-sm leading-6 text-[var(--text-subtle)]">
                進捗、次アクション、Manager Note、External Contact、Action Log を
                分断せずに読み、次の会議や follow-up に備えるための detail 面です。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/manager-desk"
                className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 transition hover:border-gray-400"
              >
                Dashboard に戻る
              </Link>
              {data ? (
                <Link
                  href={`/${data.creator.username}`}
                  className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 transition hover:border-gray-400"
                >
                  公開ページを見る
                </Link>
              ) : null}
            </div>
          </div>

          <WorkspaceStatusNotice
            tone="success"
            title="Meeting / Planner minimum を接続しました"
            description="会議、共有 follow-up、対外 next action、goal deadline を 1 つの timeline として確認できます。"
          />

          {!isConnected ? (
            <WorkspaceStatusNotice
              tone="info"
              title="ウォレット接続後に Creator Detail を読み込みます"
              description="creator owner または assigned manager のみが閲覧できます。"
            />
          ) : null}

          {loading ? (
            <WorkspaceLoadingCard
              title="Creator Detail を読み込んでいます"
              description="最新の note、contact、action log を集約しています。"
            />
          ) : null}

          {error ? (
            <WorkspaceStatusNotice
              tone="error"
              title="Creator Detail の取得に失敗しました"
              description="権限または接続状態を確認してから、もう一度試してください。"
              onRetry={() => {
                void reload();
              }}
            />
          ) : null}

          {data ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[1.2fr,0.8fr]">
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="status-badge status-badge-neutral">
                      {roleLabel(data.assignment?.roleType ?? null)}
                    </span>
                    {data.creator.creatorType ? (
                      <span className="status-badge status-badge-neutral">
                        {data.creator.creatorType}
                      </span>
                    ) : null}
                    <span className="status-badge status-badge-neutral">
                      {formatStaleLabel(data.summary.staleDays)}
                    </span>
                  </div>
                  <div className="mt-3 text-lg font-semibold text-[var(--text)]">
                    {data.creator.displayName || data.creator.username}
                  </div>
                  <div className="text-sm text-[var(--text-subtle)]">
                    @{data.creator.username}
                  </div>
                  <div className="mt-3 text-sm leading-6 text-[var(--text-subtle)]">
                    {data.creator.profileText ?? "プロフィール文はまだありません。"}
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                    Current Summary
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-[var(--text-subtle)]">
                    <div>最終アクション: {formatDateTime(data.summary.latestActionAt)}</div>
                    <div>
                      次アクション期限: {formatDateTime(data.summary.nextActionDueAt)}
                    </div>
                    <div>
                      現在の論点: {data.summary.latestActionTitle ?? "まだ整理前です"}
                    </div>
                    <div>Risk note: {data.summary.riskNoteCount}</div>
                    <div>Follow-up: {data.summary.followUpNoteCount}</div>
                    <div>Contact action: {data.summary.contactActionCount}</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.25fr,0.75fr]">
                <section className="rounded-2xl border border-[var(--line)] bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                    Project / Goal
                  </div>
                  {data.activeProject ? (
                    <div className="mt-3 space-y-3">
                      <div>
                        <div className="text-sm font-semibold text-[var(--text)]">
                          {data.activeProject.title}
                        </div>
                        <div className="mt-1 text-sm text-[var(--text-subtle)]">
                          {data.activeProject.progressPct.toFixed(0)}% ・{" "}
                          {formatAmount(
                            data.activeProject.confirmedAmount,
                            data.activeProject.currency
                          )}
                          {data.activeProject.targetAmount != null
                            ? ` / ${formatAmount(
                                data.activeProject.targetAmount,
                                data.activeProject.currency
                              )}`
                            : ""}
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                        <div
                          className="h-full rounded-full bg-slate-900"
                          style={{
                            width: `${Math.max(
                              6,
                              Math.min(100, data.activeProject.progressPct)
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-[var(--text-subtle)]">
                        <span className="status-badge status-badge-neutral">
                          {data.activeProject.status}
                        </span>
                        {data.activeProject.deadline ? (
                          <span>期限 {formatDateTime(data.activeProject.deadline)}</span>
                        ) : null}
                        {data.activeProject.achievedAt ? (
                          <span>達成 {formatDateTime(data.activeProject.achievedAt)}</span>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-[var(--text-subtle)]">
                      まだ進行中の Project はありません。
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-[var(--line)] bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                    Operating Summary
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-[var(--text-subtle)]">
                    {operatingSummary.map((item) => (
                      <li key={item}>・{item}</li>
                    ))}
                  </ul>
                </section>
              </div>

              <section className="rounded-2xl border border-[var(--line)] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                    Next Actions
                  </div>
                  <div className="text-xs text-[var(--text-subtle)]">
                    Planner と併用する判断メモ
                  </div>
                </div>
                {nextActions.length > 0 ? (
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {nextActions.map((item) => (
                      <article
                        key={item.key}
                        className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`status-badge ${
                              item.tone === "attention"
                                ? "status-badge-warn"
                                : "status-badge-neutral"
                            }`}
                          >
                            {item.tone === "attention" ? "優先" : "確認"}
                          </span>
                          <span className="text-xs text-[var(--text-subtle)]">
                            期限 {formatDateTime(item.dueAt)}
                          </span>
                        </div>
                        <div className="mt-2 text-sm font-semibold text-[var(--text)]">
                          {item.title}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
                          {item.description}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <WorkspaceEmptyState
                    compact
                    title="次アクションはまだ自動抽出されていません"
                    description="shared timeline に出てくる follow-up から次の実務をまとめます。"
                  />
                )}
              </section>

              <section className="rounded-2xl border border-[var(--line)] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                    Upcoming / Planner
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-[var(--text-subtle)]">
                    <span className="status-badge status-badge-error">
                      overdue {data.planner.summary.overdueCount}
                    </span>
                    <span className="status-badge status-badge-warn">
                      due soon {data.planner.summary.dueSoonCount}
                    </span>
                    <span className="status-badge status-badge-neutral">
                      meetings {data.planner.summary.meetingCount}
                    </span>
                  </div>
                </div>
                {data.planner.items.length > 0 ? (
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {data.planner.items.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={plannerStatusBadgeClass(item.status)}>
                            {plannerStatusLabel(item.status)}
                          </span>
                          <span className="status-badge status-badge-neutral">
                            {plannerSourceLabel(item.sourceType)}
                          </span>
                          <span className="status-badge status-badge-neutral">
                            {plannerOwnerLabel(item.owner)}
                          </span>
                        </div>
                        <div className="mt-2 text-sm font-semibold text-[var(--text)]">
                          {item.title}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
                          {item.description}
                        </div>
                        <div className="mt-2 text-xs text-[var(--text-subtle)]">
                          期限 {formatDateTime(item.dueAt)}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <WorkspaceEmptyState
                    compact
                    title="直近の予定はまだありません"
                    description="Meeting や follow-up が記録されると、この面に時系列で並びます。"
                  />
                )}
              </section>

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-2xl border border-[var(--line)] bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                    Latest Notes
                  </div>
                  {data.latestManagerNotes.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {data.latestManagerNotes.map((note) => (
                        <article
                          key={note.id}
                          className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="status-badge status-badge-neutral">
                              {note.noteType}
                            </span>
                            {note.followUpNeeded ? (
                              <span className="status-badge status-badge-warn">
                                follow-up
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-2 text-sm font-semibold text-[var(--text)]">
                            {note.title}
                          </div>
                          <div className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
                            {note.aiSummary ?? note.body}
                          </div>
                          <div className="mt-2 text-xs text-[var(--text-subtle)]">
                            {formatDateTime(note.updatedAt)}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <WorkspaceEmptyState
                      compact
                      title="Manager Note はまだありません"
                      description="現場の文脈や follow-up がここに並びます。"
                    />
                  )}
                </section>

                <section className="rounded-2xl border border-[var(--line)] bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                    Key Contacts
                  </div>
                  {data.keyContacts.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {data.keyContacts.map((contact) => (
                        <article
                          key={contact.id}
                          className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="status-badge status-badge-neutral">
                              {contact.contactType}
                            </span>
                            <span className="status-badge status-badge-neutral">
                              {contact.status}
                            </span>
                          </div>
                          <div className="mt-2 text-sm font-semibold text-[var(--text)]">
                            {contact.organizationName}
                          </div>
                          <div className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
                            {contact.nextAction ?? "次アクションはまだ設定されていません。"}
                          </div>
                          <div className="mt-2 text-xs text-[var(--text-subtle)]">
                            温度感 {contact.temperature} / 期限{" "}
                            {formatDateTime(contact.nextActionDueAt)}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <WorkspaceEmptyState
                      compact
                      title="External Contact はまだありません"
                      description="会場、主催者、メディアなどの接点がここに並びます。"
                    />
                  )}
                </section>
              </div>

              <section className="rounded-2xl border border-[var(--line)] bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                  Recent Action Log
                </div>
                {data.recentActionLogs.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {data.recentActionLogs.map((log) => (
                      <article
                        key={log.id}
                        className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="status-badge status-badge-neutral">
                            {log.actorType}
                          </span>
                          <span className="status-badge status-badge-neutral">
                            {log.actionType}
                          </span>
                        </div>
                        <div className="mt-2 text-sm font-semibold text-[var(--text)]">
                          {log.title}
                        </div>
                        {log.summary ? (
                          <div className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
                            {log.summary}
                          </div>
                        ) : null}
                        <div className="mt-2 text-xs text-[var(--text-subtle)]">
                          {formatDateTime(log.occurredAt)}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <WorkspaceEmptyState
                    compact
                    title="Action Log はまだありません"
                    description="監査と振り返りの基盤がここに積み上がります。"
                  />
                )}
              </section>

              <section className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-muted)] p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                  Coming Next
                </div>
                <div className="mt-2 text-sm leading-6 text-[var(--text-subtle)]">
                  次の slice では、Meeting の決定事項を structured task に落とし込み、
                  Creator Home と Manager Desk の両方で shared timeline を更新できるようにします。
                </div>
              </section>
            </div>
          ) : null}
        </section>
      </div>
    </MyPageShell>
  );
}
