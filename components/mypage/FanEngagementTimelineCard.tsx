"use client";

import type { FanEngagementTimeline } from "@/lib/fanEngagement/engagementTimeline";

type Props = {
  loading: boolean;
  data: FanEngagementTimeline | null;
};

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}日前`;
  const months = Math.floor(days / 30);
  return `${months}ヶ月前`;
}

export function FanEngagementTimelineCard({ loading, data }: Props) {
  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-[var(--line)] bg-white/90 px-4 py-4 shadow-sm">
        <div className="mb-3 h-4 w-32 rounded bg-[var(--surface-subtle)]" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-3 w-full rounded bg-[var(--surface-subtle)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.recentContributions.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-white/90 px-4 py-4 shadow-sm">
        <div className="mb-2 text-sm font-semibold text-[var(--text)]">応援タイムライン</div>
        <div className="text-xs text-[var(--text-subtle)]">
          まだ応援者がいません。公開ページへの誘導を続けましょう。
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/90 px-4 py-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-[var(--text)]">応援タイムライン</div>
        <div className="text-[11px] text-[var(--text-subtle)]">
          累計 {data.totalContributorCount} 人
        </div>
      </div>

      {data.weekHighlight ? (
        <div className="mb-3 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
          {data.weekHighlight}
        </div>
      ) : null}

      <div className="space-y-2.5">
        {data.recentContributions.map((entry) => (
          <div key={entry.id} className="flex items-start gap-2">
            <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            <div className="text-xs text-[var(--text)]">
              <span className="font-medium">{entry.maskedAddress}</span>
              {" "}さんが応援
              <span className="ml-1 text-[var(--text-subtle)]">
                {relativeTime(entry.confirmedAt)}
              </span>
              {entry.message ? (
                <div className="mt-0.5 text-[11px] italic text-[var(--text-subtle)]">
                  「{entry.message}」
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
