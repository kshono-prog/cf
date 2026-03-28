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
    </section>
  );
}
