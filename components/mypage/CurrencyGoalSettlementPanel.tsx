"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { ProjectSettlementPanel } from "@/components/mypage/ProjectSettlementPanel";

type CurrencyCode = "JPYC" | "USDC";

type SummaryProject = {
  currency?: CurrencyCode;
  status: string;
  ownerAddress: string | null;
};

type SummaryGoal = {
  achievedAt: string | null;
  targetAmount?: number;
  targetAmountJpyc: number;
  deadline: string | null;
} | null;

type SummaryProgress = {
  confirmedJpyc: number;
  confirmedTotal?: number;
  targetAmount?: number | null;
  targetJpyc: number | null;
};

type SummaryResponseOk = {
  ok: true;
  project: SummaryProject;
  goal: SummaryGoal;
  progress: SummaryProgress;
};

type SummaryResponseErr = {
  ok: false;
  error: string;
};

type SummaryResponse = SummaryResponseOk | SummaryResponseErr;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function formatAmountByCurrency(amount: number, currency: CurrencyCode): string {
  if (!Number.isFinite(amount)) {
    return currency === "USDC" ? "0.00" : "0";
  }
  if (currency === "USDC") {
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return Math.floor(amount).toLocaleString();
}

export function CurrencyGoalSettlementPanel(props: {
  currency: CurrencyCode;
  projectId: string | null;
  address: string | null;
  isConnected: boolean;
}) {
  const { currency, projectId, address, isConnected } = props;

  const [targetInput, setTargetInput] = useState<string>("");
  const [deadlineInput, setDeadlineInput] = useState<string>("");
  const [summary, setSummary] = useState<SummaryResponseOk | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [goalSaving, setGoalSaving] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refreshSummary = useCallback(async () => {
    if (!projectId) {
      setSummary(null);
      setMsg(null);
      return;
    }

    setSummaryLoading(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/summary`,
        { cache: "no-store" }
      );
      const json: unknown = await res.json().catch(() => null);

      if (!json || typeof json !== "object") {
        setSummary(null);
        setMsg("SUMMARY_INVALID_RESPONSE");
        return;
      }

      const r = json as Partial<SummaryResponse>;
      if (r.ok === true && isRecord(r.project) && isRecord(r.progress)) {
        const ok = json as SummaryResponseOk;
        setSummary(ok);
        if (ok.goal) {
          setTargetInput(String(ok.goal.targetAmount ?? ok.goal.targetAmountJpyc));
          setDeadlineInput(ok.goal.deadline ? ok.goal.deadline.slice(0, 10) : "");
        }
        return;
      }

      if (r.ok === false && typeof r.error === "string") {
        setSummary(null);
        setMsg(r.error);
        return;
      }

      setSummary(null);
      setMsg("SUMMARY_UNEXPECTED_SHAPE");
    } catch {
      setSummary(null);
      setMsg("SUMMARY_FETCH_FAILED");
    } finally {
      setSummaryLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refreshSummary();
  }, [refreshSummary]);

  const ownerLower = useMemo(() => {
    if (!summary?.project.ownerAddress) return null;
    return summary.project.ownerAddress.toLowerCase();
  }, [summary?.project.ownerAddress]);

  const connectedLower = useMemo(
    () => (address ? address.toLowerCase() : null),
    [address]
  );

  const isOwner = !!ownerLower && !!connectedLower && ownerLower === connectedLower;
  const goalIsSet = !!summary?.goal;
  const goalAchieved = !!summary?.goal?.achievedAt;

  const canAchieve =
    isOwner &&
    goalIsSet &&
    !goalAchieved &&
    (summary?.progress.targetAmount ?? summary?.progress.targetJpyc ?? null) != null &&
    (summary?.progress.confirmedTotal ?? summary?.progress.confirmedJpyc) >=
      (summary?.progress.targetAmount ?? summary?.progress.targetJpyc ?? 0);

  const saveGoal = useCallback(async () => {
    setMsg(null);

    if (!projectId) {
      setMsg("PROJECT_ID_MISSING");
      return;
    }
    if (!address) {
      setMsg("WALLET_NOT_CONNECTED");
      return;
    }

    const t = targetInput.trim();
    const n = Number(t);
    if (!t || !Number.isFinite(n) || n <= 0) {
      setMsg("GOAL_TARGET_INVALID");
      return;
    }

    const targetAmount = currency === "USDC" ? Number(n.toFixed(2)) : Math.floor(n);
    const deadline =
      deadlineInput.trim().length > 0
        ? `${deadlineInput.trim()}T00:00:00.000Z`
        : null;

    setGoalSaving(true);
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/goal`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address,
            targetAmount,
            targetAmountJpyc: targetAmount,
            deadline,
          }),
        }
      );

      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const code =
          isRecord(json) && typeof json.error === "string"
            ? json.error
            : `HTTP_${res.status}`;
        setMsg(code);
        return;
      }

      setMsg("GOAL_SAVED");
      await refreshSummary();
    } catch {
      setMsg("GOAL_SAVE_FAILED");
    } finally {
      setGoalSaving(false);
    }
  }, [address, currency, deadlineInput, projectId, refreshSummary, targetInput]);

  const doAchieve = useCallback(async () => {
    if (!projectId || !address) {
      setMsg("WALLET_NOT_CONNECTED");
      return;
    }

    setSummaryLoading(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/goal/achieve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        }
      );

      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const code =
          isRecord(json) && typeof json.error === "string"
            ? json.error
            : `HTTP_${res.status}`;
        setMsg(code);
        return;
      }

      setMsg("GOAL_ACHIEVED_SET");
      await refreshSummary();
    } catch {
      setMsg("GOAL_ACHIEVE_FAILED");
    } finally {
      setSummaryLoading(false);
    }
  }, [address, projectId, refreshSummary]);

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
              onClick={() => void saveGoal()}
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
                onClick={() => void doAchieve()}
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
            />
          </div>
        </>
      )}
    </div>
  );
}
