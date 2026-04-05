"use client";

import React from "react";

import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { useCreatorAiManagerAccount } from "@/components/mypage/useCreatorAiManagerAccount";
import {
  WorkspaceEmptyState,
  WorkspaceLoadingCard,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import {
  AI_MANAGER_ARCHETYPES,
  AI_MANAGER_BILLABLE_CAPABILITIES,
  AI_MANAGER_INITIAL_CAPS,
  AI_MANAGER_PUBLIC_VISIBILITIES,
  AI_MANAGER_STATUSES,
  AI_MANAGER_SUPPORT_STYLES,
  AI_MANAGER_TONES,
  type AiManagerArchetype,
  type AiManagerBillableCapability,
  type AiManagerPublicVisibility,
  type AiManagerStatus,
  type AiManagerSupportStyle,
  type AiManagerTone,
} from "@/lib/aiManager/config";
import { deriveAiManagerPendingTimeline } from "@/lib/aiManager/pendingTimeline";
import {
  AiManagerPendingTimelineCard,
  type AiManagerPendingTimelineCardActions,
} from "@/components/mypage/AiManagerPendingTimelineCard";
import { AiManagerConnectorHealthDigest } from "@/components/mypage/AiManagerConnectorHealthDigest";
import { AiManagerRecoveryTrendChart } from "@/components/mypage/AiManagerRecoveryTrendChart";
import { deriveConnectorHealthDigest } from "@/lib/aiManager/connectorHealthDigest";
import { deriveAiManagerX402DeliveryEvents } from "@/lib/aiManager/x402DeliveryEvents";
import { deriveAiManagerX402FollowUps } from "@/lib/aiManager/x402FollowUps";
import { deriveAiManagerX402RecoveryItems } from "@/lib/aiManager/x402Recovery";
import { deriveAiManagerX402RecoverySummary } from "@/lib/aiManager/x402RecoverySummary";
import { deriveAiManagerX402ActivityTimeline } from "@/lib/aiManager/x402Timeline";
import type { UpdateAiManagerAccountInput } from "@/lib/mypage/aiManagerAccountApi";
import {
  buildWorkspaceActionSuccessNotice,
  type WorkspaceActionNotice,
} from "@/lib/mypage/workspaceActionCopy";
import type { SerializedAiManagerAccount } from "@/lib/serializers/aiManager";

type FormState = {
  displayName: string;
  slug: string;
  intro: string;
  archetype: AiManagerArchetype;
  publicVisibility: AiManagerPublicVisibility;
  status: AiManagerStatus;
  primaryLanguage: string;
  tone: AiManagerTone;
  supportStyle: AiManagerSupportStyle;
  managerActivityWalletAddress: string;
  budgetWalletAddress: string;
  specialtiesText: string;
  forbiddenTopicsText: string;
  brandGuardrailsText: string;
  autoPayEnabled: boolean;
  monthlyJpycCap: number;
  dailyJpycCap: number;
  perActionJpycCap: number;
  allowedBillableCapabilities: AiManagerBillableCapability[];
};

const ARCHETYPE_LABELS: Record<AiManagerArchetype, string> = {
  GENTLE_SUPPORTER: "やさしい伴走型",
  PRODUCER: "プロデューサー型",
  ANALYST: "分析型",
  PROMOTER: "広報特化型",
  FAN_GUIDE: "ファン交流型",
};

const STATUS_LABELS: Record<AiManagerStatus, string> = {
  DRAFT: "準備中",
  ACTIVE: "稼働中",
  PAUSED: "一時停止",
  ARCHIVED: "アーカイブ",
};

const VISIBILITY_LABELS: Record<AiManagerPublicVisibility, string> = {
  OWNER_ONLY: "owner only",
  PUBLIC_BADGED: "公開 + AI明記",
  PRIVATE: "完全非公開",
};

const TONE_LABELS: Record<AiManagerTone, string> = {
  POLITE: "丁寧",
  FRIENDLY: "フレンドリー",
  ELEGANT: "上品",
  ENERGETIC: "熱量高め",
  COOL: "クール",
};

const SUPPORT_STYLE_LABELS: Record<AiManagerSupportStyle, string> = {
  ENCOURAGING: "応援重視",
  CALM: "落ち着いた伴走",
  DATA_DRIVEN: "分析重視",
  PROMOTIONAL: "告知重視",
};

const CAPABILITY_LABELS: Record<AiManagerBillableCapability, string> = {
  POST_DRAFTING: "投稿下書き",
  FAN_REPLY_ASSIST: "ファン返信補助",
  PROGRESS_SUMMARY: "進捗サマリー",
  WEB_RESEARCH: "Web情報収集",
};

const BUDGET_TRANSACTION_TYPE_LABELS = {
  OWNER_TOP_UP: "owner top-up",
  OWNER_DEDUCTION: "owner deduction",
  USAGE_SETTLEMENT: "usage settlement",
} as const;

const FUNDING_X402_STATUS_LABELS = {
  X402_READY: "x402 ready",
  X402_CONFIG_REQUIRED: "x402 config required",
  INTERNAL_LEDGER_ONLY: "internal ledger only",
} as const;

const PAYEE_VERIFICATION_STATUS_LABELS = {
  VERIFIED: "verified",
  UNVERIFIED: "unverified",
} as const;

const SETTLEMENT_RAIL_LABELS = {
  X402: "x402",
  INTERNAL_LEDGER: "internal ledger fallback",
} as const;

const FUNDING_EVIDENCE_STATUS_LABELS = {
  SELF_REPORTED: "self reported",
  MATCHED_TO_LEDGER: "matched to ledger",
  REJECTED: "rejected",
} as const;

const PAYMENT_ATTEMPT_STATUS_LABELS = {
  PENDING: "pending confirmation",
  CONFIRMED: "confirmed",
  FAILED: "failed",
} as const;

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

const USAGE_BILLING_STATE_LABELS = {
  WAIVED: "無料範囲",
  PAYMENT_PENDING: "支払い確認待ち",
  SETTLED: "支払い確定",
  FAILED: "失敗",
  METERED: "計測済み",
} as const;

function toMultilineText(items: string[]): string {
  return items.join("\n");
}

function fromMultilineText(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split("\n")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  );
}

function parseCapInput(value: string, fallback: number): number {
  const next = Number.parseInt(value, 10);
  if (!Number.isFinite(next) || next < 0) {
    return fallback;
  }
  return next;
}

