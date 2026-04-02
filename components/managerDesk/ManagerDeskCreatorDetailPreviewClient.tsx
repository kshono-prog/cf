"use client";

import Link from "next/link";
import { useState } from "react";

import { useAccount } from "wagmi";

import { ManagerDeskAiManagerReadOnlySection } from "@/components/managerDesk/ManagerDeskAiManagerReadOnlySection";
import { ManagerDeskAiSuggestionsSection } from "@/components/managerDesk/ManagerDeskAiSuggestionsSection";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import {
  WorkspaceEmptyState,
  WorkspaceLoadingCard,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import { useManagerDeskCreatorDetail } from "@/components/managerDesk/useManagerDeskCreatorDetail";
import { useManagerDeskSupporterCrm } from "@/components/managerDesk/useManagerDeskSupporterCrm";
import { ManagerDeskSupporterCrmSection } from "@/components/managerDesk/ManagerDeskSupporterCrmSection";
import { useManagerDeskStageEvidence } from "@/components/managerDesk/useManagerDeskStageEvidence";
import { ManagerDeskStageEvidenceSection } from "@/components/managerDesk/ManagerDeskStageEvidenceSection";
import { useManagerDeskProjectMembers } from "@/components/managerDesk/useManagerDeskProjectMembers";
import { ManagerDeskProjectMembersSection } from "@/components/managerDesk/ManagerDeskProjectMembersSection";
import type { ManagerDeskCreatorDetailData } from "@/lib/managerDesk/readModelTypes";
import {
  buildManagerDeskCreatorDetailAiSuggestions,
  buildManagerDeskCreatorDetailAiSummary,
} from "@/lib/operations/managerDeskAiAssistance";
import type { PlannerTimelineItem } from "@/lib/operations/plannerTypes";
import type { SerializedMeeting } from "@/lib/managerDesk/server";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

const secondaryActionClassName = "btn-secondary justify-center text-sm";
const compactSecondaryActionClassName = "btn-secondary justify-center text-xs";

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

type FollowUpNoteState = "idle" | "loading" | "done" | "error";

function CompletedMeetingCard(props: {
  meeting: SerializedMeeting;
  address: string | undefined;
}) {
  const [noteState, setNoteState] = useState<FollowUpNoteState>("idle");

  async function createFollowUpNote() {
    if (!props.address) return;
    setNoteState("loading");
    try {
      const response = await ownerAuthFetch({
        address: props.address,
        url: `/api/meetings/${props.meeting.id}/follow-up-note`,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: props.address }),
        },
      });
      if (!response.ok) throw new Error("FAILED");
      setNoteState("done");
    } catch {
      setNoteState("error");
    }
  }

  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="status-badge status-badge-neutral">完了</span>
        <span className="status-badge status-badge-neutral">
          {props.meeting.meetingType}
        </span>
      </div>
      <div className="mt-2 text-sm font-semibold text-[var(--text)]">
        {props.meeting.title}
      </div>
      <div className="mt-0.5 text-xs text-[var(--text-subtle)]">
        {formatDateTime(props.meeting.scheduledAt)}
      </div>
      {props.meeting.decisions ? (
        <div className="mt-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
            決定事項
          </div>
          <p className="mt-1 line-clamp-3 text-xs leading-5 text-[var(--text)]">
            {props.meeting.decisions}
          </p>
        </div>
      ) : null}
      {props.meeting.nextActionsSummary ? (
        <div className="mt-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
            次のアクション
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text)]">
            {props.meeting.nextActionsSummary}
          </p>
        </div>
      ) : null}
      <div className="mt-3">
        {noteState === "idle" ? (
          <button
            type="button"
            onClick={() => void createFollowUpNote()}
            className={compactSecondaryActionClassName}
          >
            フォローアップNote作成
          </button>
        ) : noteState === "loading" ? (
          <span className="text-xs text-[var(--text-subtle)]">作成中...</span>
        ) : noteState === "done" ? (
          <span className="text-xs text-emerald-600">Noteを作成しました</span>
        ) : (
          <span className="text-xs text-rose-600">作成に失敗しました</span>
        )}
      </div>
    </article>
  );
}

type MeetingCopilotSaveState = "idle" | "saving" | "saved" | "completing" | "completed" | "error";

