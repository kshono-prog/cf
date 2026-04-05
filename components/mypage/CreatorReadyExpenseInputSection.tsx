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

const EXPENSE_CATEGORIES = [
  "VENUE",
  "EQUIPMENT",
  "TRANSPORT",
  "PROMOTION",
  "LABOR",
  "MATERIAL",
  "SOFTWARE",
  "FOOD",
  "ACCOMMODATION",
  "OTHER",
] as const;

type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  VENUE: "場所/スタジオ",
  EQUIPMENT: "機材",
  TRANSPORT: "交通/移動",
  PROMOTION: "宣伝/広告",
  LABOR: "人件費",
  MATERIAL: "素材/消耗品",
  SOFTWARE: "ソフト/サービス",
  FOOD: "飲食",
  ACCOMMODATION: "宿泊",
  OTHER: "その他",
};

type ExpenseItem = {
  id: string;
  category: string;
  amountDecimal: string;
  currency: string;
  occurredAt: string;
  title: string;
  note: string | null;
};

type SaveState = "idle" | "saving" | "saved" | "error";

type MonthlySummary = {
  month: string; // "YYYY-MM"
  totals: { currency: string; total: number }[];
  byCategory: { category: ExpenseCategory | string; total: number; currency: string }[];
};

function parseExpenseItem(value: unknown): ExpenseItem | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    typeof value.category !== "string" ||
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
    category: value.category,
    amountDecimal: value.amountDecimal,
    currency: value.currency,
    occurredAt: value.occurredAt,
    title: value.title,
    note,
  };
}

function buildMonthlySummary(expenses: ExpenseItem[]): MonthlySummary | null {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthExpenses = expenses.filter((e) => e.occurredAt.startsWith(currentMonth));
  if (monthExpenses.length === 0) return null;

  // per-currency totals
  const currencyMap = new Map<string, number>();
  for (const e of monthExpenses) {
    const n = Number(e.amountDecimal);
    if (!Number.isFinite(n)) continue;
    currencyMap.set(e.currency, (currencyMap.get(e.currency) ?? 0) + n);
  }
  const totals = [...currencyMap.entries()].map(([currency, total]) => ({ currency, total }));

  // category breakdown (primary currency)
  const primaryCurrency = totals[0]?.currency ?? "JPY";
  const catMap = new Map<string, number>();
  for (const e of monthExpenses.filter((e) => e.currency === primaryCurrency)) {
    const n = Number(e.amountDecimal);
    if (!Number.isFinite(n)) continue;
    catMap.set(e.category, (catMap.get(e.category) ?? 0) + n);
  }
  const byCategory = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, total]) => ({ category, total, currency: primaryCurrency }));

  return { month: currentMonth, totals, byCategory };
}

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

type Props = {
  address: string | null;
  expenses: ExpenseItem[];
  onExpenseAdded: (expense: ExpenseItem) => void;
};

export function CreatorReadyExpenseInputSection({
  address,
  expenses,
  onExpenseAdded,
}: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("JPY");
  const [category, setCategory] = useState<ExpenseCategory>("OTHER");
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
        url: "/api/expenses",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address,
            title: title.trim(),
            amountDecimal: Number(amount),
            currency,
            category,
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
      const expense = isRecord(json) ? parseExpenseItem(json.expense) : null;
      if (!expense) {
        throw new Error("EXPENSES_POST_FAILED");
      }
      onExpenseAdded(expense);
      setSaveState("saved");
      setFeedback(buildWorkspaceActionSuccessNotice("expenseSaved"));
      setTitle("");
      setAmount("");
      setNote("");
      setOpen(false);
    } catch (error) {
      setSaveState("error");
      setFeedback(
        mapWorkspaceActionError(
          error instanceof Error ? error.message : "",
          "経費の保存に失敗しました。"
        )
      );
    }
  }

  const recentExpenses = expenses.slice(0, 5);
  const summary = buildMonthlySummary(expenses);

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="section-title">経費記録</div>
          <p className="caption-text mt-0.5">活動にかかった費用を記録できます。</p>
        </div>
        <button
          type="button"
          className="btn-secondary shrink-0"
          onClick={() => { setOpen((v) => !v); setSaveState("idle"); }}
        >
          {open ? "閉じる" : "+ 追加"}
        </button>
      </div>

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
                placeholder="例: マイク購入"
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
                </select>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                カテゴリ
              </label>
              <select
                className="input mt-1 w-full text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                disabled={saveState === "saving"}
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
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
              placeholder="備考・内訳など"
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

      {summary ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
            今月の集計
          </div>
          <div className="flex flex-wrap gap-3">
            {summary.totals.map(({ currency, total }) => (
              <div key={currency} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2">
                <div className="text-[11px] text-[var(--text-subtle)]">{currency} 合計</div>
                <div className="mt-0.5 text-xl font-semibold text-[var(--text)]">
                  {total.toLocaleString("ja-JP")} {currency}
                </div>
              </div>
            ))}
          </div>
          {summary.byCategory.length > 0 ? (
            <div className="space-y-1.5">
              {(() => {
                const maxTotal = summary.byCategory[0]?.total ?? 1;
                return summary.byCategory.slice(0, 5).map(({ category, total, currency }) => (
                  <div key={category} className="flex items-center gap-2">
                    <div className="w-20 shrink-0 text-right text-[11px] text-[var(--text-subtle)]">
                      {CATEGORY_LABELS[category as ExpenseCategory] ?? category}
                    </div>
                    <div className="flex-1 rounded-full bg-[var(--line)] h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-[var(--accent)]"
                        style={{ width: `${Math.round((total / maxTotal) * 100)}%` }}
                      />
                    </div>
                    <div className="w-24 shrink-0 text-right text-[11px] font-medium text-[var(--text)]">
                      {total.toLocaleString("ja-JP")} {currency}
                    </div>
                  </div>
                ));
              })()}
            </div>
          ) : null}
        </div>
      ) : null}

      {recentExpenses.length > 0 ? (
        <div className="divide-y divide-[var(--line)]">
          {recentExpenses.map((exp) => (
            <div key={exp.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text)] truncate">{exp.title}</span>
                  <span className="status-badge status-badge-neutral shrink-0">
                    {CATEGORY_LABELS[exp.category as ExpenseCategory] ?? exp.category}
                  </span>
                </div>
                {exp.note ? (
                  <div className="caption-text mt-0.5 truncate">{exp.note}</div>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold text-[var(--text)]">
                  {formatAmount(exp.amountDecimal, exp.currency)}
                </div>
                <div className="caption-text">{formatDate(exp.occurredAt)}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="caption-text">まだ経費が記録されていません。</p>
      )}
    </div>
  );
}
