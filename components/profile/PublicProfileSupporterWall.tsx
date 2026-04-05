import Link from "next/link";

import { Avatar } from "@/components/shared/Avatar";
import type { PublicProfileSupporterWallData } from "@/lib/publicProfileEnhancement";

type Props = {
  data: PublicProfileSupporterWallData;
};

function fallbackText(label: string): string {
  const normalized = label.trim();
  if (!normalized) return "?";
  return normalized.slice(0, 1).toUpperCase();
}

export function PublicProfileSupporterWall({ data }: Props) {
  if (data.totalSupporterCount === 0) return null;

  const remainingCount = Math.max(0, data.totalSupporterCount - data.supporters.length);

  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 py-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
            Supporter Wall
          </div>
          <p className="mt-1 text-sm leading-6 text-[var(--text)]">
            この活動を信じて支えてくれた人たちです。
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            {data.totalSupporterCount}
          </div>
          <div className="text-[11px] text-[var(--text-subtle)]">累計支援者</div>
        </div>
      </div>

        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
        {data.supporters.map((supporter) => (
          <div
            key={supporter.address}
            title={
              supporter.username
                ? `${supporter.displayLabel} (@${supporter.username})`
                : supporter.displayLabel
            }
          >
            {supporter.username ? (
              <Link
                href={`/${supporter.username}`}
                className="flex min-w-0 flex-col items-center gap-2 text-center transition hover:opacity-80"
              >
                <Avatar
                  src={supporter.avatarUrl}
                  alt={`${supporter.displayLabel} のアイコン`}
                  fallbackText={fallbackText(supporter.displayLabel)}
                  size={44}
                />
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-medium text-[var(--text)]">
                    {supporter.displayLabel}
                  </div>
                  <div className="truncate text-[10px] font-mono text-[var(--text-subtle)]">
                    {supporter.addressAbbr}
                  </div>
                </div>
              </Link>
            ) : (
              <div className="flex min-w-0 flex-col items-center gap-2 text-center">
                <Avatar
                  src={supporter.avatarUrl}
                  alt={`${supporter.displayLabel} のアイコン`}
                  fallbackText={fallbackText(supporter.displayLabel)}
                  size={44}
                />
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-medium text-[var(--text)]">
                    {supporter.displayLabel}
                  </div>
                  <div className="truncate text-[10px] font-mono text-[var(--text-subtle)]">
                    {supporter.addressAbbr}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-[11px] leading-5 text-[var(--text-subtle)]">
        {remainingCount > 0
          ? `ほか ${remainingCount.toString()} 人も支援しています。`
          : "支援者の一部を表示しています。"}
      </p>
    </section>
  );
}
