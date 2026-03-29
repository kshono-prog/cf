import type { EcosystemRole } from "@/lib/creatorTaxonomy";
import type { SupportProfileView } from "@/lib/supportProfileView";

type Props = {
  displayName: string;
  supportProfileView: SupportProfileView;
  ecosystemRole?: EcosystemRole | null;
};

const ROLE_KICKER: Record<EcosystemRole, string> = {
  CREATOR: "クリエイターの声",
  MANAGER: "マネージャーより",
  COLLABORATOR: "コラボレーターより",
};

const ROLE_APPEAL: Record<EcosystemRole, string> = {
  CREATOR: "クリエイターとして活動を続けるために、あなたの応援が力になります。",
  MANAGER: "クリエイターの活動を支えるマネージャーとして、継続的なサポートを求めています。",
  COLLABORATOR: "コラボレーターとして活動をつなぐために、あなたの応援が必要です。",
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

export function PublicProfileCreatorVoiceCard({ displayName, supportProfileView, ecosystemRole }: Props) {
  const jpyc = supportProfileView.projectsByCurrency.JPYC;
  const usdc = supportProfileView.projectsByCurrency.USDC;
  const activeProject = jpyc ?? usdc;

  const description = activeProject?.description?.trim();
  if (!description || description.length < 20) return null;

  const quote = truncate(description, 120);
  const progressPct = activeProject?.progressPct ?? 0;
  const status = activeProject?.status;
  const kicker = ecosystemRole ? ROLE_KICKER[ecosystemRole] : "クリエイターの声";
  const appeal = ecosystemRole ? ROLE_APPEAL[ecosystemRole] : null;

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-5 space-y-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
        {kicker}
      </div>
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

      {appeal ? (
        <p className="text-[11px] leading-5 text-[var(--text-subtle)]">{appeal}</p>
      ) : null}

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
