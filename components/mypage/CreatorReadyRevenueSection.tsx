"use client";

import { useState } from "react";

import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import { isRecord } from "@/lib/api/guards";
import {
  buildWorkspaceActionSuccessNotice,
  mapWorkspaceActionError,
  type WorkspaceActionNotice,
} from "@/lib/mypage/workspaceActionCopy";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";
import type { ExpenseItem } from "@/components/mypage/useCreatorReadyExpenses";
import type { RevenueRecordItem } from "@/components/mypage/useCreatorReadyRevenueRecords";

const REVENUE_SOURCES = [
  "CONTRIBUTION",
  "MERCHANDISE",
  "EVENT",
  "BRAND_DEAL",
  "GRANT",
  "ROYALTY",
  "OTHER",
] as const;

type RevenueSource = (typeof REVENUE_SOURCES)[number];

const SOURCE_LABELS: Record<RevenueSource, string> = {
  CONTRIBUTION: "支援収入",
  MERCHANDISE: "物販",
  EVENT: "イベント",
  BRAND_DEAL: "ブランド案件",
  GRANT: "助成金",
  ROYALTY: "ロイヤリティ",
  OTHER: "その他",
};

type SaveState = "idle" | "saving" | "saved" | "error";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

function formatAmount(amount: string, currency: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${amount} ${currency}`;
  return `${n.toLocaleString("ja-JP")} ${currency}`;
}

type MonthlyCashflow = {
  revenue: number;
  expense: number;
  net: number;
  currency: string;
};

function parseRevenueRecordItem(value: unknown): RevenueRecordItem | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    typeof value.source !== "string" ||
    typeof value.amountDecimal !== "string" ||
    typeof value.currency !== "string" ||
    typeof value.occurredAt !== "string" ||
    typeof value.title !== "string"
  ) {
    return null;
  }

  const note =
    value.note === null ? null : typeof value.note === "string" ? value.note : null;

  return {
    id: value.id,
    source: value.source,
    amountDecimal: value.amountDecimal,
    currency: value.currency,
    occurredAt: value.occurredAt,
    title: value.title,
    note,
  };
}

function buildMonthlyCashflow(
  revenueRecords: RevenueRecordItem[],
  expenses: ExpenseItem[],
  currency: string
): MonthlyCashflow {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const revenue = revenueRecords
    .filter((r) => r.currency === currency && r.occurredAt.startsWith(currentMonth))
    .reduce((sum, r) => sum + (Number(r.amountDecimal) || 0), 0);
  const expense = expenses
    .filter((e) => e.currency === currency && e.occurredAt.startsWith(currentMonth))
    .reduce((sum, e) => sum + (Number(e.amountDecimal) || 0), 0);
  return { revenue, expense, net: revenue - expense, currency };
}

type Props = {
  address: string | null;
  revenueRecords: RevenueRecordItem[];
  expenses: ExpenseItem[];
  onRevenueAdded: (record: RevenueRecordItem) => void;
};

export function CreatorReadyRevenueSection({
  address,
  revenueRecords,
  expenses,
  onRevenueAdded,
}: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("JPY");
  const [source, setSource] = useState<RevenueSource>("OTHER");
  const [occurredAt, setOccurredAt] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [note, setNote] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [feedback, setFeedback] = useState<WorkspaceActionNotice | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address || !title.trim() || !amount.trim()) return;
    setSaveState("saving");
    setFeedback(null);
    try {
      const res = await ownerAuthFetch({
        address,
        url: "/api/revenue-records",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address,
            title: title.trim(),
            amountDecimal: Number(amount),
            currency,
            source,
            occurredAt,
            note: note.trim() || null,
          }),
        },
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const errorCode =
          isRecord(json) && typeof json.error === "string" ? json.error : "";
        throw new Error(errorCode);
      }
      const revenueRecord = isRecord(json)
        ? parseRevenueRecordItem(json.revenueRecord)
        : null;
      if (!revenueRecord) {
        throw new Error("REVENUE_RECORDS_POST_FAILED");
      }
      onRevenueAdded(revenueRecord);
      setSaveState("saved");
      setFeedback(buildWorkspaceActionSuccessNotice("revenueSaved"));
      setTitle("");
      setAmount("");
      setNote("");
      setOpen(false);
    } catch (error) {
      setSaveState("error");
      setFeedback(
        mapWorkspaceActionError(
          error instanceof Error ? error.message : "",
          "収入の保存に失敗しました。"
        )
      );
    }
  }

  // primary currency for cashflow: prefer JPY if any revenue/expense exists in JPY, else first currency
  const primaryCurrency = (() => {
    const allCurrencies = [
      ...revenueRecords.map((r) => r.currency),
      ...expenses.map((e) => e.currency),
    ];
    if (allCurrencies.includes("JPY")) return "JPY";
    return allCurrencies[0] ?? "JPY";
  })();

  const cashflow = buildMonthlyCashflow(revenueRecords, expenses, primaryCurrency);
  const hasCashflow = cashflow.revenue > 0 || cashflow.expense > 0;

  const recentRevenue = revenueRecords.slice(0, 5);

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="section-title">収入記録</div>
          <p className="caption-text mt-0.5">活動から得た収入を記録します。</p>
        </div>
        <button
          type="button"
          className="btn-secondary shrink-0"
          onClick={() => { setOpen((v) => !v); setSaveState("idle"); }}
        >
          {open ? "閉じる" : "+ 追加"}
        </button>
      </div>

      {hasCashflow ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
            今月の収支（{primaryCurrency}）
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <div className="text-[11px] text-emerald-700">収入</div>
              <div className="mt-0.5 text-base font-semibold text-emerald-800">
                {cashflow.revenue.toLocaleString("ja-JP")}
              </div>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2">
              <div className="text-[11px] text-rose-700">支出</div>
              <div className="mt-0.5 text-base font-semibold text-rose-800">
                {cashflow.expense.toLocaleString("ja-JP")}
              </div>
            </div>
            <div className={`rounded-xl border px-3 py-2 ${cashflow.net >= 0 ? "border-emerald-200 bg-emerald-50" : "border-rose-100 bg-rose-50"}`}>
              <div className={`text-[11px] ${cashflow.net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>収支</div>
              <div className={`mt-0.5 text-base font-semibold ${cashflow.net >= 0 ? "text-emerald-800" : "text-rose-800"}`}>
                {cashflow.net >= 0 ? "+" : ""}{cashflow.net.toLocaleString("ja-JP")}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {open ? (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                タイトル <span className="text-rose-500">*</span>
              </label>
              <input
                className="input mt-1 w-full text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: ライブ出演料"
                required
                disabled={saveState === "saving"}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                金額 <span className="text-rose-500">*</span>
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  className="input flex-1 text-sm"
                  type="number"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  required
                  disabled={saveState === "saving"}
                />
                <select
                  className="input w-20 text-sm"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  disabled={saveState === "saving"}
                >
                  <option value="JPY">JPY</option>
                  <option value="USD">USD</option>
                  <option value="JPYC">JPYC</option>
                  <option value="USDC">USDC</option>
                </select>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                収入種別
              </label>
              <select
                className="input mt-1 w-full text-sm"
                value={source}
                onChange={(e) => setSource(e.target.value as RevenueSource)}
                disabled={saveState === "saving"}
              >
                {REVENUE_SOURCES.map((s) => (
                  <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                日付
              </label>
              <input
                className="input mt-1 w-full text-sm"
                type="date"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                disabled={saveState === "saving"}
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
              メモ（任意）
            </label>
            <input
              className="input mt-1 w-full text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="内訳・詳細など"
              disabled={saveState === "saving"}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="btn"
              disabled={saveState === "saving" || !title.trim() || !amount.trim()}
            >
              {saveState === "saving" ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      ) : null}

      {feedback ? (
        <WorkspaceStatusNotice
          tone={feedback.tone}
          title={feedback.title}
          description={feedback.description}
        />
      ) : null}

      {recentRevenue.length > 0 ? (
        <div className="divide-y divide-[var(--line)]">
          {recentRevenue.map((rec) => (
            <div key={rec.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text)] truncate">{rec.title}</span>
                  <span className="status-badge status-badge-ok shrink-0">
                    {SOURCE_LABELS[rec.source as RevenueSource] ?? rec.source}
                  </span>
                </div>
                {rec.note ? (
                  <div className="caption-text mt-0.5 truncate">{rec.note}</div>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold text-emerald-700">
                  +{formatAmount(rec.amountDecimal, rec.currency)}
                </div>
                <div className="caption-text">{formatDate(rec.occurredAt)}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="caption-text">まだ収入が記録されていません。</p>
      )}
    </div>
  );
}
