"use client";

import Link from "next/link";
import type { GrowthOverviewData } from "@/lib/growth/overview";

type Props = {
  displayName: string;
  username: string;
  growthOverview: GrowthOverviewData | null;
  approvedTaskCount: number;
  postCount: number | null;
  activityReportHref: string;
};

function calcActivityMonths(firstTipReceivedAt: string | null, walletConnectedAt: string | null): number {
  const startIso = firstTipReceivedAt ?? walletConnectedAt;
  if (!startIso) return 0;
  const start = new Date(startIso);
  const now = new Date();
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  return Math.max(0, months);
}

export function AchievementCard({ displayName, username, growthOverview, approvedTaskCount, postCount, activityReportHref }: Props) {
  const contributionCount = growthOverview?.metrics.confirmedContributionCount ?? 0;
  const walletConnectedMilestone = growthOverview?.milestones.find(
    (m) => m.event === "wallet_connected"
  );
  const walletConnectedAt = walletConnectedMilestone?.lastAt ?? null;
  const activityMonths = calcActivityMonths(
    growthOverview?.firstTipReceivedAt ?? null,
    walletConnectedAt
  );

  const milestoneCompletionCount = growthOverview?.milestoneCompletionCount ?? 0;
  const milestoneTotalCount = growthOverview?.milestoneTotalCount ?? 1;

  const metrics: { label: string; value: string; sub?: string }[] = [
    {
      label: "累計応援",
      value: `${contributionCount} 件`,
      sub: contributionCount > 0 ? "支援者からの応援" : "まだ応援なし",
    },
    {
      label: "投稿数",
      value: `${postCount ?? 0} 件`,
      sub: "発信した活動",
    },
    {
      label: "AI 承認済みタスク",
      value: `${approvedTaskCount} 件`,
      sub: "AI 提案を実行済み",
    },
    {
      label: "活動期間",
      value: activityMonths > 0 ? `${activityMonths} ヶ月` : "今月〜",
      sub: "登録からの継続期間",
    },
  ];

  const creatorName = displayName || username;

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-[var(--text)]">
            {creatorName} の活動実績
          </div>
          <div className="mt-0.5 text-xs text-[var(--text-subtle)]">
            セットアップ {milestoneCompletionCount}/{milestoneTotalCount} 完了
          </div>
        </div>
        <Link
          href={activityReportHref}
          className="shrink-0 rounded-full border border-[var(--line)] px-2.5 py-1 text-[11px] text-[var(--text-subtle)] hover:bg-[var(--surface-subtle)] transition-colors"
        >
          詳細レポート →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="data-tile rounded-xl px-3 py-2.5"
          >
            <div className="text-[11px] text-[var(--text-subtle)]">{m.label}</div>
            <div className="mt-0.5 text-base font-semibold tabular-nums text-[var(--text)]">
              {m.value}
            </div>
            {m.sub ? (
              <div className="mt-0.5 text-[10px] text-[var(--text-subtle)]">{m.sub}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
