import type { CreatorActivityCredibility } from "@/lib/creatorActivityCredibility";

type Props = {
  credibility: CreatorActivityCredibility;
};

function Metric(props: { value: string; label: string; compact?: boolean }) {
  if (props.compact) {
    return (
      <div className="flex flex-col items-center gap-0.5 text-center">
        <span className="text-[18px] font-bold tracking-tight text-[var(--text)]">
          {props.value}
        </span>
        <span className="text-[10px] font-medium text-[var(--text-subtle)]">
          {props.label}
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-3xl font-bold tracking-tight text-[var(--text)]">
        {props.value}
      </span>
      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-subtle)]">
        {props.label}
      </span>
    </div>
  );
}

export function PublicProfileImpactNumbers({ credibility }: Props) {
  const { totalPostCount, totalContributorCount, activeMonths } = credibility;

  if (totalPostCount === 0 && totalContributorCount === 0) return null;

  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 py-5">
      <div className="grid grid-cols-3 divide-x divide-[var(--line)]">
        <Metric value={String(totalPostCount)} label="投稿" />
        <Metric value={String(totalContributorCount)} label="支援者" />
        <Metric
          value={activeMonths >= 1 ? `${activeMonths}ヶ月` : "—"}
          label="活動継続"
        />
      </div>
    </section>
  );
}

export function PublicProfileImpactNumbersInline({ credibility }: Props) {
  const { totalPostCount, totalContributorCount, activeMonths } = credibility;

  if (totalPostCount === 0 && totalContributorCount === 0) return null;

  return (
    <div className="grid grid-cols-3 divide-x divide-[var(--line)]">
      <Metric value={String(totalPostCount)} label="投稿" compact />
      <Metric value={String(totalContributorCount)} label="支援者" compact />
      <Metric
        value={activeMonths >= 1 ? `${activeMonths}ヶ月` : "—"}
        label="活動継続"
        compact
      />
    </div>
  );
}
