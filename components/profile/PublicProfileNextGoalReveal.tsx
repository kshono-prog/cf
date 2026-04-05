import Link from "next/link";

import type { PublicProfileNextGoalRevealData } from "@/lib/publicProfileEnhancement";

type Props = {
  data: PublicProfileNextGoalRevealData;
};

function formatAmount(value: number, currency: "JPYC" | "USDC"): string {
  if (!Number.isFinite(value)) {
    return currency === "USDC" ? "0.00 USDC" : `0 ${currency}`;
  }

  if (currency === "USDC") {
    return `${value.toLocaleString("ja-JP", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} USDC`;
  }

  return `${Math.floor(value).toLocaleString("ja-JP")} ${currency}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
  });
}

function extractLead(description: string | null): string {
  if (!description) {
    return "このゴールが達成すると、次の制作や発信を前に進めるための準備が整います。";
  }

  const cleaned = description.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "このゴールが達成すると、次の制作や発信を前に進めるための準備が整います。";
  }

  const [firstSentence] = cleaned.split(/[。\n!?！？]/u);
  if (firstSentence && firstSentence.trim().length >= 12) {
    return `${firstSentence.trim()}。`;
  }

  if (cleaned.length <= 110) {
    return cleaned;
  }

  return `${cleaned.slice(0, 110).trimEnd()}…`;
}

function buildForecastText(data: PublicProfileNextGoalRevealData): string {
  if (data.estimatedCompletionAt && data.estimatedDays != null) {
    return `最近30日のペースが続くと、約${data.estimatedDays.toString()}日後の${formatDate(data.estimatedCompletionAt)}ごろに達成見込みです。`;
  }

  if (data.recentSupporterCount > 0) {
    return `直近30日で ${data.recentSupporterCount.toString()} 人から ${formatAmount(
      data.recentAmount,
      data.currency
    )} の支援がありました。`;
  }

  return "最近30日の支援データが少ないため、達成時期の予測はまだ出していません。";
}

export function PublicProfileNextGoalReveal({ data }: Props) {
  const lead = extractLead(data.projectDescription);
  const forecastText = buildForecastText(data);

  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 py-5 space-y-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
        Next Goal
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">
            {data.projectTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text)]">{lead}</p>
        </div>

        <div className="space-y-3 sm:min-w-[11rem]">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3 text-right">
            <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-subtle)]">
              Remaining
            </div>
            <div className="mt-1 text-xl font-semibold tracking-tight text-[var(--text)]">
              {formatAmount(data.remainingAmount, data.currency)}
            </div>
            <div className="mt-1 text-[11px] text-[var(--text-subtle)]">
              {Math.round(data.progressPct).toString()}% 達成中
            </div>
          </div>

          <Link href="#support-projects" className="btn w-full">
            応援へ
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-subtle)]">
            現在地
          </div>
          <div className="mt-1 text-sm font-semibold text-[var(--text)]">
            {formatAmount(data.confirmedAmount, data.currency)}
          </div>
          <div className="mt-1 text-[11px] text-[var(--text-subtle)]">
            / {formatAmount(data.targetAmount, data.currency)}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-subtle)]">
            直近30日
          </div>
          <div className="mt-1 text-sm font-semibold text-[var(--text)]">
            {data.recentSupporterCount.toString()} 人
          </div>
          <div className="mt-1 text-[11px] text-[var(--text-subtle)]">
            {formatAmount(data.recentAmount, data.currency)}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-subtle)]">
            見込み
          </div>
          <div className="mt-1 text-sm font-semibold text-[var(--text)]">
            {data.estimatedCompletionAt ? formatDate(data.estimatedCompletionAt) : "算出中"}
          </div>
          <div className="mt-1 text-[11px] text-[var(--text-subtle)]">
            {data.estimatedDays != null ? `約${data.estimatedDays.toString()}日` : "直近ペース不足"}
          </div>
        </div>
      </div>

      <p className="text-[11px] leading-5 text-[var(--text-subtle)]">
        {forecastText}
        {data.deadline ? ` 期限は ${formatDate(data.deadline)} です。` : ""}
      </p>
    </section>
  );
}
