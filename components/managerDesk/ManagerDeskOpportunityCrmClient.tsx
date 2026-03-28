"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useState } from "react";

import { useAccount } from "wagmi";

import { useManagerDeskOpportunityCrm } from "@/components/managerDesk/useManagerDeskOpportunityCrm";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import {
  WorkspaceEmptyState,
  WorkspaceLoadingCard,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";
import type {
  ManagerDeskContactPipelineItem,
  ManagerDeskOpportunityStatus,
} from "@/lib/managerDesk/readModelTypes";

const STAGE_LABELS: Record<ManagerDeskOpportunityStatus, string> = {
  IN_DISCUSSION: "進行中",
  NEGOTIATING: "交渉中",
  WON: "成立",
  ONGOING: "継続関係",
};

const STAGE_DESCRIPTIONS: Record<ManagerDeskOpportunityStatus, string> = {
  IN_DISCUSSION: "情報交換・関係構築の段階",
  NEGOTIATING: "条件・契約を詰めている段階",
  WON: "契約・合意に至った案件",
  ONGOING: "継続的な取引関係にある案件",
};

const TEMPERATURE_LABELS: Record<string, string> = {
  UNKNOWN: "不明",
  COLD: "低",
  NEUTRAL: "普通",
  WARM: "高",
  HOT: "非常に高",
};

const secondaryActionClassName = "btn-secondary justify-center text-sm";
const fieldClassName =
  "w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]";

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

function dueStateBadgeClass(value: ManagerDeskContactPipelineItem["dueState"]): string {
  if (value === "OVERDUE") return "status-badge status-badge-error";
  if (value === "DUE_SOON") return "status-badge status-badge-warn";
  return "status-badge status-badge-neutral";
}

function dueStateLabel(value: ManagerDeskContactPipelineItem["dueState"]): string {
  if (value === "OVERDUE") return "期限超過";
  if (value === "DUE_SOON") return "近日対応";
  return "通常";
}

function SummaryMetric(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-subtle)]">
        {props.label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-[var(--text)]">{props.value}</div>
    </div>
  );
}

type InlineNoteFormState = {
  title: string;
  body: string;
  submitting: boolean;
  submitted: boolean;
  error: string | null;
};

