"use client";

import type { GrowthCoachCardModel } from "@/lib/growth/coach";

type Props = {
  coach: GrowthCoachCardModel;
};

function toneClasses(tone: GrowthCoachCardModel["tone"]): {
  shell: string;
  badge: string;
  button: string;
} {
  switch (tone) {
    case "amber":
      return {
        shell: "border-amber-200 bg-amber-50",
        badge: "border-amber-200 bg-white text-amber-700",
        button: "bg-amber-600 text-white hover:bg-amber-700",
      };
    case "emerald":
      return {
        shell: "border-emerald-200 bg-emerald-50",
        badge: "border-emerald-200 bg-white text-emerald-700",
        button: "bg-emerald-600 text-white hover:bg-emerald-700",
      };
    case "sky":
    default:
      return {
        shell: "border-sky-200 bg-sky-50",
        badge: "border-sky-200 bg-white text-sky-700",
        button: "bg-slate-900 text-white hover:bg-slate-800",
      };
  }
}

export function GrowthCoachCard(props: Props) {
  const styles = toneClasses(props.coach.tone);

  return (
    <section className={`rounded-3xl border p-5 sm:p-6 ${styles.shell}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div
            className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${styles.badge}`}
          >
            {props.coach.stageLabel}
          </div>
          <h2 className="mt-3 text-xl font-semibold text-[var(--text)]">
            {props.coach.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-subtle)]">
            {props.coach.body}
          </p>
        </div>
        <a
          href={props.coach.href}
          className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition ${styles.button}`}
        >
          {props.coach.ctaLabel}
        </a>
      </div>
    </section>
  );
}
