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
        shell: "accent-surface-amber",
        badge: "border-[var(--warning)]/30 bg-[var(--warning)]/10 accent-text-amber",
        button: "btn",
      };
    case "emerald":
      return {
        shell: "accent-surface-emerald",
        badge: "border-[var(--support)]/30 bg-[var(--support)]/10 accent-text-emerald",
        button: "btn",
      };
    case "sky":
    default:
      return {
        shell: "border border-[var(--accent)]/20 bg-[var(--accent)]/5",
        badge: "border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]",
        button: "btn",
      };
  }
}

export function GrowthCoachCard(props: Props) {
  const styles = toneClasses(props.coach.tone);

  return (
    <section className={`rounded-3xl p-5 sm:p-6 ${styles.shell}`}>
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
          className={styles.button}
        >
          {props.coach.ctaLabel}
        </a>
      </div>
    </section>
  );
}
