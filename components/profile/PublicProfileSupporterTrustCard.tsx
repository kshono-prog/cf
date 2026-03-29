import type {
  PublicProfileSupporterTrustData,
  PublicProfileSupporterTrustItem,
  SupporterTrustBadge,
} from "@/lib/publicProfileEnhancement";

const BADGE_STYLES: Record<SupporterTrustBadge, { bg: string; text: string; label: string }> = {
  loyal: { bg: "bg-emerald-100", text: "text-emerald-700", label: "継続" },
  recurring: { bg: "bg-amber-100", text: "text-amber-700", label: "VIP" },
};

function TrustSupporterChip(props: { item: PublicProfileSupporterTrustItem }) {
  const { item } = props;
  const style = BADGE_STYLES[item.badge];
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] px-2.5 py-1.5">
      <span className="truncate text-xs text-[var(--text)]">
        {item.username ? `@${item.username}` : item.displayLabel !== item.addressAbbr ? item.displayLabel : item.addressAbbr}
      </span>
      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text}`}>
        {style.label}
      </span>
      {item.consecutiveSupportMonths >= 2 ? (
        <span className="shrink-0 text-[10px] text-emerald-600">
          {item.consecutiveSupportMonths}ヶ月
        </span>
      ) : null}
    </div>
  );
}

type Props = {
  data: PublicProfileSupporterTrustData;
};

export function PublicProfileSupporterTrustCard(props: Props) {
  const { data } = props;
  if (data.items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">
            Community Trust
          </div>
          <h2 className="mt-0.5 text-sm font-semibold text-[var(--text)]">
            継続的に応援してくれている支援者
          </h2>
        </div>
        <div className="flex gap-3 text-right">
          {data.loyalCount > 0 ? (
            <div>
              <div className="text-lg font-semibold text-emerald-600">{data.loyalCount}</div>
              <div className="text-[10px] text-[var(--text-subtle)]">継続</div>
            </div>
          ) : null}
          {data.recurringCount > 0 ? (
            <div>
              <div className="text-lg font-semibold text-amber-600">{data.recurringCount}</div>
              <div className="text-[10px] text-[var(--text-subtle)]">VIP</div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {data.items.map((item) => (
          <TrustSupporterChip key={item.address} item={item} />
        ))}
      </div>
      {data.loyalCount + data.recurringCount > data.items.length ? (
        <p className="text-[11px] text-[var(--text-subtle)]">
          上位 {data.items.length} 名を表示
        </p>
      ) : null}
    </section>
  );
}
