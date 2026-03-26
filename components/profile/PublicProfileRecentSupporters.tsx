import { Avatar } from "@/components/shared/Avatar";
import type { PublicProfileRecentSupportersData } from "@/lib/publicProfileEnhancement";

type Props = {
  data: PublicProfileRecentSupportersData;
};

function fallbackText(label: string): string {
  const normalized = label.trim();
  if (!normalized) return "?";
  return normalized.slice(0, 1).toUpperCase();
}

function SupporterPill(props: {
  avatarUrl: string | null;
  label: string;
  addressAbbr: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-muted)] px-2.5 py-1.5">
      <Avatar
        src={props.avatarUrl}
        alt={`${props.label} のアイコン`}
        fallbackText={fallbackText(props.label)}
        size={22}
      />
      <span className="max-w-[8rem] truncate text-[11px] font-medium text-[var(--text)]">
        {props.label}
      </span>
      <span className="font-mono text-[10px] text-[var(--text-subtle)]">
        {props.addressAbbr}
      </span>
    </span>
  );
}

export function PublicProfileRecentSupporters({ data }: Props) {
  const { recentContributors, totalContributorCount } = data;

  if (totalContributorCount === 0) return null;

  const restCount = totalContributorCount - recentContributors.length;

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-4 space-y-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
        Living Funding Pulse
      </div>

      <p className="text-sm leading-6 text-[var(--text)]">
        いまこの活動を応援している人たちの動きが見えます。
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {recentContributors.map((c) => (
          <SupporterPill
            key={c.address}
            avatarUrl={c.avatarUrl}
            label={c.displayLabel}
            addressAbbr={c.addressAbbr}
          />
        ))}
        {restCount > 0 ? (
          <span className="text-[11px] text-[var(--text-subtle)]">
            ＋{restCount}人
          </span>
        ) : null}
      </div>

      <p className="text-[11px] leading-5 text-[var(--text-subtle)]">
        計 {totalContributorCount} 人がオンチェーンで支援しています
      </p>
    </section>
  );
}
