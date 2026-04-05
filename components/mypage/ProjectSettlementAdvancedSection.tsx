"use client";

import React from "react";

export function ProjectSettlementAdvancedSection(props: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">
              {props.title}
            </div>
            <div className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
              {props.description}
            </div>
            <div className="mt-1 text-[11px] leading-5 text-[var(--muted)]">
              通常フローで足りないときだけ開く、operator 向けの補助操作です。
            </div>
          </div>
          <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-[11px] font-medium text-[var(--text-subtle)]">
            必要時のみ
          </span>
        </div>
      </summary>
      <div className="mt-4">{props.children}</div>
    </details>
  );
}
