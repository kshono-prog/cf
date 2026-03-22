import type { CreatorActivityCredibility } from "@/lib/creatorActivityCredibility";

type Props = {
  credibility: CreatorActivityCredibility;
};

function CredibilityStat(props: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-base font-semibold text-[var(--text)]">
        {props.value}
      </span>
      <span className="text-[11px] text-[var(--text-subtle)]">{props.label}</span>
    </div>
  );
}

export function CreatorActivityCredibilityBadge({ credibility }: Props) {
  const stats: Array<{ label: string; value: string }> = [];

  if (credibility.activeMonths > 0) {
    stats.push({
      label: "活動期間",
      value:
        credibility.activeMonths >= 12
          ? `${Math.floor(credibility.activeMonths / 12).toString()}年+`
          : `${credibility.activeMonths.toString()}ヶ月`,
    });
  }

  if (credibility.totalPostCount > 0) {
    stats.push({
      label: "投稿数",
      value: credibility.totalPostCount.toLocaleString(),
    });
  }

  if (credibility.goalAchievedCount > 0) {
    stats.push({
      label: "目標達成",
      value: `${credibility.goalAchievedCount.toString()}回`,
    });
  }

  if (credibility.totalContributorCount > 0) {
    stats.push({
      label: "累計支援者",
      value: `${credibility.totalContributorCount.toLocaleString()}名`,
    });
  }

  if (stats.length === 0) return null;

  return (
    <section className="panel-card px-4 py-3 sm:px-5">
      <div className="mb-2 text-[11px] font-medium text-[var(--text-subtle)]">
        活動実績
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {stats.map((stat) => (
          <CredibilityStat key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>
    </section>
  );
}
