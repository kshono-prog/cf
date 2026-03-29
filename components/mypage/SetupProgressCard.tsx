"use client";

import type { SetupProgressStep } from "@/lib/growth/setup";

type Props = {
  steps: SetupProgressStep[];
  completedCount: number;
  totalCount: number;
  completionPercentage: number;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  onPrimaryAction?: () => void;
};

function renderPrimaryAction(props: Props) {
  if (props.primaryCtaHref) {
    return (
      <a href={props.primaryCtaHref} className="btn">
        {props.primaryCtaLabel ?? "次へ進む"}
      </a>
    );
  }

  if (props.onPrimaryAction) {
    return (
      <button type="button" className="btn" onClick={props.onPrimaryAction}>
        {props.primaryCtaLabel ?? "次へ進む"}
      </button>
    );
  }

  return null;
}

export function SetupProgressCard(props: Props) {
  const primaryAction = renderPrimaryAction(props);

  return (
    <section className="surface-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
            Public Setup
          </div>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">
            公開までの進み具合
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
            公開ページを整えて、最初の支援と拡散まで進めるためのチェックです。
          </p>
        </div>
        <div className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700">
          {props.completionPercentage}% 完了
        </div>
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-sky-600 transition-[width] duration-300"
          style={{ width: `${props.completionPercentage}%` }}
        />
      </div>

      <div className="mt-2 text-xs text-[var(--text-subtle)]">
        {props.completedCount} / {props.totalCount} ステップ完了
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {props.steps.map((step) => (
          <div
            key={step.key}
            className={`rounded-2xl border px-4 py-3 ${
              step.ready
                ? "border-emerald-200 bg-emerald-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-[var(--text)]">
                {step.label}
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  step.ready
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-white text-slate-600"
                }`}
              >
                {step.ready ? "完了" : "未完了"}
              </span>
            </div>
            <div className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
              {step.detail}
            </div>
          </div>
        ))}
      </div>

      {primaryAction ? (
        <div className="mt-4 flex justify-start">{primaryAction}</div>
      ) : null}
    </section>
  );
}
