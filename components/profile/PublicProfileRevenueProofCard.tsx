import type { PublicProfileRevenueProofData } from "@/lib/publicProfileEnhancement";

type Props = {
  data: PublicProfileRevenueProofData;
};

function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString("ja-JP")} ${currency}`;
}

export function PublicProfileRevenueProofCard({ data }: Props) {
  if (data.currencyTotals.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-4 space-y-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
        Revenue Track Record
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--line)] bg-white px-4 py-3">
          <div className="text-[11px] text-[var(--text-subtle)]">収益活動月数</div>
          <div className="mt-1 text-2xl font-semibold text-[var(--text)]">
            {data.activeRevenueMonths}
            <span className="ml-1 text-sm font-normal text-[var(--text-subtle)]">ヶ月</span>
          </div>
        </div>

        {data.currencyTotals.slice(0, 2).map(({ currency, total }) => (
          <div
            key={currency}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
          >
            <div className="text-[11px] text-emerald-700">総収益 ({currency})</div>
            <div className="mt-1 text-lg font-semibold text-emerald-800 leading-tight">
              {formatAmount(total, currency)}
            </div>
          </div>
        ))}
      </div>

      {data.currencyTotals.some((c) => c.maxMonthlyTotal > 0) ? (
        <div className="flex flex-wrap gap-3">
          {data.currencyTotals.slice(0, 2).map(({ currency, maxMonthlyTotal }) =>
            maxMonthlyTotal > 0 ? (
              <div
                key={currency}
                className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs"
              >
                <span className="text-[var(--text-subtle)]">最大単月</span>
                <span className="font-semibold text-[var(--text)]">
                  {formatAmount(maxMonthlyTotal, currency)}
                </span>
              </div>
            ) : null
          )}
        </div>
      ) : null}
    </section>
  );
}
