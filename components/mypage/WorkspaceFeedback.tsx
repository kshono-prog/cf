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
    wrapper: "border-emerald-200 bg-emerald-50",
    eyebrow: "text-emerald-700",
    title: "text-emerald-950",
    description: "text-emerald-800",
  },
  error: {
    wrapper: "border-rose-200 bg-rose-50",
    eyebrow: "text-rose-700",
    title: "text-rose-950",
    description: "text-rose-800",
  },
  info: {
    wrapper: "border-slate-200 bg-slate-50",
    eyebrow: "text-slate-600",
    title: "text-slate-900",
    description: "text-slate-700",
  },
  attention: {
    wrapper: "border-amber-200 bg-amber-50",
    eyebrow: "text-amber-700",
    title: "text-amber-950",
    description: "text-amber-800",
  },
};

export function WorkspaceStatusNotice(props: {
  tone: WorkspaceNoticeTone;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  const styles = NOTICE_STYLES[props.tone];
  const label =
    props.tone === "success"
      ? "完了"
      : props.tone === "error"
        ? "要確認"
        : props.tone === "attention"
          ? "次にやること"
          : "案内";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${styles.wrapper}`}>
      <div
        className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${styles.eyebrow}`}
      >
        {label}
      </div>
      <div className={`mt-1 text-sm font-semibold ${styles.title}`}>
        {props.title}
      </div>
      {props.description ? (
        <div className={`mt-1 text-xs leading-5 ${styles.description}`}>
          {props.description}
        </div>
      ) : null}
      {props.children ? <div className="mt-3">{props.children}</div> : null}
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
      className={`rounded-2xl border border-dashed border-gray-200 bg-gray-50 ${
        props.compact ? "px-3 py-2" : "px-4 py-3"
      }`}
    >
      <div className="text-xs font-medium text-gray-900">{props.title}</div>
      <div
        className={`mt-1 leading-5 text-gray-600 ${
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
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-gray-900">{props.title}</div>
      <div className="mt-2 text-xs text-gray-500">
        {props.description ?? "必要な面だけを順番に読み込んでいます。"}
      </div>
    </div>
  );
}
