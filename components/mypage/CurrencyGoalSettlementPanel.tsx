"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";

import { AiSuggestionsCard } from "@/components/mypage/AiSuggestionsCard";
import { useCurrencyGoalSettlementPanel } from "@/components/mypage/useCurrencyGoalSettlementPanel";
import {
  getNextActionSuggestions,
  type NextActionSuggestion,
} from "@/lib/creator-ai/nextActionSuggestions";
import {
  formatAmountByCurrency,
  type SummaryViewData,
} from "@/lib/mypage/accountPageTypes";
import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";

export function CurrencyGoalSettlementPanel(props: {
  currency: CurrencyCode;
  projectId: string | null;
  address: string | null;
  isConnected: boolean;
  initialSummary?: SummaryViewData | null;
}) {
  const {
    currency,
    projectId,
    address,
    isConnected,
    initialSummary = null,
  } = props;
  const router = useRouter();
  const pathname = usePathname();
  const {
    summary,
    summaryLoading,
    goalSaving,
    msg,
    targetInput,
    setTargetInput,
    deadlineInput,
    setDeadlineInput,
    refreshSummary,
    onSaveGoal,
    onAchieveGoal,
    isOwner,
    goalIsSet,
    goalAchieved,
    canAchieve,
  } = useCurrencyGoalSettlementPanel({
    currency,
    projectId,
    address,
    isConnected,
    initialSummary,
  });

  const suggestions = React.useMemo(() => {
    if (!summary) {
      return [];
    }

    return getNextActionSuggestions({
      summary,
      isOwner,
    });
  }, [isOwner, summary]);

  const suggestionsEmptyLabel = !projectId
    ? "Project 作成後に提案が表示されます"
    : !summary
      ? "Summary を取得すると提案が表示されます"
      : "現在の状態では追加提案はありません";
  const goalInputRef = React.useRef<HTMLInputElement | null>(null);
  const summarySectionRef = React.useRef<HTMLDivElement | null>(null);
  const achieveButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const currencyKey = currency.toLowerCase();
  const goalInputAnchorId = `goal-input-${currencyKey}`;
  const summaryAnchorId = `goal-summary-${currencyKey}`;
  const achieveAnchorId = `goal-achieve-${currencyKey}`;

  const workspaceBasePath = React.useMemo(() => {
    if (!pathname) {
      return null;
    }

    const myPageIndex = pathname.indexOf("/mypage");
    if (myPageIndex === -1) {
      return null;
    }

    return pathname.slice(0, myPageIndex + "/mypage".length);
  }, [pathname]);

  const scrollToElement = React.useCallback((element: HTMLElement | null) => {
    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const focusAndScroll = React.useCallback(
    (element: HTMLInputElement | HTMLButtonElement | null) => {
      if (!element) {
        return;
      }

      element.focus({ preventScroll: true });
      scrollToElement(element);
    },
    [scrollToElement]
  );

  const openAdvancedAnchor = React.useCallback(
    (anchorId: string) => {
      if (!pathname) {
        return;
      }

      const onAdvancedSurface =
        pathname === workspaceBasePath || pathname === `${workspaceBasePath}/advanced`;

      if (onAdvancedSurface) {
        scrollToElement(document.getElementById(anchorId));
        return;
      }

      if (workspaceBasePath) {
        router.push(`${workspaceBasePath}/advanced#${anchorId}`, {
          scroll: true,
        });
      }
    },
    [pathname, router, scrollToElement, workspaceBasePath]
  );

  const handleSelectSuggestion = React.useCallback(
    (suggestion: NextActionSuggestion) => {
      switch (suggestion.recommendedUiTarget) {
        case "goal":
          focusAndScroll(goalInputRef.current);
          return;
        case "summary":
          scrollToElement(summarySectionRef.current);
          return;
        case "achieve":
          focusAndScroll(achieveButtonRef.current);
          return;
        case "plan":
          openAdvancedAnchor(`settlement-plan-${currencyKey}`);
          return;
        case "bridge":
          openAdvancedAnchor(`settlement-bridge-${currencyKey}`);
          return;
        case "distributionResult":
          openAdvancedAnchor(`settlement-distribution-result-${currencyKey}`);
          return;
        case "project":
          scrollToElement(goalInputRef.current);
          return;
        default:
          return;
      }
    },
    [currencyKey, focusAndScroll, openAdvancedAnchor, scrollToElement]
  );

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) {
      return;
    }

    if (hash === goalInputAnchorId) {
      focusAndScroll(goalInputRef.current);
      return;
    }

    if (hash === summaryAnchorId) {
      scrollToElement(summarySectionRef.current);
      return;
    }

    if (hash === achieveAnchorId) {
      focusAndScroll(achieveButtonRef.current);
    }
  }, [
    achieveAnchorId,
    focusAndScroll,
    goalInputAnchorId,
    scrollToElement,
    summaryAnchorId,
  ]);

  return (
    <div className="space-y-3">
      <div className="font-semibold">Project Goal（{currency}）</div>

      {!projectId ? (
        <>
          <div className="text-sm text-gray-600">
            {currency} 用の Project がありません。上の Project で作成してください。
          </div>
          <AiSuggestionsCard
            suggestions={suggestions}
            emptyLabel={suggestionsEmptyLabel}
          />
        </>
      ) : (
        <>
          <div
            id={goalInputAnchorId}
            className="grid grid-cols-1 gap-3 md:grid-cols-2 scroll-mt-24"
          >
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Target {currency}</div>
              <input
                ref={goalInputRef}
                className="w-full rounded-lg border px-3 py-2 font-mono text-sm"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder={currency === "USDC" ? "例: 1000.00" : "例: 1000"}
                disabled={goalSaving || summaryLoading}
                inputMode="decimal"
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-gray-500">Deadline (optional)</div>
              <input
                className="w-full rounded-lg border px-3 py-2 font-mono text-sm"
                type="date"
                value={deadlineInput}
                onChange={(e) => setDeadlineInput(e.target.value)}
                disabled={goalSaving || summaryLoading}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-lg bg-black text-white px-4 py-2 text-sm disabled:opacity-40"
              onClick={() => void onSaveGoal()}
              disabled={!isConnected || !address || goalSaving}
              title={!isConnected ? "ウォレット接続が必要です" : ""}
              type="button"
            >
              {goalSaving ? "Saving..." : "Goal を保存"}
            </button>

            <button
              className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
              onClick={() => void refreshSummary()}
              disabled={!projectId || summaryLoading}
              type="button"
            >
              {summaryLoading ? "Loading..." : "Summary更新"}
            </button>

            {msg ? <span className="text-xs text-gray-600">{msg}</span> : null}
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 space-y-2">
            <div
              ref={summarySectionRef}
              id={summaryAnchorId}
              className="scroll-mt-24"
            />
            <div className="text-sm font-medium">目標達成確定（myPageオーナーのみ）</div>
            <div className="text-xs text-gray-600">
              目標に到達したあと、プロジェクトオーナー本人が「目標達成を確定」できます。
            </div>
            <div className="text-xs text-gray-700">
              進捗:{" "}
              {summary ? (
                (() => {
                  const unit = summary.project.currency ?? currency;
                  const current =
                    summary.progress.confirmedTotal ?? summary.progress.confirmedJpyc;
                  const target =
                    summary.progress.targetAmount ?? summary.progress.targetJpyc;
                  return `${formatAmountByCurrency(current, unit)} / ${
                    target != null ? formatAmountByCurrency(target, unit) : "—"
                  } ${unit}`;
                })()
              ) : (
                "—"
              )}
            </div>
            <div className="text-xs text-gray-700">
              Goal状態:{" "}
              {goalAchieved
                ? `達成確定済み (${summary?.goal?.achievedAt ?? "-"})`
                : "未確定"}
            </div>
            <div className="text-xs text-gray-700">
              Project status: {summary?.project.status ?? "—"}
            </div>
            <AiSuggestionsCard
              suggestions={suggestions}
              loading={summaryLoading && !summary}
              emptyLabel={suggestionsEmptyLabel}
              onSelectSuggestion={handleSelectSuggestion}
            />
            <div className="flex items-center gap-2">
              <button
                ref={achieveButtonRef}
                id={achieveAnchorId}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
                onClick={() => void onAchieveGoal()}
                disabled={!canAchieve || summaryLoading}
                title={
                  !isConnected
                    ? "ウォレット接続が必要です"
                    : !isOwner
                    ? "プロジェクトオーナーのみ確定できます"
                    : !goalIsSet
                    ? "先にGoalを設定してください"
                    : goalAchieved
                    ? "すでに達成確定済みです"
                    : !summary
                    ? "Summaryを更新してください"
                    : "達成条件を満たしていません"
                }
                type="button"
              >
                {summaryLoading
                  ? "Loading..."
                  : goalAchieved
                  ? "達成確定済み"
                  : "目標達成を確定"}
              </button>
              {!isOwner ? (
                <span className="text-xs text-amber-700">
                  現在接続中のウォレットはオーナーではありません
                </span>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
