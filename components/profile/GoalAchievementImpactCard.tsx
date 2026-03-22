import type { GoalAchievementImpact } from "@/lib/goalAchievementImpact";

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getFullYear().toString()}年${(d.getMonth() + 1).toString()}月${d.getDate().toString()}日`;
}

export function GoalAchievementImpactCard({
  impact,
}: {
  impact: GoalAchievementImpact;
}) {
  const maxAmount = Math.max(
    ...impact.purposeBreakdown.map((p) => p.confirmedAmount),
    1
  );

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            支援の使われ方
          </div>
          <div className="mt-0.5 text-sm font-semibold text-[var(--text)]">
            {impact.goalLabel}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
          達成済み
        </span>
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-[var(--muted)]">
        <span>達成日: {formatDate(impact.achievedAt)}</span>
        <span>支援者: {impact.totalContributors.toLocaleString()}名</span>
        <span>
          合計: {impact.totalConfirmedAmount.toLocaleString()} {impact.currency}
        </span>
        {impact.distributionRunCount > 0 ? (
          <span>配分済み: {impact.distributionRunCount.toLocaleString()}回</span>
        ) : null}
        {impact.activityPostCount > 0 ? (
          <span className="text-emerald-600">
            達成後の活動: {impact.activityPostCount.toLocaleString()}件の投稿
          </span>
        ) : null}
      </div>

      {impact.purposeBreakdown.length > 0 ? (
        <div className="space-y-2">
          {impact.purposeBreakdown.slice(0, 5).map((item) => (
            <div key={item.purposeLabel} className="space-y-0.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--text)]">{item.purposeLabel}</span>
                <span className="text-[var(--muted)]">
                  {item.confirmedAmount.toLocaleString()} {impact.currency}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{
                    width: `${Math.round((item.confirmedAmount / maxAmount) * 100).toString()}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-[var(--muted)]">
          集まった支援金が活動に活用されました。
        </p>
      )}
    </section>
  );
}

export function GoalAchievementImpactSection({
  impacts,
}: {
  impacts: GoalAchievementImpact[];
}) {
  if (impacts.length === 0) return null;

  const [latest, ...older] = impacts;

  return (
    <div className="space-y-3">
      <GoalAchievementImpactCard impact={latest} />
      {older.length > 0 ? (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-3">
          <div className="mb-2 text-[11px] font-medium text-[var(--muted)]">
            過去の達成ゴール
          </div>
          <div className="flex flex-wrap gap-2">
            {older.map((impact) => (
              <div
                key={impact.achievedAt}
                className="rounded-full border border-[var(--line)] bg-[var(--bg)] px-3 py-1 text-[11px] text-[var(--text)]"
              >
                {impact.goalLabel}
                <span className="ml-1.5 text-[var(--muted)]">
                  {impact.totalConfirmedAmount.toLocaleString()} {impact.currency} ·{" "}
                  {formatDate(impact.achievedAt)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
