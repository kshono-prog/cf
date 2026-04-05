"use client";

import {
  WorkspaceEmptyState,
  WorkspaceLoadingCard,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import type {
  CreatorReadyAiManagerCard,
  CreatorReadyHomeAction,
} from "@/components/mypage/creatorReadyHomeAiHelpers";
import { deriveAiManagerX402FollowUps } from "@/lib/aiManager/x402FollowUps";
import { deriveAiManagerX402RecoveryItems } from "@/lib/aiManager/x402Recovery";
import type { SerializedAiManagerAccount } from "@/lib/serializers/aiManager";

type Props = {
  loading: boolean;
  cards: CreatorReadyAiManagerCard[];
  account: SerializedAiManagerAccount | null;
  accountLoading: boolean;
  accountError: string | null;
  onOpenSettings: () => void;
};

function toneStyles(
  tone: CreatorReadyAiManagerCard["tone"]
): {
  wrapper: string;
  badge: string;
} {
  switch (tone) {
    case "attention":
      return {
        wrapper: "border-amber-200 bg-amber-50/80",
        badge: "border-amber-200 bg-[var(--surface)] text-amber-800",
      };
    case "recommended":
      return {
        wrapper: "border-emerald-200 bg-emerald-50/80",
        badge: "border-emerald-200 bg-[var(--surface)] text-emerald-800",
      };
    default:
      return {
        wrapper: "border-[var(--line)] bg-[var(--surface-subtle)]",
        badge: "border-[var(--line)] bg-[var(--surface)] text-[var(--text-subtle)]",
      };
  }
}

function ActionButton(props: {
  action: CreatorReadyHomeAction;
  onOpenSettings: () => void;
}) {
  if (props.action.kind === "settings") {
    return (
      <button type="button" className="btn-secondary" onClick={props.onOpenSettings}>
        {props.action.label}
      </button>
    );
  }

  return (
    <a href={props.action.href} className="btn-secondary">
      {props.action.label}
    </a>
  );
}

function getStatusLabel(status: SerializedAiManagerAccount["status"]): string {
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

function getVisibilityLabel(
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

function formatSummaryDate(value: string | null): string {
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

export function CreatorReadyAiManagerSection(props: Props) {
  const availableAmount = props.account?.budgetBalance?.availableAmount ?? null;
  const availableAmountValue = Number(availableAmount ?? "0");
  const hasBudget =
    Number.isFinite(availableAmountValue) && availableAmountValue > 0;
  const billingPaused = props.account?.billingPolicy?.status === "PAUSED";
  const x402FollowUps = deriveAiManagerX402FollowUps(props.account);
  const x402RecoveryItems = deriveAiManagerX402RecoveryItems(props.account);
  const accountSummary =
    props.account?.status !== "ACTIVE"
      ? "まだ準備中です。性格、口調、予算ルールを整えてから日々の運営に育てられます。"
      : billingPaused
        ? "billable capability は一時停止中です。無料範囲は維持しつつ、Settings で pause reason を確認できます。"
      : hasBudget
        ? "JPYC 予算残高があるので、許可した billable capability を cap の範囲で使えます。"
        : "現在は無料範囲で稼働します。残高ゼロの間は内部ブリーフィングと軽い下書きだけを扱います。";

  return (
    <section className="card p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-[var(--text)]">AI Manager</div>
          <p className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
            AI Office の提案に加えて、人格アカウントの状態と予算ルールを Creator Home で確認できます。
          </p>
        </div>
        <div className="text-[11px] text-[var(--muted)]">
          {props.loading ? "AI が状況を整理中です" : "いま実務につながる提案だけを表示"}
        </div>
      </div>

      {props.accountLoading ? (
        <div className="mt-4">
          <WorkspaceLoadingCard
            title="AIマネージャーの状態を読み込んでいます"
            description="人格アカウント、公開状態、JPYC 予算残高を確認しています。"
          />
        </div>
      ) : null}

      {props.accountError ? (
        <div className="mt-4">
          <WorkspaceStatusNotice
            tone="info"
            title="AIマネージャー情報は次の読み込みで更新されます"
            description={props.accountError}
          />
        </div>
      ) : null}

      {!props.accountLoading && !props.account ? (
        <div className="mt-4">
          <WorkspaceEmptyState
            title="AIマネージャーはまだ作成されていません"
            description="1 creator = 1 AIマネージャーを前提に、まず owner only で作成し、後から public badged に広げられます。"
          >
            <button
              type="button"
              className="btn-secondary"
              onClick={props.onOpenSettings}
            >
              設定・準備を開く
            </button>
          </WorkspaceEmptyState>
        </div>
      ) : null}

      {props.account ? (
        <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">
                {props.account.displayName}
              </div>
              <div className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
                {accountSummary}
              </div>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={props.onOpenSettings}
            >
              設定・準備を開く
            </button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
              <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                status
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                {getStatusLabel(props.account.status)}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
              <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                visibility
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                {getVisibilityLabel(props.account.publicVisibility)}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
              <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                available
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                {formatJpycAmount(availableAmount)}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
              <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                mode
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                {billingPaused
                  ? "billable 一時停止"
                  : props.account.billingPolicy?.autoPayEnabled
                  ? "cap 付き自動支払い"
                  : "手動 top-up"}
              </div>
            </div>
          </div>

          {billingPaused && props.account.billingPolicy?.pauseReason ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-900">
              停止理由: {props.account.billingPolicy.pauseReason}
            </div>
          ) : null}

          {props.account.reconciliation.requiresAttention ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs leading-5 text-[var(--text-subtle)]">
                <div className="font-semibold text-[var(--text)]">pending x402</div>
                <div>
                  {props.account.reconciliation.pendingX402Count}件 /{" "}
                  {formatJpycAmount(props.account.reconciliation.pendingX402Amount)}
                </div>
                <div>
                  {
                    X402_DELIVERY_STATUS_LABELS[
                      props.account.reconciliation.pendingX402DeliveryStatus
                    ]
                  }
                </div>
                {props.account.reconciliation.latestPendingX402EventSource &&
                props.account.reconciliation.latestPendingX402EventType ? (
                  <div>
                    {
                      X402_EVENT_SOURCE_LABELS[
                        props.account.reconciliation.latestPendingX402EventSource
                      ]
                    }{" "}
                    /{" "}
                    {
                      X402_EVENT_TYPE_LABELS[
                        props.account.reconciliation.latestPendingX402EventType
                      ]
                    }
                  </div>
                ) : null}
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs leading-5 text-[var(--text-subtle)]">
                <div className="font-semibold text-[var(--text)]">
                  unmatched evidence
                </div>
                <div>
                  {props.account.reconciliation.unmatchedFundingEvidenceCount}件 /{" "}
                  {formatJpycAmount(
                    props.account.reconciliation.unmatchedFundingEvidenceAmount
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs leading-5 text-[var(--text-subtle)]">
                <div className="font-semibold text-[var(--text)]">
                  latest confirmed
                </div>
                <div>
                  {formatSummaryDate(props.account.reconciliation.latestConfirmedX402At)}
                </div>
                <div>
                  recovery: {props.account.reconciliation.recoveryCount}件
                  {props.account.reconciliation.latestRecoveryLabel &&
                  props.account.reconciliation.latestRecoverySourceLabel
                    ? ` / ${props.account.reconciliation.latestRecoveryLabel} / ${props.account.reconciliation.latestRecoverySourceLabel}`
                    : ""}
                </div>
                <div>
                  connector {props.account.reconciliation.recoveryConnectorCount} / owner review{" "}
                  {props.account.reconciliation.recoveryOwnerReviewCount}
                </div>
              </div>
            </div>
          ) : null}

          {x402FollowUps.length > 0 ? (
            <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-xs leading-5 text-[var(--text-subtle)]">
              <div className="font-semibold text-[var(--text)]">
                オーナーフォローアップ
              </div>
              <div className="mt-2 space-y-2">
                {x402FollowUps.slice(0, 2).map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold text-[var(--text)]">
                        {entry.title}
                      </div>
                      <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-[11px] text-[var(--text-subtle)]">
                        {X402_FOLLOW_UP_PRIORITY_LABELS[entry.priority]}
                      </span>
                      {entry.routeLabel ? (
                        <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-[11px] text-[var(--text-subtle)]">
                          {entry.routeLabel}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1">{entry.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {x402RecoveryItems.length > 0 ? (
            <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-xs leading-5 text-[var(--text-subtle)]">
              <div className="font-semibold text-[var(--text)]">
                recent recovery
              </div>
              <div className="mt-2 space-y-2">
                {x402RecoveryItems.slice(0, 2).map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold text-[var(--text)]">
                        {entry.taskLabel ?? entry.capabilityLabel}
                      </div>
                      <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-[11px] text-[var(--text-subtle)]">
                        {entry.recoveryLabel}
                      </span>
                    </div>
                    <div className="mt-1">
                      {entry.sourceLabel} / {formatSummaryDate(entry.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {props.cards.map((card) => {
          const styles = toneStyles(card.tone);
          return (
            <article
              key={card.id}
              className={`rounded-xl border p-4 ${styles.wrapper}`}
            >
              <div className="flex flex-wrap items-start gap-2">
                {card.badge ? (
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${styles.badge}`}
                  >
                    {card.badge}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 text-sm font-semibold text-[var(--text)]">
                {card.title}
              </div>
              <div className="mt-2 text-xs leading-5 text-[var(--text-subtle)]">
                {card.body}
              </div>
              <div className="mt-4">
                <ActionButton
                  action={card.action}
                  onOpenSettings={props.onOpenSettings}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
