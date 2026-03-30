import Link from "next/link";
import Image from "next/image";

import type { SerializedPublicAiManagerProfile } from "@/lib/serializers/aiManager";

type Props = {
  creatorUsername: string;
  creatorDisplayName: string;
  aiManager: SerializedPublicAiManagerProfile;
};

const ARCHETYPE_LABELS: Record<
  SerializedPublicAiManagerProfile["archetype"],
  string
> = {
  GENTLE_SUPPORTER: "やさしい伴走型",
  PRODUCER: "プロデューサー型",
  ANALYST: "分析型",
  PROMOTER: "広報特化型",
  FAN_GUIDE: "ファン案内型",
};

const TONE_LABELS: Record<SerializedPublicAiManagerProfile["tone"], string> = {
  POLITE: "丁寧",
  FRIENDLY: "フレンドリー",
  ELEGANT: "上品",
  ENERGETIC: "熱量高め",
  COOL: "クール",
};

const SUPPORT_STYLE_LABELS: Record<
  SerializedPublicAiManagerProfile["supportStyle"],
  string
> = {
  ENCOURAGING: "応援重視",
  CALM: "落ち着いた整理",
  DATA_DRIVEN: "分析寄り",
  PROMOTIONAL: "広報寄り",
};

const DISCLOSURE_POLICY_LABELS: Record<
  SerializedPublicAiManagerProfile["disclosurePolicy"],
  string
> = {
  ALWAYS_DISCLOSE_AI: "常に AI と明示",
  DISCLOSE_ON_PUBLIC_ACTION: "公開行動時に AI と明示",
};

function getFallbackInitial(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "A";
  return trimmed.slice(0, 1).toUpperCase();
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "更新日時未設定";

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function AiManagerAvatar(props: {
  src: string | null;
  name: string;
}) {
  if (!props.src) {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-[linear-gradient(160deg,#0f172a,#1d4ed8)] text-2xl font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        {getFallbackInitial(props.name)}
      </div>
    );
  }

  return (
    <Image
      src={props.src}
      alt={`${props.name} のアイコン`}
      width={80}
      height={80}
      className="h-20 w-20 rounded-[24px] object-cover shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
    />
  );
}

export function PublicProfileAiManagerCard({
  creatorUsername,
  creatorDisplayName,
  aiManager,
}: Props) {
  const intro =
    aiManager.intro?.trim() ||
    `${creatorDisplayName} の活動案内や進捗共有を支える、公開運営用の AI マネージャーです。`;

  const specialties = aiManager.specialties
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 4);

  return (
    <section
      id="ai-manager-section"
      className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_24px_70px_rgba(15,23,42,0.06)]"
    >
      <div className="border-b border-[var(--line)] bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(15,23,42,0.03))] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-sky-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
            AI Manager
          </span>
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
            公開プロフィール上で AI と明記
          </span>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-subtle)]">
          この案内役は {creatorDisplayName} 専属の AI マネージャーです。公開面での
          活動案内や紹介文は、AI が担当していることを明示したうえで表示しています。
        </p>
      </div>

      <div className="grid gap-5 px-5 py-5 sm:px-6 sm:py-6 lg:grid-cols-[auto,1fr]">
        <div className="flex items-start gap-4">
          <AiManagerAvatar src={aiManager.avatarAssetUrl} name={aiManager.displayName} />
          <div className="space-y-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
                Public AI Operator
              </div>
              <div className="mt-1 text-xl font-semibold text-[var(--text)]">
                {aiManager.displayName}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="surface-chip">{ARCHETYPE_LABELS[aiManager.archetype]}</span>
              <span className="surface-chip">{TONE_LABELS[aiManager.tone]}</span>
              <span className="surface-chip">
                {SUPPORT_STYLE_LABELS[aiManager.supportStyle]}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm leading-7 text-[var(--text)]">{intro}</p>

          {specialties.length > 0 ? (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
                Specialties
              </div>
              <div className="flex flex-wrap gap-2">
                {specialties.map((specialty) => (
                  <span
                    key={specialty}
                    className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1 text-xs font-medium text-[var(--text)]"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
              <div className="text-[11px] font-medium text-[var(--text-subtle)]">役割</div>
              <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                公開案内と活動紹介
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
              <div className="text-[11px] font-medium text-[var(--text-subtle)]">言語</div>
              <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                {aiManager.primaryLanguage.toUpperCase()}
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
              <div className="text-[11px] font-medium text-[var(--text-subtle)]">
                最終更新
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                {formatUpdatedAt(aiManager.updatedAt)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {DISCLOSURE_POLICY_LABELS[aiManager.disclosurePolicy]}
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/${encodeURIComponent(creatorUsername)}/manager/${encodeURIComponent(aiManager.slug)}`}
              className="btn-secondary"
            >
              AIマネージャーの紹介ページを見る
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
