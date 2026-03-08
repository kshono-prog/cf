"use client";

import React from "react";

import { ProjectSettlementPanel } from "@/components/mypage/ProjectSettlementPanel";
import { useCurrencyGoalSettlementPanel } from "@/components/mypage/useCurrencyGoalSettlementPanel";
import {
  formatAmountByCurrency,
  type SummaryViewData,
} from "@/lib/mypage/accountPageTypes";
import type { ProjectSettlementData } from "@/lib/projectSettlementView";
import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";

export function CurrencyGoalSettlementPanel(props: {
  currency: CurrencyCode;
  projectId: string | null;
  address: string | null;
  isConnected: boolean;
  initialSummary?: SummaryViewData | null;
  initialSettlementData?: ProjectSettlementData | null;
}) {
  const {
    currency,
    projectId,
    address,
    isConnected,
    initialSummary = null,
    initialSettlementData = null,
  } = props;
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

  return (
    <div className="space-y-3">
      <div className="font-semibold">Project Goal（{currency}）</div>

      {!projectId ? (
        <div className="text-sm text-gray-600">
          {currency} 用の Project がありません。上の Project で作成してください。
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Target {currency}</div>
              <input
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
            <div className="flex items-center gap-2">
              <button
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

          <div className="pt-2">
            <ProjectSettlementPanel
              projectId={projectId}
              walletAddress={address ?? null}
              isConnected={isConnected}
              projectCurrency={currency}
              initialData={initialSettlementData}
            />
          </div>
        </>
      )}
    </div>
  );
}
