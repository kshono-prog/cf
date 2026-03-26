"use client";

import Link from "next/link";
import { useState } from "react";

import { WorkspaceEmptyState } from "@/components/mypage/WorkspaceFeedback";
import type {
  ManagerDeskAiSuggestion,
  ManagerDeskAiSuggestionTone,
} from "@/lib/operations/managerDeskAiAssistance";

type SuggestionDecision = "ADOPTED" | "DEFERRED" | "DISMISSED";

function formatDateTime(value: string | null): string {
  if (!value) return "未設定";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未設定";
  return date.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toneBadgeClass(tone: ManagerDeskAiSuggestionTone): string {
  return tone === "attention"
    ? "status-badge status-badge-warn"
    : "status-badge status-badge-neutral";
}

function decisionLabel(decision: SuggestionDecision | null): string {
  if (decision === "ADOPTED") return "採用済み";
  if (decision === "DEFERRED") return "保留中";
  if (decision === "DISMISSED") return "今回は見送り";
  return "未判断";
}

function decisionBadgeClass(decision: SuggestionDecision | null): string {
  if (decision === "ADOPTED") return "status-badge status-badge-success";
  if (decision === "DEFERRED") return "status-badge status-badge-warn";
  if (decision === "DISMISSED") return "status-badge status-badge-neutral";
  return "status-badge status-badge-neutral";
}

function DecisionButton(props: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        props.active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
      }`}
    >
      {props.label}
    </button>
  );
}

export function ManagerDeskAiSuggestionsSection(props: {
  eyebrow: string;
  title: string;
  summary: string;
  suggestions: ManagerDeskAiSuggestion[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  const [decisions, setDecisions] = useState<Record<string, SuggestionDecision>>(
    {}
  );

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
            {props.eyebrow}
          </div>
          <h2 className="mt-2 text-lg font-semibold text-[var(--text)]">
            {props.title}
          </h2>
        </div>
        <div className="text-xs text-[var(--text-subtle)]">
          採用 / 保留 / 見送りは、この画面での判断メモです
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-[var(--text-subtle)]">
        {props.summary}
      </p>

      {props.suggestions.length > 0 ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {props.suggestions.map((suggestion) => {
            const decision = decisions[suggestion.id] ?? null;
            return (
              <article
                key={suggestion.id}
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={toneBadgeClass(suggestion.tone)}>
                    {suggestion.tone === "attention" ? "優先対応" : "確認候補"}
                  </span>
                  <span className="status-badge status-badge-neutral">
                    {suggestion.sourceLabel}
                  </span>
                  <span className={decisionBadgeClass(decision)}>
                    {decisionLabel(decision)}
                  </span>
                </div>

                <div className="mt-3 text-sm font-semibold text-[var(--text)]">
                  {suggestion.title}
                </div>
                <div className="mt-2 text-sm leading-6 text-[var(--text-subtle)]">
                  理由: {suggestion.reason}
                </div>
                <div className="mt-2 text-sm leading-6 text-[var(--text-subtle)]">
                  提案: {suggestion.recommendation}
                </div>
                <div className="mt-2 text-xs text-[var(--text-subtle)]">
                  期限 {formatDateTime(suggestion.dueAt)}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <DecisionButton
                    active={decision === "ADOPTED"}
                    label="採用"
                    onClick={() => {
                      setDecisions((current) => ({
                        ...current,
                        [suggestion.id]: "ADOPTED",
                      }));
                    }}
                  />
                  <DecisionButton
                    active={decision === "DEFERRED"}
                    label="保留"
                    onClick={() => {
                      setDecisions((current) => ({
                        ...current,
                        [suggestion.id]: "DEFERRED",
                      }));
                    }}
                  />
                  <DecisionButton
                    active={decision === "DISMISSED"}
                    label="見送り"
                    onClick={() => {
                      setDecisions((current) => ({
                        ...current,
                        [suggestion.id]: "DISMISSED",
                      }));
                    }}
                  />
                  <Link
                    href={suggestion.href}
                    className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-gray-400"
                  >
                    {suggestion.actionLabel}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-4">
          <WorkspaceEmptyState
            compact
            title={props.emptyTitle}
            description={props.emptyDescription}
          />
        </div>
      )}
    </section>
  );
}
