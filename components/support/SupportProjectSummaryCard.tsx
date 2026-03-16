"use client";

import Link from "next/link";

import { Avatar } from "@/components/shared/Avatar";
import type { SupportProjectView } from "@/lib/supportProfileView";

type CreatorSummary = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  href?: string;
};

type SupportProjectSummaryCardBaseProps = {
  creator: CreatorSummary;
  project: SupportProjectView;
  actionLabel: string;
  isSelected?: boolean;
};

type SupportProjectSummaryCardProps =
  | (SupportProjectSummaryCardBaseProps & {
      actionHref: string;
      onAction?: never;
    })
  | (SupportProjectSummaryCardBaseProps & {
      actionHref?: never;
      onAction: () => void;
    });

function formatSupportAmount(
  value: number | null,
  currency: "JPYC" | "USDC"
): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return currency === "USDC" ? "0.00 USDC" : `0 ${currency}`;
  }

  if (currency === "USDC") {
    return `${value.toLocaleString("ja-JP", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} USDC`;
  }

  return `${Math.floor(value).toLocaleString("ja-JP")} ${currency}`;
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function getStatusLabel(project: SupportProjectView): string {
  if (project.status === "ACHIEVED") return "目標達成済み";
  if (project.status === "NO_GOAL") return "目標未設定";
  return "受付中";
}

export function SupportProjectSummaryCard(
  props: SupportProjectSummaryCardProps
) {
  const isSelected = props.isSelected === true;
  const progressPct = Math.floor(clampPct(props.project.progressPct));
  const actionClassName = isSelected ? "btn-secondary" : "btn";
  const creatorContent = (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar
        src={props.creator.avatarUrl}
        alt={`${props.creator.displayName} のアイコン`}
        fallbackText={props.creator.displayName.slice(0, 1) || "?"}
        size={44}
      />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-[var(--text)]">
          {props.creator.displayName}
        </div>
        <div className="truncate text-xs text-[var(--text-subtle)]">
          @{props.creator.username}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`rounded-3xl border px-4 py-4 transition sm:px-5 ${
        isSelected
          ? "border-[var(--support)] bg-[var(--surface-subtle)]"
          : "border-[var(--line)] bg-white"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {props.creator.href ? (
          <Link
            href={props.creator.href}
            className="min-w-0 transition hover:opacity-80"
          >
            {creatorContent}
          </Link>
        ) : (
          creatorContent
        )}

        {props.actionHref ? (
          <Link href={props.actionHref} className={actionClassName}>
            {props.actionLabel}
          </Link>
        ) : (
          <button
            type="button"
            className={actionClassName}
            onClick={props.onAction}
          >
            {props.actionLabel}
          </button>
        )}
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
            {props.project.currency}
          </span>
          <span className="text-xs font-medium text-[var(--text-subtle)]">
            {getStatusLabel(props.project)}
          </span>
        </div>

        <div className="mt-2 text-[15px] font-semibold text-[var(--text)]">
          {props.project.title}
        </div>
        {props.project.description ? (
          <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
            {props.project.description}
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="surface-subtle px-4 py-3">
          <div className="text-[11px] font-medium text-[var(--text-subtle)]">
            集まった応援
          </div>
          <div className="mt-1 text-sm font-semibold text-[var(--text)]">
            {formatSupportAmount(
              props.project.confirmedAmount,
              props.project.currency
            )}
          </div>
        </div>
        <div className="surface-subtle px-4 py-3">
          <div className="text-[11px] font-medium text-[var(--text-subtle)]">
            目標
          </div>
          <div className="mt-1 text-sm font-semibold text-[var(--text)]">
            {props.project.targetAmount != null
              ? formatSupportAmount(
                  props.project.targetAmount,
                  props.project.currency
                )
              : "未設定"}
          </div>
        </div>
        <div className="surface-subtle px-4 py-3">
          <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-[var(--text-subtle)]">
            <span>進捗</span>
            <span className="font-semibold text-[var(--text)]">
              {progressPct}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-[var(--support)]"
              style={{ width: `${clampPct(props.project.progressPct)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
