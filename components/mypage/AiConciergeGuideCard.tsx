"use client";

import type { ReactNode } from "react";

type GuidePoint = {
  title: string;
  body: string;
};

type Props = {
  title: string;
  body: string;
  points: GuidePoint[];
  children?: ReactNode;
};

export function AiConciergeGuideCard(props: Props) {
  return (
    <section className="sheet-section px-4 py-4 sm:px-5">
      <div className="section-kicker">AI Concierge</div>
      <h2 className="mt-2 text-base font-semibold text-[var(--text)]">
        {props.title}
      </h2>
      <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
        {props.body}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {props.points.map((point) => (
          <div key={point.title} className="data-tile px-4 py-3">
            <div className="text-sm font-semibold text-[var(--text)]">
              {point.title}
            </div>
            <p className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
              {point.body}
            </p>
          </div>
        ))}
      </div>

      {props.children ? (
        <div className="mt-4 flex flex-wrap gap-2">{props.children}</div>
      ) : null}
    </section>
  );
}