function formatJpycAmount(value: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return `${value} JPYC`;
  }
  return `${amount.toLocaleString("ja-JP")} JPYC`;
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTxHash(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function buildFormState(account: SerializedAiManagerAccount): FormState {
  const billing = account.billingPolicy;
  return {
    displayName: account.displayName,
    slug: account.slug ?? "",
    intro: account.intro ?? "",
    archetype: account.archetype,
    publicVisibility: account.publicVisibility,
    status: account.status,
    primaryLanguage: account.primaryLanguage,
    tone: account.tone,
    supportStyle: account.supportStyle,
    managerActivityWalletAddress: account.managerActivityWalletAddress ?? "",
    budgetWalletAddress: account.budgetWalletAddress ?? "",
    specialtiesText: toMultilineText(account.specialties),
    forbiddenTopicsText: toMultilineText(account.forbiddenTopics),
    brandGuardrailsText: toMultilineText(account.brandGuardrails),
    autoPayEnabled: billing?.autoPayEnabled ?? false,
    monthlyJpycCap:
      billing?.monthlyJpycCap ?? AI_MANAGER_INITIAL_CAPS.monthlyJpyc,
    dailyJpycCap: billing?.dailyJpycCap ?? AI_MANAGER_INITIAL_CAPS.dailyJpyc,
    perActionJpycCap:
      billing?.perActionJpycCap ?? AI_MANAGER_INITIAL_CAPS.perActionJpyc,
    allowedBillableCapabilities:
      billing?.allowedBillableCapabilities.length
        ? billing.allowedBillableCapabilities
        : [...AI_MANAGER_BILLABLE_CAPABILITIES],
  };
}

export function CreatorSettingsAiManagerAccountSection() {
  const workspace = useCreatorReadyWorkspace();
  const aiManager = useCreatorAiManagerAccount({
    address: workspace.address,
    isConnected: workspace.isConnected,
  });
  const account = aiManager.account;
  const balance = account?.budgetBalance ?? null;
  const funding = aiManager.funding;
  const [form, setForm] = React.useState<FormState | null>(null);
  const [notice, setNotice] = React.useState<WorkspaceActionNotice | null>(null);
  const [budgetAmount, setBudgetAmount] = React.useState("100");
  const [budgetNote, setBudgetNote] = React.useState("");
  const [fundingEvidenceTxHash, setFundingEvidenceTxHash] = React.useState("");
  const [fundingEvidenceAmount, setFundingEvidenceAmount] = React.useState("100");
  const [fundingEvidenceFromWallet, setFundingEvidenceFromWallet] =
    React.useState("");
  const [fundingEvidenceNote, setFundingEvidenceNote] = React.useState("");
  const [selectedFundingEvidenceId, setSelectedFundingEvidenceId] =
    React.useState("");
  const [selectedPaymentAttemptId, setSelectedPaymentAttemptId] =
    React.useState("");
  const [paymentAttemptTxHash, setPaymentAttemptTxHash] = React.useState("");
  const [paymentAttemptNote, setPaymentAttemptNote] = React.useState("");
  const unmatchedFundingEvidences = React.useMemo(
    () =>
      account
        ? account.recentFundingEvidences.filter(
            (entry) => entry.status === "SELF_REPORTED"
          )
        : [],
    [account]
  );
  const pendingX402UsageRecords = React.useMemo(
    () =>
      account
        ? account.recentUsageRecords.filter(
            (usage) =>
              usage.latestPaymentAttempt?.rail === "X402" &&
              usage.latestPaymentAttempt.status === "PENDING"
          )
        : [],
    [account]
  );
  const pendingTimeline = React.useMemo(
    () => deriveAiManagerPendingTimeline(account),
    [account]
  );
  const connectorHealthDigest = React.useMemo(
    () => deriveConnectorHealthDigest(account),
    [account]
  );
  const x402FollowUps = React.useMemo(
    () => deriveAiManagerX402FollowUps(account),
    [account]
  );
  const x402RecoveryItems = React.useMemo(
    () => deriveAiManagerX402RecoveryItems(account),
    [account]
  );
  const x402RecoverySummary = React.useMemo(
    () => deriveAiManagerX402RecoverySummary(account),
    [account]
  );
  const recentX402DeliveryEvents = React.useMemo(
    () => deriveAiManagerX402DeliveryEvents(account),
    [account]
  );
  const recentX402Activity = React.useMemo(
    () => deriveAiManagerX402ActivityTimeline(account),
    [account]
  );
  const selectedPendingX402Usage = React.useMemo(
    () =>
      pendingX402UsageRecords.find(
        (usage) => usage.latestPaymentAttempt?.id === selectedPaymentAttemptId
      ) ?? pendingX402UsageRecords[0] ?? null,
    [pendingX402UsageRecords, selectedPaymentAttemptId]
  );

  React.useEffect(() => {
    if (!account) {
      setForm(null);
      return;
    }
    setForm(buildFormState(account));
  }, [account]);

  React.useEffect(() => {
    if (pendingX402UsageRecords.length === 0) {
      if (selectedPaymentAttemptId) {
        setSelectedPaymentAttemptId("");
      }
      return;
    }

    const stillExists = pendingX402UsageRecords.some(
      (usage) => usage.latestPaymentAttempt?.id === selectedPaymentAttemptId
    );
    if (!stillExists) {
      setSelectedPaymentAttemptId(
        pendingX402UsageRecords[0]?.latestPaymentAttempt?.id ?? ""
      );
    }
  }, [pendingX402UsageRecords, selectedPaymentAttemptId]);

  function updateForm(patch: Partial<FormState>) {
    setForm((current) => (current ? { ...current, ...patch } : current));
    if (notice) {
      setNotice(null);
    }
    if (aiManager.error) {
      aiManager.setError(null);
    }
  }

  function toggleCapability(capability: AiManagerBillableCapability) {
    if (!form) return;

    const nextCapabilities = form.allowedBillableCapabilities.includes(capability)
      ? form.allowedBillableCapabilities.filter((item) => item !== capability)
      : [...form.allowedBillableCapabilities, capability];

    updateForm({
      allowedBillableCapabilities: nextCapabilities,
    });
  }

  async function handleCreate() {
    const created = await aiManager.create();
    if (!created) return;
    setNotice(buildWorkspaceActionSuccessNotice("aiManagerCreated"));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;

    const input: UpdateAiManagerAccountInput = {
      displayName: form.displayName.trim(),
      slug: form.slug.trim(),
      intro: form.intro.trim(),
      archetype: form.archetype,
      publicVisibility: form.publicVisibility,
      status: form.status,
      primaryLanguage: form.primaryLanguage.trim() || "ja",
      tone: form.tone,
      supportStyle: form.supportStyle,
      disclosurePolicy: "ALWAYS_DISCLOSE_AI",
      managerActivityWalletAddress: form.managerActivityWalletAddress.trim(),
      budgetWalletAddress: form.budgetWalletAddress.trim(),
      specialties: fromMultilineText(form.specialtiesText),
      forbiddenTopics: fromMultilineText(form.forbiddenTopicsText),
      brandGuardrails: fromMultilineText(form.brandGuardrailsText),
      billing: {
        billingMode: "MANUAL_TOPUP",
        preferredRail: "X402_PREFERRED",
        freeTierEnabled: true,
        autoPayEnabled: form.autoPayEnabled,
        monthlyJpycCap: form.monthlyJpycCap,
        dailyJpycCap: form.dailyJpycCap,
        perActionJpycCap: form.perActionJpycCap,
        allowedBillableCapabilities: form.allowedBillableCapabilities,
      },
    };

    const saved = await aiManager.save(input);
    if (!saved) return;
    setNotice(buildWorkspaceActionSuccessNotice("aiManagerSaved"));
  }

  async function handleBudgetOperation(action: "TOP_UP" | "DEDUCT") {
    const operated = await aiManager.operateBudget({
      action,
      amount: budgetAmount.trim(),
      note: budgetNote.trim(),
      fundingEvidenceId:
        action === "TOP_UP" && selectedFundingEvidenceId.trim().length > 0
          ? selectedFundingEvidenceId.trim()
          : undefined,
    });
    if (!operated) return;
    setNotice(
      action === "TOP_UP"
        ? {
            tone: "success",
            title: `${operated.amount} JPYC を AI予算に加算しました。`,
            description: "最新の budget balance と使用可能額に反映しました。",
          }
        : {
            tone: "attention",
            title: `${operated.amount} JPYC を AI予算から減算しました。`,
            description: "必要なら budget note で今回の調整理由を残してください。",
          }
    );
    setBudgetAmount("100");
    setBudgetNote("");
    if (action === "TOP_UP") {
      setSelectedFundingEvidenceId("");
    }
  }

  async function handleReportFundingEvidence() {
    const reported = await aiManager.reportFundingEvidence({
      txHash: fundingEvidenceTxHash.trim(),
      amount: fundingEvidenceAmount.trim(),
      note: fundingEvidenceNote.trim(),
      fromWalletAddress: fundingEvidenceFromWallet.trim(),
    });
    if (!reported) return;
    const nextUnmatched = reported.recentFundingEvidences.find(
      (entry) => entry.status === "SELF_REPORTED"
    );
    setSelectedFundingEvidenceId(nextUnmatched?.id ?? "");
    setNotice(buildWorkspaceActionSuccessNotice("fundingEvidenceSaved"));
    setFundingEvidenceTxHash("");
    setFundingEvidenceAmount("100");
    setFundingEvidenceFromWallet("");
    setFundingEvidenceNote("");
  }

  async function handlePaymentAttemptAction(
    action: "CONFIRM_X402" | "MARK_FAILED"
  ) {
    const paymentAttemptId = selectedPendingX402Usage?.latestPaymentAttempt?.id;
    if (!paymentAttemptId) return;

    const updated = await aiManager.updatePaymentAttempt({
      paymentAttemptId,
      action,
      txHash:
        action === "CONFIRM_X402" ? paymentAttemptTxHash.trim() : undefined,
      note: paymentAttemptNote.trim() || undefined,
    });
    if (!updated) return;

    const nextPending = updated.recentUsageRecords.find(
      (usage) =>
        usage.latestPaymentAttempt?.rail === "X402" &&
        usage.latestPaymentAttempt.status === "PENDING"
    );
    setSelectedPaymentAttemptId(nextPending?.latestPaymentAttempt?.id ?? "");
    setPaymentAttemptTxHash("");
    setPaymentAttemptNote("");
    setNotice(
      action === "CONFIRM_X402"
        ? buildWorkspaceActionSuccessNotice("x402Confirmed")
        : buildWorkspaceActionSuccessNotice("x402MarkedFailed")
    );
  }

  async function handleCardConfirm(
    paymentAttemptId: string,
    txHash: string,
    note?: string
  ) {
    const updated = await aiManager.updatePaymentAttempt({
      paymentAttemptId,
      action: "CONFIRM_X402",
      txHash: txHash.trim(),
      note: note?.trim() || undefined,
    });
    if (updated) {
      setNotice(buildWorkspaceActionSuccessNotice("x402Confirmed"));
    }
  }

  async function handleCardMarkFailed(paymentAttemptId: string, note?: string) {
    const updated = await aiManager.updatePaymentAttempt({
      paymentAttemptId,
      action: "MARK_FAILED",
      note: note?.trim() || undefined,
    });
    if (updated) {
      setNotice(buildWorkspaceActionSuccessNotice("x402MarkedFailed"));
    }
  }

  const cardActions: AiManagerPendingTimelineCardActions = {
    onConfirm: handleCardConfirm,
    onMarkFailed: handleCardMarkFailed,
    updating: aiManager.updatingPaymentAttempt,
  };

  return (
    <section id="ai-manager-account" className="surface-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">
            AIマネージャー
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
            Creator ごとに 1 体の AIマネージャーを持ち、内部ブリーフィング、軽い下書き、
            billable task の許可範囲を owner が管理します。
          </p>
        </div>
        {account ? (
          <div className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1 text-xs text-[var(--text-subtle)]">
            Phase 1
          </div>
        ) : null}
      </div>

      {!workspace.isConnected || !workspace.address ? (
        <div className="mt-4">
          <WorkspaceEmptyState
            title="ウォレット接続後に AIマネージャーを作成できます"
            description="owner wallet の確認とセッション認証が必要です。接続後に 1 creator = 1 manager の初期設定を始められます。"
          />
        </div>
      ) : null}

      {workspace.isConnected && aiManager.loading && !account ? (
        <div className="mt-4">
          <WorkspaceLoadingCard
            title="AIマネージャー設定を読み込んでいます"
            description="creator に紐づく account と billing policy を確認しています。"
          />
        </div>
      ) : null}

      {aiManager.error ? (
        <div className="mt-4">
          <WorkspaceStatusNotice tone="error" title={aiManager.error} />
        </div>
      ) : null}

      {notice ? (
        <div className="mt-4">
          <WorkspaceStatusNotice
            tone={notice.tone}
            title={notice.title}
            description={notice.description}
          />
        </div>
      ) : null}

      {workspace.isConnected && !aiManager.loading && !account ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                無料範囲
              </div>
              <div className="mt-2 text-sm font-semibold text-[var(--text)]">
                内部ブリーフィング + 軽い下書き
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--text-subtle)]">
                残高ゼロでも、低負荷の提案と内部メモは継続します。
              </p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                有料範囲
              </div>
              <div className="mt-2 text-sm font-semibold text-[var(--text)]">
                JPYC 予算ウォレットから自動支払い
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--text-subtle)]">
                `x402` 優先、だめな場合は internal ledger fallback を前提にします。
              </p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                安全性
              </div>
              <div className="mt-2 text-sm font-semibold text-[var(--text)]">
                公開時は常に AI 明記
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--text-subtle)]">
                Web収集は手動トリガーのみ、外部SNS連携は Phase 1 対象外です。
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-[var(--line)] px-4 py-5">
            <div className="text-sm font-semibold text-[var(--text)]">
              AIマネージャーを作ると、creator 専属の運営人格を 1 体だけ持てます。
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-subtle)]">
              まずは owner only で作成し、必要なら後から public badged に広げられます。
            </p>
            <div className="mt-4">
              <button
                type="button"
                className="btn"
                onClick={() => void handleCreate()}
                disabled={aiManager.creating}
              >
                {aiManager.creating
                  ? "AIマネージャーを作成中..."
                  : "AIマネージャーを作成する"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {account && form ? (
        <form className="mt-4 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="grid gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                status
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                {STATUS_LABELS[account.status]}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                visibility
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                {VISIBILITY_LABELS[account.publicVisibility]}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                available
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                {balance ? formatJpycAmount(balance.availableAmount) : "0 JPYC"}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                updated
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                {formatUpdatedAt(account.updatedAt)}
              </div>
            </div>
          </div>

          <WorkspaceStatusNotice
            tone="info"
            title="Phase 1 の行動範囲は安全側に固定しています"
            description="Web収集は手動トリガー時のみ、公開時は常に AI 明記、外部SNS投稿は対象外です。支払いが失敗した場合は billable capability を一時停止します。"
          />

          {account.billingPolicy?.status === "PAUSED" ? (
            <WorkspaceStatusNotice
              tone="info"
              title="billable capability は一時停止中です"
              description={
                account.billingPolicy.pauseReason ??
                "pause reason を確認してから再開条件を整えてください。"
              }
            />
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
              <div className="text-sm font-semibold text-[var(--text)]">
                キャラクター設定
              </div>
              <div className="mt-3 space-y-3">
                <label className="grid gap-1 text-xs text-[var(--text)]">
                  <span>表示名</span>
                  <input
                    className="input"
                    value={form.displayName}
                    onChange={(event) =>
                      updateForm({ displayName: event.target.value })
                    }
                    maxLength={80}
                    disabled={aiManager.saving}
                  />
                </label>
                <label className="grid gap-1 text-xs text-[var(--text)]">
                  <span>公開ページ slug</span>
                  <input
                    className="input"
                    value={form.slug}
                    onChange={(event) =>
                      updateForm({ slug: event.target.value })
                    }
                    maxLength={48}
                    placeholder="ai-manager"
                    disabled={aiManager.saving}
                  />
                  <span className="text-[11px] leading-5 text-[var(--text-subtle)]">
                    公開URL は `/{workspace.meCreatorUsername}/manager/{form.slug.trim() || "ai-manager"}` を想定します。
                  </span>
                </label>
                <label className="grid gap-1 text-xs text-[var(--text)]">
                  <span>紹介</span>
                  <textarea
                    className="input min-h-28"
                    value={form.intro}
                    onChange={(event) => updateForm({ intro: event.target.value })}
                    maxLength={800}
                    disabled={aiManager.saving}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-xs text-[var(--text)]">
                    <span>キャラタイプ</span>
                    <select
                      className="input"
                      value={form.archetype}
                      onChange={(event) =>
                        updateForm({
                          archetype: event.target.value as AiManagerArchetype,
                        })
                      }
                      disabled={aiManager.saving}
                    >
                      {AI_MANAGER_ARCHETYPES.map((option) => (
                        <option key={option} value={option}>
                          {ARCHETYPE_LABELS[option]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs text-[var(--text)]">
                    <span>公開範囲</span>
                    <select
                      className="input"
                      value={form.publicVisibility}
                      onChange={(event) =>
                        updateForm({
                          publicVisibility:
                            event.target.value as AiManagerPublicVisibility,
                        })
                      }
                      disabled={aiManager.saving}
                    >
                      {AI_MANAGER_PUBLIC_VISIBILITIES.map((option) => (
                        <option key={option} value={option}>
                          {VISIBILITY_LABELS[option]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs text-[var(--text)]">
                    <span>口調</span>
                    <select
                      className="input"
                      value={form.tone}
                      onChange={(event) =>
                        updateForm({
                          tone: event.target.value as AiManagerTone,
                        })
                      }
                      disabled={aiManager.saving}
                    >
                      {AI_MANAGER_TONES.map((option) => (
                        <option key={option} value={option}>
                          {TONE_LABELS[option]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs text-[var(--text)]">
                    <span>伴走スタイル</span>
                    <select
                      className="input"
                      value={form.supportStyle}
                      onChange={(event) =>
                        updateForm({
                          supportStyle:
                            event.target.value as AiManagerSupportStyle,
                        })
                      }
                      disabled={aiManager.saving}
                    >
                      {AI_MANAGER_SUPPORT_STYLES.map((option) => (
                        <option key={option} value={option}>
                          {SUPPORT_STYLE_LABELS[option]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs text-[var(--text)]">
                    <span>状態</span>
                    <select
                      className="input"
                      value={form.status}
                      onChange={(event) =>
                        updateForm({
                          status: event.target.value as AiManagerStatus,
                        })
                      }
                      disabled={aiManager.saving}
                    >
                      {AI_MANAGER_STATUSES.map((option) => (
                        <option key={option} value={option}>
                          {STATUS_LABELS[option]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs text-[var(--text)]">
                    <span>主言語</span>
                    <input
                      className="input"
                      value={form.primaryLanguage}
                      onChange={(event) =>
                        updateForm({ primaryLanguage: event.target.value })
                      }
                      maxLength={16}
                      disabled={aiManager.saving}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
              <div className="text-sm font-semibold text-[var(--text)]">
                ウォレットと運用境界
              </div>
              <div className="mt-3 space-y-3">
                <label className="grid gap-1 text-xs text-[var(--text)]">
                  <span>owner control wallet</span>
                  <input
                    className="input"
                    value={account.ownerControlWalletAddress ?? ""}
                    readOnly
                    disabled
                  />
                </label>
                <label className="grid gap-1 text-xs text-[var(--text)]">
                  <span>manager activity wallet</span>
                  <input
                    className="input"
                    value={form.managerActivityWalletAddress}
                    onChange={(event) =>
                      updateForm({
                        managerActivityWalletAddress: event.target.value,
                      })
                    }
                    maxLength={120}
                    placeholder="将来の署名ログ用ウォレット"
                    disabled={aiManager.saving}
                  />
                </label>
                <label className="grid gap-1 text-xs text-[var(--text)]">
                  <span>AI budget wallet</span>
                  <input
                    className="input"
                    value={form.budgetWalletAddress}
                    onChange={(event) =>
                      updateForm({ budgetWalletAddress: event.target.value })
                    }
                    maxLength={120}
                    placeholder="JPYC を積む予算ウォレット"
                    disabled={aiManager.saving}
                  />
                </label>
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-xs leading-6 text-[var(--text-subtle)]">
                  <div>公開時の表示ルール: 常に AI 明記</div>
                  <div>
                    公開ショーケース: /{workspace.meCreatorUsername}/manager/
                    {form.slug.trim() || "ai-manager"}
                  </div>
                  <div>課金レール: x402 優先 + internal ledger fallback</div>
                  <div>受取先: Platform Operations Wallet（固定）</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <label className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4 text-xs text-[var(--text)]">
              <span className="text-sm font-semibold text-[var(--text)]">
                得意分野
              </span>
              <textarea
                className="input mt-3 min-h-32"
                value={form.specialtiesText}
                onChange={(event) =>
                  updateForm({ specialtiesText: event.target.value })
                }
                placeholder={"投稿下書き\n進捗共有\nイベント告知"}
                disabled={aiManager.saving}
              />
              <span className="mt-2 block text-[11px] leading-5 text-[var(--text-subtle)]">
                1行に1つ。AIマネージャーが優先して担う領域です。
              </span>
            </label>
            <label className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4 text-xs text-[var(--text)]">
              <span className="text-sm font-semibold text-[var(--text)]">
                禁止トピック
              </span>
              <textarea
                className="input mt-3 min-h-32"
                value={form.forbiddenTopicsText}
                onChange={(event) =>
                  updateForm({ forbiddenTopicsText: event.target.value })
                }
                placeholder={"政治コメント\n未確定の制作発表"}
                disabled={aiManager.saving}
              />
              <span className="mt-2 block text-[11px] leading-5 text-[var(--text-subtle)]">
                発信や提案で避ける話題を固定します。
              </span>
            </label>
            <label className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4 text-xs text-[var(--text)]">
              <span className="text-sm font-semibold text-[var(--text)]">
                ブランドガードレール
              </span>
              <textarea
                className="input mt-3 min-h-32"
                value={form.brandGuardrailsText}
                onChange={(event) =>
                  updateForm({ brandGuardrailsText: event.target.value })
                }
                placeholder={"誇張しすぎない\nファンに敬意を持つ"}
                disabled={aiManager.saving}
              />
              <span className="mt-2 block text-[11px] leading-5 text-[var(--text-subtle)]">
                口調や判断の逸脱を防ぐための原則です。
              </span>
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.25fr,0.75fr]">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--text)]">
                    課金ルール
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
                    残高ゼロ時は無料範囲に縮退し、残高があるときだけ billable capability を使えます。
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-[var(--text)]">
                  <input
                    type="checkbox"
                    checked={form.autoPayEnabled}
                    onChange={(event) =>
                      updateForm({ autoPayEnabled: event.target.checked })
                    }
                    disabled={aiManager.saving}
                  />
                  cap の範囲で自動支払いを許可する
                </label>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1 text-xs text-[var(--text)]">
                  <span>per action cap (JPYC)</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step={1}
                    value={form.perActionJpycCap}
                    onChange={(event) =>
                      updateForm({
                        perActionJpycCap: parseCapInput(
                          event.target.value,
                          AI_MANAGER_INITIAL_CAPS.perActionJpyc
                        ),
                      })
                    }
                    disabled={aiManager.saving}
                  />
                </label>
                <label className="grid gap-1 text-xs text-[var(--text)]">
                  <span>daily cap (JPYC)</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step={1}
                    value={form.dailyJpycCap}
                    onChange={(event) =>
                      updateForm({
                        dailyJpycCap: parseCapInput(
                          event.target.value,
                          AI_MANAGER_INITIAL_CAPS.dailyJpyc
                        ),
                      })
                    }
                    disabled={aiManager.saving}
                  />
                </label>
                <label className="grid gap-1 text-xs text-[var(--text)]">
                  <span>monthly cap (JPYC)</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step={1}
                    value={form.monthlyJpycCap}
                    onChange={(event) =>
                      updateForm({
                        monthlyJpycCap: parseCapInput(
                          event.target.value,
                          AI_MANAGER_INITIAL_CAPS.monthlyJpyc
                        ),
                      })
                    }
                    disabled={aiManager.saving}
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {AI_MANAGER_BILLABLE_CAPABILITIES.map((capability) => (
                  <label
                    key={capability}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--text)]"
                  >
                    <input
                      type="checkbox"
                      checked={form.allowedBillableCapabilities.includes(
                        capability
                      )}
                      onChange={() => toggleCapability(capability)}
                      disabled={aiManager.saving}
                    />
                    {CAPABILITY_LABELS[capability]}
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
              <div className="text-sm font-semibold text-[var(--text)]">
                予算サマリー
              </div>
              <div className="mt-3 space-y-3">
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                    available
                  </div>
                  <div className="mt-1 text-base font-semibold text-[var(--text)]">
                    {balance ? formatJpycAmount(balance.availableAmount) : "0 JPYC"}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                    reserved
                  </div>
                  <div className="mt-1 text-base font-semibold text-[var(--text)]">
                    {balance ? formatJpycAmount(balance.reservedAmount) : "0 JPYC"}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-xs leading-6 text-[var(--text-subtle)]">
                  <div>無料範囲: 内部ブリーフィング + 軽い下書き</div>
                  <div>Web収集: 手動トリガーのみ</div>
                  <div>失敗時: billable capability を一時停止</div>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                    real wallet top-up / x402 readiness
                  </div>
                  {aiManager.loadingFunding ? (
                    <div className="mt-2 text-xs leading-5 text-[var(--text-subtle)]">
                      実ウォレット top-up 先と settlement rail を確認しています。
                    </div>
                  ) : funding ? (
                    <div className="mt-3 space-y-3">
                      <label className="grid gap-1 text-xs text-[var(--text)]">
                        <span>AI budget wallet (top-up target)</span>
                        <input
                          className="input"
                          value={funding.budgetWalletAddress ?? ""}
                          readOnly
                          disabled
                          placeholder="まず budget wallet を設定してください"
                        />
                      </label>
                      <label className="grid gap-1 text-xs text-[var(--text)]">
                        <span>Platform Operations Wallet (settlement payee)</span>
                        <input
                          className="input"
                          value={funding.platformOperationsWalletAddress ?? ""}
                          readOnly
                          disabled
                          placeholder="server env で payee wallet を設定してください"
                        />
                      </label>
                      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-3 text-xs leading-6 text-[var(--text-subtle)]">
                        <div>
                          chain: {funding.chainName} ({funding.chainId})
                        </div>
                        <div>
                          token: {funding.tokenSymbol}
                          {funding.tokenAddress ? ` / ${funding.tokenAddress}` : " / 未設定"}
                        </div>
                        <div>payee id: {funding.payeeId}</div>
                        <div>payee label: {funding.payeeLabel}</div>
                        <div>
                          payee verification:{" "}
                          {
                            PAYEE_VERIFICATION_STATUS_LABELS[
                              funding.payeeVerificationStatus
                            ]
                          }
                        </div>
                        <div>
                          preferred rail:{" "}
                          {funding.preferredRail === "X402_PREFERRED"
                            ? "x402 preferred"
                            : "internal ledger fallback"}
                        </div>
                        <div>
                          active settlement rail:{" "}
                          {SETTLEMENT_RAIL_LABELS[funding.activeSettlementRail]}
                        </div>
                        <div>
                          x402 status:{" "}
                          {FUNDING_X402_STATUS_LABELS[funding.x402Status]}
                        </div>
                        <div>reference code: {funding.referenceCode}</div>
                        {funding.x402EndpointUrl ? (
                          <div>x402 endpoint: {funding.x402EndpointUrl}</div>
                        ) : null}
                      </div>
                      <div className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-3 text-xs leading-5 text-[var(--text-subtle)]">
                        {funding.steps.map((step, index) => (
                          <div key={`${funding.referenceCode}-step-${index + 1}`}>
                            {index + 1}. {step}
                          </div>
                        ))}
                      </div>
                      {funding.warnings.length > 0 ? (
                        <div className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-3 text-xs leading-5 text-[var(--text-subtle)]">
                          {funding.warnings.map((warning, index) => (
                            <div key={`${funding.referenceCode}-warning-${index + 1}`}>
                              注意 {index + 1}: {warning}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs leading-5 text-[var(--text-subtle)]">
                      AIマネージャー作成後に、実ウォレット top-up 先と x402 readiness を表示します。
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                    budget operation
                  </div>
                  <div className="mt-2 text-xs leading-5 text-[var(--text-subtle)]">
                    Phase 1 の残高更新は owner-operated internal ledger です。並行して、real wallet top-up 先と x402 settlement の準備状態を上で確認できます。
                  </div>
                  <div className="mt-3 grid gap-2">
                    {unmatchedFundingEvidences.length > 0 ? (
                      <label className="grid gap-1 text-xs text-[var(--text)]">
                        <span>match top-up evidence (optional)</span>
                        <select
                          className="input"
                          value={selectedFundingEvidenceId}
                          onChange={(event) =>
                            setSelectedFundingEvidenceId(event.target.value)
                          }
                          disabled={aiManager.operatingBudget}
                        >
                          <option value="">紐づけなし</option>
                          {unmatchedFundingEvidences.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {formatJpycAmount(entry.amount)} / {formatTxHash(entry.txHash)} /{" "}
                              {formatUpdatedAt(entry.createdAt)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <label className="grid gap-1 text-xs text-[var(--text)]">
                      <span>amount (JPYC)</span>
                      <input
                        className="input"
                        inputMode="decimal"
                        value={budgetAmount}
                        onChange={(event) => setBudgetAmount(event.target.value)}
                        disabled={aiManager.operatingBudget}
                      />
                    </label>
                    <label className="grid gap-1 text-xs text-[var(--text)]">
                      <span>note</span>
                      <input
                        className="input"
                        value={budgetNote}
                        onChange={(event) => setBudgetNote(event.target.value)}
                        maxLength={240}
                        placeholder="例: テスト運用の追加予算"
                        disabled={aiManager.operatingBudget}
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => void handleBudgetOperation("TOP_UP")}
                        disabled={aiManager.operatingBudget || budgetAmount.trim().length === 0}
                      >
                        {aiManager.operatingBudget ? "更新中..." : "JPYC を加算"}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => void handleBudgetOperation("DEDUCT")}
                        disabled={aiManager.operatingBudget || budgetAmount.trim().length === 0}
                      >
                        {aiManager.operatingBudget ? "更新中..." : "JPYC を減算"}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                    top-up evidence
                  </div>
                  <div className="mt-2 text-xs leading-5 text-[var(--text-subtle)]">
                    実ウォレットから AI budget wallet に送った tx hash を記録し、あとで internal ledger top-up と照合できます。
                  </div>
                  <div className="mt-3 grid gap-2">
                    <label className="grid gap-1 text-xs text-[var(--text)]">
                      <span>tx hash</span>
                      <input
                        className="input"
                        value={fundingEvidenceTxHash}
                        onChange={(event) =>
                          setFundingEvidenceTxHash(event.target.value)
                        }
                        placeholder="0x..."
                        disabled={aiManager.reportingFundingEvidence}
                      />
                    </label>
                    <label className="grid gap-1 text-xs text-[var(--text)]">
                      <span>top-up amount (JPYC)</span>
                      <input
                        className="input"
                        inputMode="decimal"
                        value={fundingEvidenceAmount}
                        onChange={(event) =>
                          setFundingEvidenceAmount(event.target.value)
                        }
                        disabled={aiManager.reportingFundingEvidence}
                      />
                    </label>
                    <label className="grid gap-1 text-xs text-[var(--text)]">
                      <span>from wallet (optional)</span>
                      <input
                        className="input"
                        value={fundingEvidenceFromWallet}
                        onChange={(event) =>
                          setFundingEvidenceFromWallet(event.target.value)
                        }
                        placeholder="送金元ウォレット"
                        disabled={aiManager.reportingFundingEvidence}
                      />
                    </label>
                    <label className="grid gap-1 text-xs text-[var(--text)]">
                      <span>note</span>
                      <input
                        className="input"
                        value={fundingEvidenceNote}
                        onChange={(event) =>
                          setFundingEvidenceNote(event.target.value)
                        }
                        maxLength={240}
                        placeholder="例: Polygon から budget wallet へ送金"
                        disabled={aiManager.reportingFundingEvidence}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => void handleReportFundingEvidence()}
                      disabled={
                        aiManager.reportingFundingEvidence ||
                        fundingEvidenceTxHash.trim().length === 0 ||
                        fundingEvidenceAmount.trim().length === 0
                      }
                    >
                      {aiManager.reportingFundingEvidence
                        ? "記録中..."
                        : "top-up evidence を記録"}
                    </button>
                  </div>

                  <div className="mt-4">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                      recent funding evidence
                    </div>
                    {account.recentFundingEvidences.length === 0 ? (
                      <div className="mt-2 text-xs leading-5 text-[var(--text-subtle)]">
                        まだ top-up evidence はありません。
                      </div>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {account.recentFundingEvidences.slice(0, 4).map((entry) => (
                          <div
                            key={entry.id}
                            className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-3 text-xs leading-5 text-[var(--text-subtle)]"
                          >
                            <div className="font-semibold text-[var(--text)]">
                              {formatJpycAmount(entry.amount)} /{" "}
                              {FUNDING_EVIDENCE_STATUS_LABELS[entry.status]}
                            </div>
                            <div>
                              tx: {formatTxHash(entry.txHash)} / chain {entry.chainId}
                            </div>
                            <div>to: {entry.toWalletAddress}</div>
                            {entry.matchedBudgetTransactionId ? (
                              <div>
                                matched ledger: {formatUpdatedAt(entry.matchedAt ?? entry.createdAt)}
                              </div>
                            ) : null}
                            {entry.note ? <div>{entry.note}</div> : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                    x402 settlement confirmation
                  </div>
                  <div className="mt-2 text-xs leading-5 text-[var(--text-subtle)]">
                    x402 ready な billable usage は internal ledger で予算消費を記録しつつ、
                    owner が tx hash を確認するまで pending のまま残ります。
                  </div>
                  {pendingX402UsageRecords.length === 0 ? (
                    <div className="mt-2 text-xs leading-5 text-[var(--text-subtle)]">
                      現在 pending の x402 settlement はありません。
                    </div>
                  ) : (
                    <div className="mt-3 grid gap-2">
                      <label className="grid gap-1 text-xs text-[var(--text)]">
                        <span>pending settlement</span>
                        <select
                          className="input"
                          value={selectedPendingX402Usage?.latestPaymentAttempt?.id ?? ""}
                          onChange={(event) =>
                            setSelectedPaymentAttemptId(event.target.value)
                          }
                          disabled={aiManager.updatingPaymentAttempt}
                        >
                          {pendingX402UsageRecords.map((usage) => (
                            <option
                              key={usage.latestPaymentAttempt?.id ?? usage.id}
                              value={usage.latestPaymentAttempt?.id ?? ""}
                            >
                              {CAPABILITY_LABELS[usage.capability]} / {formatJpycAmount(usage.chargeAmount)} /{" "}
                              {formatUpdatedAt(usage.createdAt)}
                            </option>
                          ))}
                        </select>
                      </label>
                      {selectedPendingX402Usage?.latestPaymentAttempt ? (
                        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-3 text-xs leading-5 text-[var(--text-subtle)]">
                          <div>
                            rail:{" "}
                            {
                              SETTLEMENT_RAIL_LABELS[
                                selectedPendingX402Usage.latestPaymentAttempt.rail
                              ]
                            }
                          </div>
                          <div>
                            status:{" "}
                            {
                              PAYMENT_ATTEMPT_STATUS_LABELS[
                                selectedPendingX402Usage.latestPaymentAttempt.status
                              ]
                            }
                          </div>
                          <div>
                            payer:{" "}
                            {selectedPendingX402Usage.latestPaymentAttempt
                              .payerWalletAddress ?? "未設定"}
                          </div>
                          <div>
                            payee:{" "}
                            {selectedPendingX402Usage.latestPaymentAttempt
                              .payeeWalletAddress ?? "未設定"}
                          </div>
                        </div>
                      ) : null}
                      {pendingTimeline.length > 0 ? (
                        <div className="space-y-2">
                          {pendingTimeline.slice(0, 4).map((item) => (
                            <AiManagerPendingTimelineCard
                              key={item.paymentAttemptId}
                              item={item}
                              actions={cardActions}
                            />
                          ))}
                        </div>
                      ) : null}
                      <label className="grid gap-1 text-xs text-[var(--text)]">
                        <span>settlement tx hash</span>
                        <input
                          className="input"
                          value={paymentAttemptTxHash}
                          onChange={(event) =>
                            setPaymentAttemptTxHash(event.target.value)
                          }
                          placeholder="0x..."
                          disabled={aiManager.updatingPaymentAttempt}
                        />
                      </label>
                      <label className="grid gap-1 text-xs text-[var(--text)]">
                        <span>note (optional)</span>
                        <input
                          className="input"
                          value={paymentAttemptNote}
                          onChange={(event) =>
                            setPaymentAttemptNote(event.target.value)
                          }
                          maxLength={240}
                          placeholder="例: owner が PolygonScan で入金確認"
                          disabled={aiManager.updatingPaymentAttempt}
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => void handlePaymentAttemptAction("CONFIRM_X402")}
                          disabled={
                            aiManager.updatingPaymentAttempt ||
                            paymentAttemptTxHash.trim().length === 0
                          }
                        >
                          {aiManager.updatingPaymentAttempt
                            ? "更新中..."
                            : "x402 支払いを確認"}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => void handlePaymentAttemptAction("MARK_FAILED")}
                          disabled={aiManager.updatingPaymentAttempt}
                        >
                          {aiManager.updatingPaymentAttempt
                            ? "更新中..."
                            : "失敗として記録"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                    オーナーフォローアップ
                  </div>
                  {x402FollowUps.length === 0 ? (
                    <div className="mt-2 text-xs leading-5 text-[var(--text-subtle)]">
                      いま処理が必要な x402 / top-up フォローアップはありません。
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {x402FollowUps.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-3 text-xs leading-5 text-[var(--text-subtle)]"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-semibold text-[var(--text)]">
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
                          <div className="mt-1">{entry.detail}</div>
                          <div className="mt-1">
                            next: {entry.actionLabel}
                            {entry.createdAt
                              ? ` / ${formatUpdatedAt(entry.createdAt)}`
                              : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <AiManagerConnectorHealthDigest digest={connectorHealthDigest} />
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                    delivery events
                  </div>
                  {recentX402DeliveryEvents.length === 0 ? (
                    <div className="mt-2 text-xs leading-5 text-[var(--text-subtle)]">
                      まだ x402 delivery event はありません。
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {recentX402DeliveryEvents.slice(0, 4).map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-3 text-xs leading-5 text-[var(--text-subtle)]"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-semibold text-[var(--text)]">
                              {entry.taskLabel ?? entry.capabilityLabel}
                            </div>
                            <span className="status-badge status-badge-neutral">
                              {entry.eventLabel}
                            </span>
                            {entry.pendingObservedCount != null && entry.pendingObservedCount > 1 ? (
                              <span className="status-badge status-badge-neutral">
                                connector {entry.pendingObservedCount}回確認済み
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1">
                            {entry.sourceLabel} / {formatUpdatedAt(entry.createdAt)}
                          </div>
                          {entry.txHash ? <div>tx: {formatTxHash(entry.txHash)}</div> : null}
                          {entry.detail ? <div>{entry.detail}</div> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
                  <AiManagerRecoveryTrendChart summary={x402RecoverySummary} />
                  {x402RecoveryItems.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {x402RecoveryItems.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-3 text-xs leading-5 text-[var(--text-subtle)]"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-semibold text-[var(--text)]">
                              {entry.taskLabel ?? entry.capabilityLabel}
                            </div>
                            <span className="status-badge status-badge-neutral">
                              {entry.recoveryLabel}
                            </span>
                            <span className="status-badge status-badge-neutral">
                              {entry.sourceLabel}
                            </span>
                          </div>
                          <div className="mt-1">{formatUpdatedAt(entry.createdAt)}</div>
                          {entry.detail ? <div className="mt-1">{entry.detail}</div> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                    reconciliation summary
                  </div>
                  <div className="mt-2 text-xs leading-5 text-[var(--text-subtle)]">
                    x402 settlement と top-up evidence の未処理件数をまとめています。
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-3 text-xs leading-5 text-[var(--text-subtle)]">
                      <div className="font-semibold text-[var(--text)]">
                        pending x402
                      </div>
                      <div>
                        {account.reconciliation.pendingX402Count}件 /{" "}
                        {formatJpycAmount(account.reconciliation.pendingX402Amount)}
                      </div>
                      <div>
                        oldest:{" "}
                        {account.reconciliation.oldestPendingX402CreatedAt
                          ? formatUpdatedAt(
                              account.reconciliation.oldestPendingX402CreatedAt
                            )
                          : "なし"}
                      </div>
                      <div>
                        delivery:{" "}
                        {
                          X402_DELIVERY_STATUS_LABELS[
                            account.reconciliation.pendingX402DeliveryStatus
                          ]
                        }
                      </div>
                      {account.reconciliation.latestPendingX402EventSource &&
                      account.reconciliation.latestPendingX402EventType ? (
                        <div>
                          latest event:{" "}
                          {
                            X402_EVENT_SOURCE_LABELS[
                              account.reconciliation.latestPendingX402EventSource
                            ]
                          }{" "}
                          /{" "}
                          {
                            X402_EVENT_TYPE_LABELS[
                              account.reconciliation.latestPendingX402EventType
                            ]
                          }
                          {account.reconciliation.latestPendingX402EventAt
                            ? ` / ${formatUpdatedAt(account.reconciliation.latestPendingX402EventAt)}`
                            : ""}
                        </div>
                      ) : null}
                      {account.reconciliation.pendingX402DeliveryHint ? (
                        <div>{account.reconciliation.pendingX402DeliveryHint}</div>
                      ) : null}
                    </div>
                    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-3 text-xs leading-5 text-[var(--text-subtle)]">
                      <div className="font-semibold text-[var(--text)]">
                        unmatched top-up evidence
                      </div>
                      <div>
                        {account.reconciliation.unmatchedFundingEvidenceCount}件 /{" "}
                        {formatJpycAmount(
                          account.reconciliation.unmatchedFundingEvidenceAmount
                        )}
                      </div>
                      <div>
                        latest confirmed:{" "}
                        {account.reconciliation.latestConfirmedX402At
                          ? formatUpdatedAt(
                              account.reconciliation.latestConfirmedX402At
                            )
                          : "まだありません"}
                      </div>
                      <div>
                        recovery: {account.reconciliation.recoveryCount}件
                        {account.reconciliation.latestRecoveryLabel &&
                        account.reconciliation.latestRecoverySourceLabel
                          ? ` / ${account.reconciliation.latestRecoveryLabel} / ${account.reconciliation.latestRecoverySourceLabel}`
                          : ""}
                      </div>
                      <div>
                        connector {account.reconciliation.recoveryConnectorCount} / owner review{" "}
                        {account.reconciliation.recoveryOwnerReviewCount}
                      </div>
                    </div>
                  </div>
                  {account.reconciliation.failedX402Count > 0 ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-900">
                      failed x402: {account.reconciliation.failedX402Count}件 /{" "}
                      {formatJpycAmount(account.reconciliation.failedX402Amount)}
                    </div>
                  ) : null}
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                    recent x402 activity
                  </div>
                  {recentX402Activity.length === 0 ? (
                    <div className="mt-2 text-xs leading-5 text-[var(--text-subtle)]">
                      まだ x402 activity はありません。
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {recentX402Activity.slice(0, 4).map((entry) => (
                        <div
                          key={entry.paymentAttemptId}
                          className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-3 text-xs leading-5 text-[var(--text-subtle)]"
                        >
                          <div className="font-semibold text-[var(--text)]">
                            {entry.taskLabel ?? entry.capabilityLabel}
                          </div>
                          <div>
                            {formatJpycAmount(entry.amount)} /{" "}
                            {PAYMENT_ATTEMPT_STATUS_LABELS[entry.status]}
                          </div>
                          <div>{formatUpdatedAt(entry.eventAt)}</div>
                          {entry.txHash ? <div>tx: {formatTxHash(entry.txHash)}</div> : null}
                          {entry.failureReason ? <div>{entry.failureReason}</div> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                    recent ledger
                  </div>
                  {account.recentUsageRecords.length === 0 ? (
                    <div className="mt-2 text-xs leading-5 text-[var(--text-subtle)]">
                      まだ利用記録はありません。
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {account.recentUsageRecords.slice(0, 3).map((usage) => (
                        <div
                          key={usage.id}
                          className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-3 text-xs leading-5 text-[var(--text-subtle)]"
                        >
                          <div className="font-semibold text-[var(--text)]">
                            {CAPABILITY_LABELS[usage.capability]}
                          </div>
                          <div>
                            {usage.chargeAmount} {usage.currency} /{" "}
                            {USAGE_BILLING_STATE_LABELS[usage.billingState]}
                          </div>
                          {usage.latestPaymentAttempt ? (
                            <div>
                              settlement:{" "}
                              {SETTLEMENT_RAIL_LABELS[usage.latestPaymentAttempt.rail]} /{" "}
                              {
                                PAYMENT_ATTEMPT_STATUS_LABELS[
                                  usage.latestPaymentAttempt.status
                                ]
                              }
                              {usage.latestPaymentAttempt.txHash
                                ? ` / ${formatTxHash(usage.latestPaymentAttempt.txHash)}`
                                : ""}
                            </div>
                          ) : null}
                          {usage.failureReason ? <div>{usage.failureReason}</div> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                    recent budget ops
                  </div>
                  {account.recentBudgetTransactions.length === 0 ? (
                    <div className="mt-2 text-xs leading-5 text-[var(--text-subtle)]">
                      まだ予算操作はありません。
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {account.recentBudgetTransactions.slice(0, 4).map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-3 text-xs leading-5 text-[var(--text-subtle)]"
                        >
                          <div className="font-semibold text-[var(--text)]">
                            {entry.direction === "CREDIT" ? "+" : "-"}
                            {entry.amount} {entry.currency}
                          </div>
                          <div>
                            {BUDGET_TRANSACTION_TYPE_LABELS[entry.transactionType]} / 残高 {entry.resultingAvailableAmount}{" "}
                            {entry.currency}
                          </div>
                          {entry.note ? <div>{entry.note}</div> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs leading-6 text-[var(--text-subtle)]">
              人間の Manager は Phase 1 では閲覧のみです。設定変更と承認は owner が持ちます。
            </div>
            <button
              type="submit"
              className="btn"
              disabled={
                aiManager.saving ||
                form.displayName.trim().length === 0 ||
                form.allowedBillableCapabilities.length === 0
              }
            >
              {aiManager.saving ? "保存中..." : "AIマネージャー設定を保存"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