function MeetingCopilotCard(props: {
  meeting: SerializedMeeting;
  address: string | undefined;
  onCompleted: (updatedMeeting: SerializedMeeting) => void;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(props.meeting.notes ?? "");
  const [decisions, setDecisions] = useState(props.meeting.decisions ?? "");
  const [nextActions, setNextActions] = useState(props.meeting.nextActionsSummary ?? "");
  const [saveState, setSaveState] = useState<MeetingCopilotSaveState>("idle");
  const [followUpState, setFollowUpState] = useState<FollowUpNoteState>("idle");
  const [showFollowUp, setShowFollowUp] = useState(false);

  async function patchMeeting(extraFields: Record<string, unknown>) {
    if (!props.address) return false;
    const res = await ownerAuthFetch({
      address: props.address,
      url: `/api/meetings/${props.meeting.id}`,
      init: {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: props.address,
          notes: notes.trim() || null,
          decisions: decisions.trim() || null,
          nextActionsSummary: nextActions.trim() || null,
          ...extraFields,
        }),
      },
    });
    return res.ok;
  }

  async function handleSave() {
    setSaveState("saving");
    try {
      const ok = await patchMeeting({});
      setSaveState(ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  }

  async function handleComplete() {
    setSaveState("completing");
    try {
      const ok = await patchMeeting({ status: "COMPLETED" });
      if (ok) {
        setSaveState("completed");
        setShowFollowUp(true);
        props.onCompleted({
          ...props.meeting,
          notes: notes.trim() || null,
          decisions: decisions.trim() || null,
          nextActionsSummary: nextActions.trim() || null,
          status: "COMPLETED",
        });
      } else {
        setSaveState("error");
      }
    } catch {
      setSaveState("error");
    }
  }

  async function handleCreateFollowUpNote() {
    if (!props.address) return;
    setFollowUpState("loading");
    try {
      const res = await ownerAuthFetch({
        address: props.address,
        url: `/api/meetings/${props.meeting.id}/follow-up-note`,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: props.address }),
        },
      });
      setFollowUpState(res.ok ? "done" : "error");
    } catch {
      setFollowUpState("error");
    }
  }

  const isCompleted = saveState === "completed";
  const isBusy = saveState === "saving" || saveState === "completing";

  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="status-badge status-badge-warn">予定</span>
        <span className="status-badge status-badge-neutral">{props.meeting.meetingType}</span>
      </div>
      <div className="mt-2 text-sm font-semibold text-[var(--text)]">{props.meeting.title}</div>
      <div className="mt-0.5 text-xs text-[var(--text-subtle)]">
        {formatDateTime(props.meeting.scheduledAt)}
        {props.meeting.locationText ? ` — ${props.meeting.locationText}` : ""}
      </div>

      {props.meeting.agenda ? (
        <div className="mt-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">アジェンダ</div>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text)]">{props.meeting.agenda}</p>
        </div>
      ) : null}

      {!isCompleted ? (
        <button
          type="button"
          className={`mt-3 ${compactSecondaryActionClassName}`}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "閉じる ↑" : "📝 議事メモを取る ↓"}
        </button>
      ) : null}

      {open && !isCompleted ? (
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
              議事メモ
            </label>
            <textarea
              className="input mt-1 w-full resize-none text-xs"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="会議中のメモ・気づき・状況など"
              disabled={isBusy}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
              決定事項
            </label>
            <textarea
              className="input mt-1 w-full resize-none text-xs"
              rows={2}
              value={decisions}
              onChange={(e) => setDecisions(e.target.value)}
              placeholder="この会議で決まったこと"
              disabled={isBusy}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
              次のアクション
            </label>
            <textarea
              className="input mt-1 w-full resize-none text-xs"
              rows={2}
              value={nextActions}
              onChange={(e) => setNextActions(e.target.value)}
              placeholder="誰が・いつまでに・何をするか"
              disabled={isBusy}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => void handleSave()}
              disabled={isBusy}
            >
              {saveState === "saving" ? "保存中..." : saveState === "saved" ? "✓ 保存済み" : "保存"}
            </button>
            <button
              type="button"
              className="btn text-xs"
              onClick={() => void handleComplete()}
              disabled={isBusy || (!decisions.trim() && !nextActions.trim())}
            >
              {saveState === "completing" ? "完了中..." : "完了にして保存 →"}
            </button>
            {saveState === "error" ? (
              <span className="text-xs text-rose-600">保存に失敗しました</span>
            ) : null}
          </div>
          {(!decisions.trim() && !nextActions.trim()) ? (
            <p className="text-[11px] text-[var(--text-subtle)]">決定事項または次のアクションを入力すると「完了にして保存」が使えます</p>
          ) : null}
        </div>
      ) : null}

      {showFollowUp ? (
        <div className="accent-surface-emerald mt-3 rounded-xl px-3 py-2.5 space-y-2">
          <div className="accent-text-emerald-strong text-xs font-semibold">
            会議が完了しました。フォローアップNoteを作りますか？
          </div>
          <div>
            {followUpState === "idle" ? (
              <button
                type="button"
                className="btn-secondary accent-button-emerald px-3 py-1.5 text-xs"
                onClick={() => void handleCreateFollowUpNote()}
              >
                フォローアップNote作成
              </button>
            ) : followUpState === "loading" ? (
              <span className="text-xs text-[var(--text-subtle)]">作成中...</span>
            ) : followUpState === "done" ? (
              <span className="accent-text-emerald text-xs">✓ Noteを作成しました</span>
            ) : (
              <span className="text-xs text-rose-600">作成に失敗しました</span>
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
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

  const supporterCrm = useManagerDeskSupporterCrm({
    address,
    isConnected,
    creatorProfileId: props.creatorProfileId,
  });

  const stageEvidence = useManagerDeskStageEvidence({
    address,
    isConnected,
    creatorProfileId: props.creatorProfileId,
  });

  const projectMembers = useManagerDeskProjectMembers({
    address,
    isConnected,
    creatorProfileId: props.creatorProfileId,
    projectId: data?.activeProject?.projectId ?? null,
  });

  const [completedFromCopilot, setCompletedFromCopilot] = useState<Set<string>>(new Set());
  const [activeDetailTab, setActiveDetailTab] = useState<"overview" | "ai-manager">("overview");

  const nextActions = data ? buildNextActions(data) : [];
  const operatingSummary = data ? buildOperatingSummary(data) : [];
  const aiSummary = data ? buildManagerDeskCreatorDetailAiSummary(data) : null;
  const aiSuggestions = data
    ? buildManagerDeskCreatorDetailAiSuggestions(data)
    : [];
  const activeUpcomingMeetings = data
    ? data.upcomingMeetings.filter((m) => !completedFromCopilot.has(m.id))
    : [];

  return (
    <MyPageShell headerColor="#0f172a" showPromo={false}>
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
                className={secondaryActionClassName}
              >
                Dashboard に戻る
              </Link>
              <Link
                href={`/manager-desk/activity?creatorProfileId=${props.creatorProfileId}`}
                className={secondaryActionClassName}
              >
                Activity Timeline
              </Link>
              {data ? (
                <Link
                  href={`/${data.creator.username}`}
                  className={secondaryActionClassName}
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
              {/* タブバー */}
              <div className="flex gap-1 rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-1">
                {(
                  [
                    { key: "overview", label: "概要" },
                    { key: "ai-manager", label: "AI Manager" },
                  ] as const
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveDetailTab(key)}
                    className={[
                      "flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      activeDetailTab === key
                        ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
                        : "text-[var(--text-subtle)] hover:text-[var(--text)]",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* AI Manager タブ */}
              {activeDetailTab === "ai-manager" ? (
                <ManagerDeskAiManagerReadOnlySection
                  creatorDisplayName={data.creator.displayName || data.creator.username}
                  viewerRole={data.viewerRole}
                  aiManager={data.aiManager}
                />
              ) : null}

              {/* 概要タブ */}
              {activeDetailTab === "overview" ? (
              <>
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

                <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
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

              {/* AI Manager コンパクトサマリー（概要タブ用） */}
              {data.aiManager ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-[var(--text)]">
                      {data.aiManager.displayName}
                    </span>
                    <span className="status-badge status-badge-neutral text-[11px]">
                      {data.aiManager.status === "ACTIVE"
                        ? "稼働中"
                        : data.aiManager.status === "PAUSED"
                          ? "停止中"
                          : data.aiManager.status}
                    </span>
                    <span className="status-badge status-badge-neutral text-[11px]">
                      {data.aiManager.operatingMode === "BILLABLE_ACTIVE"
                        ? "billable active"
                        : data.aiManager.operatingMode === "FREE_ONLY"
                          ? "free only"
                          : "inactive"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary text-xs py-1 px-3"
                    onClick={() => setActiveDetailTab("ai-manager")}
                  >
                    詳細を見る
                  </button>
                </div>
              ) : null}

              {data.stage ? (
                <>
                <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                    Creator Stage
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(["SEED", "EARLY", "EMERGING", "PROFESSIONALIZING", "ESTABLISHED"] as const).map(
                      (s, i) => {
                        const stageOrder = ["SEED", "EARLY", "EMERGING", "PROFESSIONALIZING", "ESTABLISHED"];
                        const currentIndex = stageOrder.indexOf(data.stage!.stage);
                        const isActive = i === currentIndex;
                        const isPast = i < currentIndex;
                        return (
                          <span
                            key={s}
                            className={[
                              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                              isActive
                                ? "bg-[var(--accent)] text-white"
                                : isPast
                                  ? "bg-[var(--surface-muted)] text-[var(--text-subtle)] line-through"
                                  : "border border-[var(--line)] text-[var(--text-subtle)] opacity-50",
                            ].join(" ")}
                          >
                            {s === "PROFESSIONALIZING" ? "Professional." : s}
                          </span>
                        );
                      }
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--text-subtle)]">
                    {data.stage.stageDescription}
                  </p>
                  {data.stage.nextMilestone ? (
                    <p className="mt-1 text-[11px] text-[var(--text-subtle)] opacity-70">
                      次のステップ: {data.stage.nextMilestone}
                    </p>
                  ) : null}
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {([
                      ["output", "発信量"],
                      ["audience", "支援者"],
                      ["business", "目標達成"],
                      ["continuity", "継続性"],
                      ["craft", "実績"],
                      ["operations", "運営"],
                      ["trust", "信頼"],
                      ["team", "チーム"],
                    ] as const).map(([axis, label]) => (
                      <div key={axis} className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-[var(--text-subtle)]">{label}</span>
                          <span className="font-medium text-[var(--text)]">
                            {data.stage!.maturity[axis]}
                          </span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                          <div
                            className="h-full rounded-full bg-[var(--text-subtle)]"
                            style={{ width: `${data.stage!.maturity[axis]}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                <ManagerDeskStageEvidenceSection
                  address={address}
                  creatorProfileId={props.creatorProfileId}
                  currentStage={data.stage.stage}
                  items={stageEvidence.items}
                  loading={stageEvidence.loading}
                  onItemAdded={stageEvidence.addItem}
                />
                <ManagerDeskProjectMembersSection
                  items={projectMembers.items}
                  loading={projectMembers.loading}
                  error={projectMembers.error}
                  projectId={data.activeProject?.projectId ?? null}
                  address={address}
                  onAdded={projectMembers.addItem}
                />
                </>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-[1.25fr,0.75fr]">
                <section
                  id="project-goal"
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
                >
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
                          className="h-full rounded-full bg-[var(--accent)]"
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

                <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
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

              <ManagerDeskAiSuggestionsSection
                eyebrow="AI Office"
                title="この Creator の attention"
                summary={
                  aiSummary ??
                  "planner / note / contact の signal をもとに、次の実務候補をまとめます。"
                }
                suggestions={aiSuggestions}
                emptyTitle="attention card はまだありません"
                emptyDescription="Meeting や follow-up が積み上がると、ここに短い提案カードで返します。"
              />

              <section
                id="next-actions"
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
              >
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

              <section
                id="planner"
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
              >
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
                        {item.sourceType === "MEETING" ? (
                          <div className="mt-2">
                            <Link
                              href={`/${data.creator.username}/mypage?aiOfficeView=CREATE&aiOfficeRole=MANAGER&aiOfficeOpenCreateTaskType=MEETING_AGENDA_DRAFT#ai-office`}
                              className="text-xs font-medium text-[var(--text-subtle)] underline underline-offset-2 hover:text-[var(--text)]"
                            >
                              アジェンダを作る →
                            </Link>
                          </div>
                        ) : null}
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

              {activeUpcomingMeetings.length > 0 ? (
                <section
                  id="meeting-copilot"
                  className="accent-surface-amber rounded-2xl p-4"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div className="accent-text-amber-strong text-xs font-semibold uppercase tracking-[0.14em]">
                      ミーティングコパイロット
                    </div>
                    <span className="status-badge status-badge-warn">{activeUpcomingMeetings.length}件</span>
                  </div>
                  <p className="accent-text-amber mb-3 text-[11px]">
                    予定中のミーティングに議事メモ・決定事項・次のアクションを記録できます。
                  </p>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {activeUpcomingMeetings.map((meeting) => (
                      <MeetingCopilotCard
                        key={meeting.id}
                        meeting={meeting}
                        address={address}
                        onCompleted={(updated) => {
                          setCompletedFromCopilot((prev) => new Set([...prev, updated.id]));
                        }}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {data.recentCompletedMeetings.length > 0 ? (
                <section
                  id="completed-meetings"
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
                >
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                    直近の完了ミーティング（決定事項 → Note化）
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {data.recentCompletedMeetings.map((meeting) => (
                      <CompletedMeetingCard
                        key={meeting.id}
                        meeting={meeting}
                        address={address}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                <section
                  id="latest-notes"
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                      Latest Notes
                    </div>
                    <Link
                      href={`/manager-desk/notes?creatorProfileId=${props.creatorProfileId}`}
                      className={compactSecondaryActionClassName}
                    >
                      Notes Surface で見る
                    </Link>
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

                <section
                  id="key-contacts"
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                      Key Contacts
                    </div>
                    <Link
                      href={`/manager-desk/contacts?creatorProfileId=${props.creatorProfileId}`}
                      className={compactSecondaryActionClassName}
                    >
                      Contact Pipeline で見る
                    </Link>
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

              <section
                id="recent-action-log"
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                    Recent Action Log
                  </div>
                  <Link
                    href={`/manager-desk/activity?creatorProfileId=${props.creatorProfileId}&sourceType=ACTION_LOG`}
                    className={compactSecondaryActionClassName}
                  >
                    Timeline で見る
                  </Link>
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

              <section>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-[var(--text)]">支援者 CRM</h2>
                </div>
                <ManagerDeskSupporterCrmSection
                  loading={supporterCrm.loading}
                  error={supporterCrm.error}
                  data={supporterCrm.data}
                  onReload={() => { void supporterCrm.reload(); }}
                />
              </section>

              {data.expenseSummary.totalCount > 0 ? (
                <section>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-[var(--text)]">費用サマリー</h2>
                    <span className="status-badge status-badge-neutral">
                      直近 {data.expenseSummary.totalCount} 件
                    </span>
                  </div>
                  <div className="space-y-2">
                    {data.expenseSummary.thisMonthAmountByCategory.map((cat) => {
                      const prevCat = data.expenseSummary.prevMonthAmountByCategory.find(
                        (p) => p.category === cat.category && p.currency === cat.currency
                      );
                      const thisTotal = Number(cat.total);
                      const prevTotal = prevCat ? Number(prevCat.total) : null;
                      const diff = prevTotal !== null ? thisTotal - prevTotal : null;
                      const diffPct =
                        diff !== null && prevTotal !== null && prevTotal > 0
                          ? Math.round((diff / prevTotal) * 100)
                          : null;
                      return (
                        <div
                          key={`${cat.category}:${cat.currency}`}
                          className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-2"
                        >
                          <span className="text-sm text-[var(--text)]">{cat.category}</span>
                          <div className="flex items-center gap-2">
                            {diffPct !== null ? (
                              <span
                                className={`text-[11px] font-medium ${
                                  diffPct > 0 ? "text-rose-500" : "text-emerald-600"
                                }`}
                              >
                                {diffPct > 0 ? "+" : ""}
                                {diffPct.toString()}%
                              </span>
                            ) : null}
                            <span className="text-sm font-semibold text-[var(--text)]">
                              {thisTotal.toLocaleString("ja-JP")} {cat.currency}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {data.expenseSummary.thisMonthAmountByCategory.length === 0 &&
                    data.expenseSummary.totalAmountByCategory.length > 0
                      ? data.expenseSummary.totalAmountByCategory.map((cat) => (
                          <div
                            key={`${cat.category}:${cat.currency}`}
                            className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-2"
                          >
                            <span className="text-sm text-[var(--text)]">{cat.category}</span>
                            <span className="text-sm font-semibold text-[var(--text)]">
                              {Number(cat.total).toLocaleString("ja-JP")} {cat.currency}
                            </span>
                          </div>
                        ))
                      : null}
                  </div>
                  <div className="mt-3 space-y-2">
                    {data.expenseSummary.recentExpenses.slice(0, 5).map((exp) => (
                      <div
                        key={exp.id}
                        className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-medium text-[var(--text)]">{exp.title}</div>
                          <div className="shrink-0 text-sm font-semibold text-[var(--text)]">
                            {Number(exp.amountDecimal).toLocaleString("ja-JP")} {exp.currency}
                          </div>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--text-subtle)]">
                          <span>{exp.category}</span>
                          <span>•</span>
                          <span>{formatDateTime(exp.occurredAt)}</span>
                        </div>
                        {exp.note ? (
                          <div className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
                            {exp.note}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
              </>) : null}
            </div>
          ) : null}
        </section>
      </div>
    </MyPageShell>
  );
}