function OpportunityCard(props: {
  item: ManagerDeskContactPipelineItem;
  address: string | undefined;
}) {
  const { item, address } = props;
  const outreachHref =
    `/${item.creator.username}/mypage/ai-office/create` +
    `?role=MANAGER&taskType=CONTACT_OUTREACH_DRAFT` +
    `&contactId=${item.contact.id}`;

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteForm, setNoteForm] = useState<InlineNoteFormState>({
    title: "",
    body: "",
    submitting: false,
    submitted: false,
    error: null,
  });

  async function submitNote() {
    if (!address || !noteForm.title.trim() || !noteForm.body.trim()) return;
    setNoteForm((prev) => ({ ...prev, submitting: true, error: null }));
    try {
      await ownerAuthFetch({
        address,
        url: "/api/manager-notes",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address,
            creatorProfileId: String(item.creator.id),
            externalContactId: item.contact.id,
            noteType: "GENERAL",
            visibility: "MANAGER_ONLY",
            title: noteForm.title.trim(),
            body: noteForm.body.trim(),
          }),
        },
      });
      setNoteForm({ title: "", body: "", submitting: false, submitted: true, error: null });
      setNoteOpen(false);
    } catch {
      setNoteForm((prev) => ({
        ...prev,
        submitting: false,
        error: "ノートの保存に失敗しました。もう一度お試しください。",
      }));
    }
  }

  return (
    <article className="surface-card space-y-4 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={dueStateBadgeClass(item.dueState)}>
              {dueStateLabel(item.dueState)}
            </span>
            <span className="status-badge status-badge-neutral">
              温度感 {TEMPERATURE_LABELS[item.contact.temperature] ?? item.contact.temperature}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-[var(--text)]">
            {item.contact.organizationName}
          </h3>
          <div className="text-sm text-[var(--text-subtle)]">
            {item.creator.displayName || item.creator.username} / @{item.creator.username}
            {item.contact.personName ? ` — 窓口: ${item.contact.personName}` : ""}
            {item.contact.roleTitle ? ` (${item.contact.roleTitle})` : ""}
          </div>
        </div>

        <div className="text-right text-xs text-[var(--text-subtle)]">
          <div>次アクション期限 {formatDateTime(item.contact.nextActionDueAt)}</div>
          <div className="mt-1">最終接点 {formatDateTime(item.contact.lastContactAt)}</div>
        </div>
      </div>

      {item.contact.nextAction ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
            Next Action
          </div>
          <div className="mt-2 text-sm leading-6 text-[var(--text)]">
            {item.contact.nextAction}
          </div>
          {item.contact.lastOutcome ? (
            <div className="mt-2 text-sm text-[var(--text-subtle)]">
              前回の結果: {item.contact.lastOutcome}
            </div>
          ) : null}
        </div>
      ) : null}

      {item.latestNote ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
              最新ノート
            </span>
            <span className="text-[10px] text-[var(--text-subtle)]">
              {formatDateTime(item.latestNote.createdAt)}
            </span>
          </div>
          <div className="mt-1.5 text-xs font-medium text-[var(--text)]">
            {item.latestNote.title}
          </div>
          {item.latestNote.bodySnippet ? (
            <div className="mt-0.5 line-clamp-2 text-xs leading-5 text-[var(--text-subtle)]">
              {item.latestNote.bodySnippet}
            </div>
          ) : null}
        </div>
      ) : null}

      {noteOpen ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
            ノートを記録
          </div>
          <input
            type="text"
            placeholder="タイトル"
            value={noteForm.title}
            disabled={noteForm.submitting}
            onChange={(e) => setNoteForm((prev) => ({ ...prev, title: e.target.value }))}
            className={`${fieldClassName} disabled:opacity-50`}
          />
          <textarea
            placeholder="内容を入力してください"
            value={noteForm.body}
            disabled={noteForm.submitting}
            rows={3}
            onChange={(e) => setNoteForm((prev) => ({ ...prev, body: e.target.value }))}
            className={`${fieldClassName} disabled:opacity-50 resize-none`}
          />
          {noteForm.error ? (
            <div className="text-xs text-red-600">{noteForm.error}</div>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={noteForm.submitting || !noteForm.title.trim() || !noteForm.body.trim()}
              onClick={() => { void submitNote(); }}
              className="btn-raised btn-raised-sm disabled:opacity-50"
            >
              {noteForm.submitting ? "保存中…" : "保存"}
            </button>
            <button
              type="button"
              disabled={noteForm.submitting}
              onClick={() => { setNoteOpen(false); }}
              className={`${secondaryActionClassName} disabled:opacity-50`}
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : null}

      {noteForm.submitted ? (
        <div className="text-xs text-green-700">ノートを保存しました。</div>
      ) : null}

      <div className="grid gap-2 sm:flex sm:flex-wrap">
        <button
          type="button"
          onClick={() => { setNoteOpen((prev) => !prev); setNoteForm((prev) => ({ ...prev, submitted: false, error: null })); }}
          className={secondaryActionClassName}
        >
          {noteOpen ? "閉じる" : "ノートを記録"}
        </button>
        <Link href={outreachHref} className="btn-raised btn-raised-sm">
          連絡文を作る
        </Link>
        <Link
          href={`/manager-desk/creators/${item.creator.id}`}
          className={secondaryActionClassName}
        >
          Creator Detail
        </Link>
        <Link
          href={`/manager-desk/contacts?creatorProfileId=${item.creator.id}`}
          className={secondaryActionClassName}
        >
          Contact Pipeline
        </Link>
      </div>
    </article>
  );
}

