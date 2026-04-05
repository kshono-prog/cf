type Props = {
  displayName: string;
  username: string;
  externalUrl: string | null;
  activityMonths: number;
  contributionCount: number;
  stageLabel: string | null;
};

export function PublicTrustProfileSection({
  displayName,
  username,
  externalUrl,
  activityMonths,
  contributionCount,
  stageLabel,
}: Props) {
  if (!externalUrl && activityMonths === 0 && contributionCount === 0) {
    return null;
  }

  const creatorName = displayName || username;

  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 py-4 space-y-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
        Trust Profile
      </div>

      <div className="space-y-1">
        <div className="text-base font-semibold text-[var(--text)]">{creatorName}</div>
        {stageLabel ? (
          <div className="text-xs text-[var(--text-subtle)]">{stageLabel}</div>
        ) : null}
      </div>

      {(activityMonths > 0 || contributionCount > 0) ? (
        <div className="flex flex-wrap gap-2">
          {activityMonths > 0 ? (
            <div className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1 text-xs text-[var(--text)]">
              活動継続 {activityMonths} ヶ月
            </div>
          ) : null}
          {contributionCount > 0 ? (
            <div className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1 text-xs text-[var(--text)]">
              累計応援 {contributionCount} 件
            </div>
          ) : null}
        </div>
      ) : null}

      {externalUrl ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-3 space-y-2">
          <div className="text-xs font-semibold text-emerald-800">
            コラボ・仕事のご相談を受け付けています
          </div>
          <div className="text-xs text-emerald-700">
            お仕事・コラボ・出演依頼など、お気軽にご連絡ください。
          </div>
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            問い合わせページを開く
          </a>
        </div>
      ) : null}
    </section>
  );
}
