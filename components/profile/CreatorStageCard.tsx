import type { CreatorActivityCredibility } from "@/lib/creatorActivityCredibility";
import { deriveCreatorStage, type CreatorStage } from "@/lib/creatorStage";

type Props = {
  credibility: CreatorActivityCredibility;
};

const STAGE_ORDER: CreatorStage[] = [
  "SEED",
  "EARLY",
  "EMERGING",
  "PROFESSIONALIZING",
  "ESTABLISHED",
];

function stageIndex(stage: CreatorStage): number {
  return STAGE_ORDER.indexOf(stage);
}

function MaturityBar(props: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[var(--text-subtle)]">{props.label}</span>
        <span className="font-medium text-[var(--text)]">{props.value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
        <div
          className="h-full rounded-full bg-[var(--text-subtle)] transition-all"
          style={{ width: `${props.value}%` }}
        />
      </div>
    </div>
  );
}

export function CreatorStageCard({ credibility }: Props) {
  if (credibility.totalPostCount === 0 && credibility.activeMonths === 0) {
    return null;
  }

  const result = deriveCreatorStage(credibility);
  const currentIndex = stageIndex(result.stage);

  return (
    <section className="panel-card px-4 py-4 sm:px-5">
      <div className="mb-3 text-[11px] font-medium text-[var(--text-subtle)]">
        Creator Stage
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STAGE_ORDER.map((stage, i) => {
          const isActive = i === currentIndex;
          const isPast = i < currentIndex;
          return (
            <span
              key={stage}
              className={[
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                isActive
                  ? "bg-[var(--accent)] text-white"
                  : isPast
                    ? "bg-[var(--surface-muted)] text-[var(--text-subtle)] line-through"
                    : "border border-[var(--line)] bg-transparent text-[var(--text-subtle)]",
              ].join(" ")}
            >
              {stage === "PROFESSIONALIZING" ? "Professional." : stage}
            </span>
          );
        })}
      </div>

      <p className="mt-2 text-xs leading-5 text-[var(--text-subtle)]">
        {result.stageDescription}
      </p>

      {result.nextMilestone ? (
        <p className="mt-2 text-[11px] leading-4 text-[var(--text-subtle)] opacity-70">
          次のステップ: {result.nextMilestone}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
        <MaturityBar label="発信量" value={result.maturity.output} />
        <MaturityBar label="支援者" value={result.maturity.audience} />
        <MaturityBar label="目標達成" value={result.maturity.business} />
        <MaturityBar label="継続性" value={result.maturity.continuity} />
        <MaturityBar label="実績" value={result.maturity.craft} />
        <MaturityBar label="信頼" value={result.maturity.trust} />
      </div>
    </section>
  );
}
