import type { SupportProfileView } from "@/lib/supportProfileView";

type Props = {
  displayName: string;
  supportProfileView: SupportProfileView;
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

export function PublicProfileCreatorVoiceCard({ displayName, supportProfileView }: Props) {
  const jpyc = supportProfileView.projectsByCurrency.JPYC;
  const usdc = supportProfileView.projectsByCurrency.USDC;
  const activeProject = jpyc ?? usdc;

  const description = activeProject?.description?.trim();
  if (!description || description.length < 20) return null;

  const quote = truncate(description, 120);
  const progressPct = activeProject?.progressPct ?? 0;
  const status = activeProject?.status;

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-5 space-y-4">
      <div className="relative">
        <span
          aria-hidden
          className="absolute -top-1 -left-1 text-4xl leading-none text-[var(--text-subtle)] opacity-20 select-none"
        >
          &ldquo;
        </span>
        <p className="pl-5 text-sm leading-7 text-[var(--text)]">{quote}</p>
        <p className="mt-2 pl-5 text-[11px] font-semibold text-[var(--text-subtle)]">
          — {displayName}
        </p>
      </div>

      {activeProject && status === "OPEN" ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-subtle)]">
            <span className="font-medium">{activeProject.title}</span>
            <span>{Math.round(progressPct)}% 達成</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
            <div
              className="h-full rounded-full bg-[var(--text)] transition-all"
              style={{ width: `${Math.min(100, progressPct)}%` }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
