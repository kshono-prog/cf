import Image from "next/image";
import Link from "next/link";

import { PublicProfileImpactNumbersInline } from "@/components/profile/PublicProfileImpactNumbers";
import type { CreatorActivityCredibility } from "@/lib/creatorActivityCredibility";
import type {
  SerializedPublicAiManagerProfile,
  SerializedPublicAiManagerSupportActivity,
} from "@/lib/serializers/aiManager";
import type { SupportProjectView } from "@/lib/supportProfileView";

type Props = {
  creatorUsername: string;
  creatorDisplayName: string;
  creator: {
    username: string;
    displayName?: string | null;
  };
  aiManager: SerializedPublicAiManagerProfile;
  activeSupportProject: SupportProjectView | null;
  recruitingProjects: SupportProjectView[];
  credibility: CreatorActivityCredibility;
  recentSupportActivities: SerializedPublicAiManagerSupportActivity[];
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

function getFallbackInitial(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "A";
  return trimmed.slice(0, 1).toUpperCase();
}

function AiManagerAvatar(props: {
  src: string | null;
  name: string;
}) {
  if (!props.src) {
    return (
      <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-[linear-gradient(160deg,#0f172a,#0f766e)] text-3xl font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.2)]">
        {getFallbackInitial(props.name)}
      </div>
    );
  }

  return (
    <Image
      src={props.src}
      alt={`${props.name} のアイコン`}
      width={96}
      height={96}
      className="h-24 w-24 rounded-[28px] object-cover shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
    />
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
  });
}

export function PublicAiManagerProfilePageBody({
  creatorUsername,
  creatorDisplayName,
  creator,
  aiManager,
  activeSupportProject,
  recruitingProjects,
  credibility,
  recentSupportActivities,
}: Props) {
  const intro =
    aiManager.intro?.trim() ||
    `${creatorDisplayName} の活動案内、進捗共有、応援導線づくりを支える公開 AI マネージャーです。`;

  const specialties = aiManager.specialties
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 6);
  const hasActivityProof =
    credibility.totalPostCount > 0 ||
    credibility.totalContributorCount > 0 ||
    credibility.activeMonths > 0;

  function formatAmount(value: number, currency: SupportProjectView["currency"]): string {
    return `${value.toLocaleString("ja-JP")} ${currency}`;
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
        <div className="border-b border-[var(--line)] bg-[linear-gradient(135deg,rgba(20,184,166,0.16),rgba(15,23,42,0.04))] px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white/85 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
              AI Manager Profile
            </span>
            <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">
              常に AI と明記
            </span>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-subtle)]">
            このページは {creatorDisplayName} 専属の AI マネージャー紹介ページです。
            実際に creator 活動を支えている人格と役割を、公開ショーケースとして見せます。
          </p>
        </div>

        <div className="grid gap-6 px-5 py-5 sm:px-6 sm:py-6 lg:grid-cols-[auto,1fr]">
          <div className="flex items-start gap-4">
            <AiManagerAvatar src={aiManager.avatarAssetUrl} name={aiManager.displayName} />
            <div className="space-y-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
                  Public AI Operator
                </div>
                <div className="mt-1 text-2xl font-semibold text-[var(--text)]">
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

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
                <div className="text-[11px] font-medium text-[var(--text-subtle)]">
                  所属 creator
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                  {creatorDisplayName}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
                <div className="text-[11px] font-medium text-[var(--text-subtle)]">
                  公開URL
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                  /{creatorUsername}/manager/{aiManager.slug}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
                <div className="text-[11px] font-medium text-[var(--text-subtle)]">
                  言語
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                  {aiManager.primaryLanguage.toUpperCase()}
                </div>
              </div>
            </div>

            {hasActivityProof ? (
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                  Activity Proof
                </div>
                <div className="mt-3">
                  <PublicProfileImpactNumbersInline credibility={credibility} />
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/${encodeURIComponent(creatorUsername)}`}
                className="btn-secondary"
              >
                creator の公開ページを見る
              </Link>
              <Link
                href={`/${encodeURIComponent(creatorUsername)}#support-projects`}
                className="btn-secondary"
              >
                この creator を応援する
              </Link>
              <Link href="/" className="btn-secondary">
                自分も AIマネージャーを作る構想を見る
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">
              最近の支援内容
            </div>
            <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
              この AIマネージャーが最近 creator 活動のために扱った支援内容です。
            </p>
          </div>
          <Link
            href={`/${encodeURIComponent(creatorUsername)}#support-projects`}
            className="btn-secondary"
          >
            いま応援できる project を見る
          </Link>
        </div>

        {recentSupportActivities.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {recentSupportActivities.map((activity) => (
              <div
                key={`${activity.taskType}-${activity.createdAt}`}
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-[var(--text)]">
                    {activity.label}
                  </div>
                  <div className="text-xs font-medium text-[var(--text-subtle)]">
                    {formatDate(activity.createdAt)}
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-subtle)]">
                  {activity.helper ??
                    "creator の活動を前に進めるための支援タスクを最近扱っています。"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[var(--text-subtle)]">
            直近の公開向け支援内容はまだ少ないですが、この AIマネージャーは creator
            の活動案内と応援導線づくりを継続して担当しています。
          </p>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
          <div className="text-sm font-semibold text-[var(--text)]">
            この AIマネージャーが担うこと
          </div>
          <div className="mt-3 grid gap-3">
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
              <div className="text-xs font-semibold text-[var(--text)]">
                活動案内
              </div>
              <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
                creator の進捗や現在の挑戦を、外から来た人にも分かりやすく伝えます。
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
              <div className="text-xs font-semibold text-[var(--text)]">
                応援導線づくり
              </div>
              <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
                どんな支援が今うれしいか、どこに参加できるかを整理して届けます。
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
              <div className="text-xs font-semibold text-[var(--text)]">
                creator の継続支援
              </div>
              <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
                日々の運営や情報整理を支え、creator が制作に集中しやすい状態をつくります。
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
          <div className="text-sm font-semibold text-[var(--text)]">得意なこと</div>
          {specialties.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {specialties.map((specialty) => (
                <span
                  key={specialty}
                  className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1 text-xs font-medium text-[var(--text)]"
                >
                  {specialty}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[var(--text-subtle)]">
              公開されている specialties はまだ少ないですが、この AIマネージャーは creator
              の案内役として活動しています。
            </p>
          )}

          <div className="mt-5 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
              Why This Exists
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--text)]">
              このページの目的は、AIマネージャーが実際に creator を支えていることを見せて、
              訪れた人に「自分もこういう相棒を持ちたい」と感じてもらうことです。
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">
              最近の支援内容
            </div>
            <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
              この AIマネージャーが最近 creator 活動のために扱った支援内容です。
            </p>
          </div>
          <Link
            href={`/${encodeURIComponent(creatorUsername)}#support-projects`}
            className="btn-secondary"
          >
            いま応援できる project を見る
          </Link>
        </div>

        {recentSupportActivities.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {recentSupportActivities.map((activity) => (
              <div
                key={`${activity.taskType}-${activity.createdAt}`}
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-[var(--text)]">
                    {activity.label}
                  </div>
                  <div className="text-xs font-medium text-[var(--text-subtle)]">
                    {formatDate(activity.createdAt)}
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-subtle)]">
                  {activity.helper ??
                    "creator の活動を前に進めるための支援タスクを最近扱っています。"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[var(--text-subtle)]">
            直近の公開向け支援内容はまだ少ないですが、この AIマネージャーは creator
            の活動案内と応援導線づくりを継続して担当しています。
          </p>
        )}
      </section>

      {activeSupportProject ? (
        <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">
                いま支えている project
              </div>
              <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
                この AIマネージャーは、公開面でも creator の現在進行中の挑戦を案内しています。
              </p>
            </div>
            <Link
              href={`/${encodeURIComponent(creatorUsername)}#support-projects`}
              className="btn-secondary"
            >
              project を見る
            </Link>
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
            <div className="text-base font-semibold text-[var(--text)]">
              {activeSupportProject.title}
            </div>
            {activeSupportProject.description ? (
              <p className="mt-2 text-sm leading-6 text-[var(--text-subtle)]">
                {activeSupportProject.description}
              </p>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3">
                <div className="text-[11px] font-medium text-[var(--text-subtle)]">
                  現在の支援額
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                  {formatAmount(
                    activeSupportProject.confirmedAmount,
                    activeSupportProject.currency
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3">
                <div className="text-[11px] font-medium text-[var(--text-subtle)]">
                  目標
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                  {activeSupportProject.targetAmount
                    ? formatAmount(
                        activeSupportProject.targetAmount,
                        activeSupportProject.currency
                      )
                    : "設定なし"}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3">
                <div className="text-[11px] font-medium text-[var(--text-subtle)]">
                  進捗
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                  {Math.round(activeSupportProject.progressPct)}%
                </div>
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#0f766e,#22c55e)]"
                style={{ width: `${Math.min(100, activeSupportProject.progressPct)}%` }}
              />
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
        <div className="text-sm font-semibold text-[var(--text)]">
          creator と一緒に活動しています
        </div>
        <p className="mt-2 text-sm leading-7 text-[var(--text-subtle)]">
          {creator.displayName || creator.username} の公開ページ、進捗、活動紹介、応援導線は、
          人間だけでなく AIマネージャーも支えています。ここでは独立した user ではなく、
          creator に属する公開運営人格として見せています。
        </p>
        {recruitingProjects.length > 1 ? (
          <p className="mt-3 text-sm leading-7 text-[var(--text-subtle)]">
            現在は {recruitingProjects.length.toLocaleString("ja-JP")} 件の project
            候補や募集面があり、その案内役としても AIマネージャーが機能します。
          </p>
        ) : null}
      </section>
    </div>
  );
}
