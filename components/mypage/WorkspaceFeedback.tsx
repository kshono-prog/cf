"use client";

import React from "react";

export type WorkspaceNoticeTone =
  | "success"
  | "error"
  | "info"
  | "attention";

const NOTICE_STYLES: Record<
  WorkspaceNoticeTone,
  {
    wrapper: string;
    eyebrow: string;
    title: string;
    description: string;
  }
> = {
  success: {
    wrapper: "border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.07)]",
    eyebrow: "text-emerald-600",
    title: "text-[var(--text)]",
    description: "text-[var(--text-subtle)]",
  },
  error: {
    wrapper: "border-[rgba(244,63,94,0.45)] bg-[rgba(244,63,94,0.07)]",
    eyebrow: "text-rose-600",
    title: "text-[var(--text)]",
    description: "text-[var(--text-subtle)]",
  },
  info: {
    wrapper: "border-[var(--line)] bg-[var(--surface-subtle)]",
    eyebrow: "text-[var(--muted)]",
    title: "text-[var(--text)]",
    description: "text-[var(--text-subtle)]",
  },
  attention: {
    wrapper: "border-[rgba(245,158,11,0.45)] bg-[rgba(245,158,11,0.07)]",
    eyebrow: "text-amber-600",
    title: "text-[var(--text)]",
    description: "text-[var(--text-subtle)]",
  },
};

const NOTICE_LABELS: Record<WorkspaceNoticeTone, string> = {
  success: "完了",
  error: "エラー",
  info: "案内",
  attention: "次にやること",
};

export function WorkspaceStatusNotice(props: {
  tone: WorkspaceNoticeTone;
  title: string;
  description?: string;
  onRetry?: () => void;
  children?: React.ReactNode;
}) {
  const styles = NOTICE_STYLES[props.tone];
  return (
    <div className={`radius-static-lg border-l-2 border-r-0 border-y-0 px-4 py-3 ${styles.wrapper}`}>
      <div
        className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${styles.eyebrow}`}
      >
        {NOTICE_LABELS[props.tone]}
      </div>
      <div className={`mt-1 text-sm font-semibold ${styles.title}`}>
        {props.title}
      </div>
      {props.description ? (
        <div className={`mt-1 text-xs leading-5 ${styles.description}`}>
          {props.description}
        </div>
      ) : null}
      {(props.children || props.onRetry) ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {props.children}
          {props.onRetry ? (
            <button
              type="button"
              className="btn-raised btn-raised-sm"
              onClick={props.onRetry}
            >
              もう一度試す
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function WorkspaceEmptyState(props: {
  title: string;
  description: string;
  compact?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`radius-static-lg border-l-2 border-r-0 border-y-0 border-dashed border-[var(--line)] bg-[var(--surface-subtle)] ${
        props.compact ? "px-3 py-2" : "px-4 py-3"
      }`}
    >
      <div className="text-xs font-medium text-[var(--text)]">{props.title}</div>
      <div
        className={`mt-1 leading-5 text-[var(--text-subtle)] ${
          props.compact ? "text-[11px]" : "text-sm"
        }`}
      >
        {props.description}
      </div>
      {props.children ? <div className="mt-3">{props.children}</div> : null}
    </div>
  );
}

export function WorkspaceLoadingCard(props: {
  title: string;
  description?: string;
}) {
  return (
    <div className="radius-static-lg border-l-2 border-r-0 border-y-0 border-[var(--line)] bg-[var(--surface-subtle)] p-4">
      <div className="text-sm font-semibold text-[var(--text)]">{props.title}</div>
      <div className="mt-2 text-xs text-[var(--text-subtle)]">
        {props.description ?? "必要な面だけを順番に読み込んでいます。"}
      </div>
    </div>
  );
}
