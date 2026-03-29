"use client";

import Link from "next/link";

import type { RevenueRecordItem } from "@/components/mypage/useCreatorReadyRevenueRecords";
import type { ExpenseItem } from "@/components/mypage/useCreatorReadyExpenses";

type Props = {
  revenueRecords: RevenueRecordItem[];
  expenses: ExpenseItem[];
  aiOfficeFinanceHref: string;
};

function getCurrentMonthPrefix(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getPrevMonthPrefix(): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

function sumByCurrency(
  items: Array<{ amountDecimal: string; currency: string; occurredAt: string }>,
  monthPrefix: string
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    if (!item.occurredAt.startsWith(monthPrefix)) continue;
    const currency = item.currency ?? "JPYC";
    result[currency] = (result[currency] ?? 0) + Number(item.amountDecimal);
  }
  return result;
}

function formatAmount(amount: number, currency: string): string {
  if (currency === "JPYC") return `¥${Math.floor(amount).toLocaleString()}`;
  return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  VENUE: "会場費",
  EQUIPMENT: "機材",
  MARKETING: "プロモーション",
  TRAVEL: "交通費",
  PERSONNEL: "人件費",
  PRODUCTION: "制作費",
  SUBSCRIPTION: "サブスク",
  OTHER: "その他",
};

type CashflowByCurrency = {
  currency: string;
  revenue: number;
  expense: number;
  net: number;
};

export function CreatorReadyCashflowHealthCard({
  revenueRecords,
  expenses,
  aiOfficeFinanceHref,
}: Props) {
  const thisMonth = getCurrentMonthPrefix();
  const prevMonth = getPrevMonthPrefix();

  // Compute per-currency totals for this month
  const thisRevByCurrency = sumByCurrency(revenueRecords, thisMonth);
  const thisExpByCurrency = sumByCurrency(expenses, thisMonth);
  const prevRevByCurrency = sumByCurrency(revenueRecords, prevMonth);
  const prevExpByCurrency = sumByCurrency(expenses, prevMonth);

  const currencies = Array.from(
    new Set([
      ...Object.keys(thisRevByCurrency),
      ...Object.keys(thisExpByCurrency),
    ])
  );

  if (currencies.length === 0) return null;

  // Expense category breakdown for this month
  const expCategoryMap = new Map<string, number>();
  for (const e of expenses) {
    if (!e.occurredAt.startsWith(thisMonth)) continue;
    const key = e.category ?? "OTHER";
    expCategoryMap.set(key, (expCategoryMap.get(key) ?? 0) + Number(e.amountDecimal));
  }
  const totalExpenseAll = Array.from(expCategoryMap.values()).reduce((s, v) => s + v, 0);
  const expCategoryRanked = Array.from(expCategoryMap.entries())
    .map(([cat, amount]) => ({
      label: CATEGORY_LABELS[cat] ?? cat,
      amount,
      pct: totalExpenseAll > 0 ? Math.round((amount / totalExpenseAll) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const rows: CashflowByCurrency[] = currencies.map((currency) => ({
    currency,
    revenue: thisRevByCurrency[currency] ?? 0,
    expense: thisExpByCurrency[currency] ?? 0,
    net: (thisRevByCurrency[currency] ?? 0) - (thisExpByCurrency[currency] ?? 0),
  }));

  const thisMonthLabel = thisMonth.replace("-", "年") + "月";

  return (
    <section className="panel-card px-4 py-3.5 sm:px-5 sm:py-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="text-[13px] font-semibold text-[var(--text)]">
          {thisMonthLabel}の収支
        </div>
        <Link
          href={aiOfficeFinanceHref}
          className="text-[11px] font-medium text-[var(--text-subtle)] hover:text-[var(--text)] transition"
        >
          AI分析を作る →
        </Link>
      </div>

      <div className="space-y-2.5">
        {rows.map((row) => {
          const isPositive = row.net >= 0;
          const prevNet =
            (prevRevByCurrency[row.currency] ?? 0) -
            (prevExpByCurrency[row.currency] ?? 0);
          const diff = row.net - prevNet;
          const hasPrevData = prevNet !== 0 || prevRevByCurrency[row.currency] !== undefined || prevExpByCurrency[row.currency] !== undefined;

          return (
            <div key={row.currency}>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[10px] font-medium text-[var(--text-subtle)] mb-0.5">収入</div>
                  <div className="text-[13px] font-semibold text-[var(--text)]">
                    {formatAmount(row.revenue, row.currency)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-medium text-[var(--text-subtle)] mb-0.5">支出</div>
                  <div className="text-[13px] font-semibold text-[var(--text)]">
                    {formatAmount(row.expense, row.currency)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-medium text-[var(--text-subtle)] mb-0.5">収支</div>
                  <div
                    className={`text-[13px] font-bold ${
                      isPositive ? "text-emerald-600" : "text-rose-500"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {formatAmount(row.net, row.currency)}
                  </div>
                </div>
              </div>
              {hasPrevData ? (
                <div className="mt-1 text-center text-[10px] text-[var(--text-subtle)]">
                  先月比{" "}
                  <span
                    className={
                      diff >= 0 ? "text-emerald-600 font-medium" : "text-rose-500 font-medium"
                    }
                  >
                    {diff >= 0 ? "+" : ""}
                    {formatAmount(diff, row.currency)}
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {expCategoryRanked.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          <div className="text-[10px] font-medium text-[var(--text-subtle)]">支出カテゴリ</div>
          {expCategoryRanked.map((cat) => (
            <div key={cat.label} className="space-y-0.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[var(--text)]">{cat.label}</span>
                <span className="text-[var(--text-subtle)]">{cat.pct}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                <div
                  className="h-full rounded-full bg-[var(--text-subtle)]"
                  style={{ width: `${cat.pct.toString()}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
