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
    <section
      className="rounded-xl px-4 py-4 sm:px-5"
      style={{
        background: "var(--accent-subtle)",
        border: "1px solid var(--accent-muted)",
      }}
    >
      {/* キッカー */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--accent)" }}
        >
          <svg viewBox="0 0 20 20" fill="none" style={{ width: 14, height: 14, color: "#fff" }}>
            <path d="M10 3a7 7 0 1 1 0 14A7 7 0 0 1 10 3z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7.5 10.5c.5 1.2 1.5 2 2.5 2s2-.8 2.5-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="7.5" cy="8.5" r="0.75" fill="currentColor" />
            <circle cx="12.5" cy="8.5" r="0.75" fill="currentColor" />
          </svg>
        </div>
        <span className="section-kicker">AIコンシェルジュ</span>
      </div>

      <h2 className="text-base font-semibold text-[var(--text)]">
        {props.title}
      </h2>
      <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
        {props.body}
      </p>

      {/* ガイドポイント */}
      <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
        {props.points.map((point, i) => (
          <div
            key={point.title}
            className="rounded-xl bg-[var(--surface)] px-4 py-3"
            style={{ border: "1px solid var(--line)" }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}
              >
                {i + 1}
              </span>
              <p className="text-sm font-semibold text-[var(--text)]">{point.title}</p>
            </div>
            <p className="text-xs leading-5 text-[var(--text-subtle)]">{point.body}</p>
          </div>
        ))}
      </div>

      {props.children ? (
        <div className="mt-4 flex flex-wrap gap-2">{props.children}</div>
      ) : null}
    </section>
  );
}
