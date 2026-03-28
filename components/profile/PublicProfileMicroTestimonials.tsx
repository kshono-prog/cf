import Image from "next/image";

import type { PublicProfileMicroTestimonialsData } from "@/lib/publicProfileEnhancement";

type Props = {
  data: PublicProfileMicroTestimonialsData;
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
  });
}

function avatarFallback(label: string): string {
  return label.charAt(0).toUpperCase();
}

export function PublicProfileMicroTestimonials({ data }: Props) {
  if (data.testimonials.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-5 space-y-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
        応援メッセージ
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {data.testimonials.map((t, i) => (
          <div
            key={`${t.address}-${i.toString()}`}
            className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4 space-y-2"
          >
            <p className="text-sm leading-6 text-[var(--text)]">&ldquo;{t.message}&rdquo;</p>
            <div className="flex items-center gap-2">
              {t.avatarUrl ? (
                <Image
                  src={t.avatarUrl}
                  alt={t.displayLabel}
                  width={24}
                  height={24}
                  sizes="24px"
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-300 text-[10px] font-bold text-gray-600">
                  {avatarFallback(t.displayLabel)}
                </div>
              )}
              <span className="text-[11px] text-[var(--text-subtle)]">{t.displayLabel}</span>
              <span className="ml-auto text-[10px] text-[var(--text-subtle)]">
                {formatDate(t.confirmedAt)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
