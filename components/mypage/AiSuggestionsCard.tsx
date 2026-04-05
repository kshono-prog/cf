"use client";

import type { NextActionSuggestion } from "@/lib/creator-ai/nextActionSuggestions";

type Props = {
  suggestions: NextActionSuggestion[];
  loading?: boolean;
  emptyLabel?: string;
  onSelectSuggestion?: (suggestion: NextActionSuggestion) => void;
  selectLabel?: string;
};

function priorityBadgeClass(priority: NextActionSuggestion["priority"]): string {
  if (priority === "high") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (priority === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-gray-200 bg-gray-100 text-gray-700";
}

function targetLabel(
  target: NextActionSuggestion["recommendedUiTarget"]
): string {
  switch (target) {
    case "project":
      return "Project";
    case "goal":
      return "Goal";
    case "summary":
      return "Summary";
    case "plan":
      return "Plan";
    case "distributionResult":
      return "Distribution Result";
    case "bridge":
      return "Bridge";
    case "achieve":
      return "Achieve";
    default:
      return target;
  }
}

export function AiSuggestionsCard(props: Props) {
  const {
    suggestions,
    loading = false,
    emptyLabel = "提案はまだありません",
    onSelectSuggestion,
    selectLabel = "この場所を開く",
  } = props;

  return (
    <div
      className="rounded-xl border border-gray-200 bg-[var(--surface)] p-4 space-y-3"
      aria-busy={loading}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-gray-900">
          AI Suggestions
        </div>
        <div className="text-[11px] text-gray-500">approval-based</div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
          提案を読み込んでいます...
        </div>
      ) : suggestions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 space-y-2"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="text-sm font-medium text-gray-900">
                  {suggestion.title}
                </div>
                <span
                  className={`inline-flex w-fit rounded-full border px-2 py-1 text-[11px] font-medium ${priorityBadgeClass(
                    suggestion.priority
                  )}`}
                >
                  {suggestion.priority}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px] text-gray-600">
                <span className="rounded-full border border-gray-200 bg-[var(--surface)] px-2 py-1">
                  target: {targetLabel(suggestion.recommendedUiTarget)}
                </span>
                <span className="rounded-full border border-gray-200 bg-[var(--surface)] px-2 py-1">
                  {suggestion.requiresHumanApproval
                    ? "human approval required"
                    : "approval optional"}
                </span>
              </div>

              <div className="text-xs leading-5 text-gray-700">
                {suggestion.reason}
              </div>
              {onSelectSuggestion ? (
                <div className="pt-1">
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text)] transition hover:border-[var(--line)]"
                    onClick={() => onSelectSuggestion(suggestion)}
                  >
                    {selectLabel}
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