export function ManagerDeskOpportunityCrmClient() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const creatorProfileId = searchParams.get("creatorProfileId");

  const { loading, error, data, reload } = useManagerDeskOpportunityCrm({
    address,
    isConnected,
    creatorProfileId,
  });

  function updateCreatorFilter(value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("creatorProfileId", value);
    } else {
      params.delete("creatorProfileId");
    }
    const nextUrl = params.toString().length > 0 ? `${pathname}?${params}` : pathname;
    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }

  return (
    <MyPageShell headerColor="#0f172a" showPromo={false}>
      <div className="container-narrow space-y-4">
        <section className="surface-card space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">
                Manager Desk
              </div>
              <h1 className="text-2xl font-semibold text-[var(--text)]">Opportunity CRM</h1>
              <p className="text-sm leading-6 text-[var(--text-subtle)]">
                進行中・交渉中・成立・継続関係の対外接点をステージ別に把握し、
                連絡文の作成や次アクションに素早くつなぐための画面です。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/manager-desk"
                className={secondaryActionClassName}
              >
                Dashboard に戻る
              </Link>
            </div>
          </div>

          {!isConnected ? (
            <WorkspaceStatusNotice
              tone="info"
              title="ウォレット接続後に Opportunity CRM を読み込みます"
              description="active assignment に紐づく Creator の案件だけを表示します。"
            />
          ) : null}

          {loading ? (
            <WorkspaceLoadingCard
              title="Opportunity CRM を読み込んでいます"
              description="進行中・交渉中・成立の案件を整理しています。"
            />
          ) : null}

          {error ? (
            <WorkspaceStatusNotice
              tone="error"
              title="Opportunity CRM の取得に失敗しました"
              description="接続状態を確認してから、もう一度試してください。"
              onRetry={() => {
                void reload();
              }}
            />
          ) : null}

          {data ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <SummaryMetric label="進行中" value={String(data.summary.inDiscussionCount)} />
                <SummaryMetric label="交渉中" value={String(data.summary.negotiatingCount)} />
                <SummaryMetric
                  label="成立 / 継続"
                  value={String(data.summary.wonCount + data.summary.ongoingCount)}
                />
              </div>

              {data.availableCreators.length > 1 ? (
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
                  <label className="space-y-2 text-sm text-[var(--text-subtle)]">
                    <span className="block text-xs font-semibold uppercase tracking-[0.14em]">
                      Creator
                    </span>
                    <select
                      value={creatorProfileId ?? ""}
                      onChange={(event) => {
                        updateCreatorFilter(
                          event.target.value.length > 0 ? event.target.value : null
                        );
                      }}
                      className={fieldClassName}
                    >
                      <option value="">すべての Creator</option>
                      {data.availableCreators.map((creator) => (
                        <option key={creator.id} value={creator.id}>
                          {creator.displayName || creator.username}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              {data.summary.totalCount === 0 ? (
                <WorkspaceEmptyState
                  title="該当する案件はまだありません"
                  description="Contact Pipeline で status を IN_DISCUSSION / NEGOTIATING / WON / ONGOING に進めると、ここに表示されます。"
                />
              ) : (
                data.stages.map((stage) =>
                  stage.items.length === 0 ? null : (
                    <div key={stage.status} className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text)]">
                            {STAGE_LABELS[stage.status]}
                          </h2>
                          <span className="status-badge status-badge-neutral">
                            {stage.items.length}件
                          </span>
                        </div>
                        <div className="text-xs text-[var(--text-subtle)]">
                          {STAGE_DESCRIPTIONS[stage.status]}
                        </div>
                      </div>
                      <div className="space-y-3">
                        {stage.items.map((item) => (
                          <OpportunityCard key={item.contact.id} item={item} address={address} />
                        ))}
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          ) : null}
        </section>
      </div>
    </MyPageShell>
  );
}
