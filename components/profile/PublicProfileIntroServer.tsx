import Image from "next/image";
import Link from "next/link";

import {
  CREATOR_TYPE_LABELS,
  ECOSYSTEM_ROLE_LABELS,
  type CreatorType,
  type EcosystemRole,
} from "@/lib/creatorTaxonomy";
import {
  SOCIAL_ICON_CONFIG,
  type CreatorProfile,
  type SocialLinks,
} from "@/lib/profileTypes";
import { buildPublicProfileFaqEntries } from "@/lib/seo/publicProfileFaq";
import {
  getActiveSupportProject,
  type SupportProfileView,
  type SupportProjectView,
} from "@/lib/supportProfileView";

type PublicCreatorIntro = Omit<CreatorProfile, "address"> & {
  creatorType?: CreatorType | null;
  ecosystemRole?: EcosystemRole | null;
  socials?: SocialLinks | undefined;
};

type Props = {
  username: string;
  creator: PublicCreatorIntro;
  supportProfileView: SupportProfileView;
  recruitingProjects: SupportProjectView[];
  impactContent?: React.ReactNode;
  /** Creator Stage ラベル（Seed / Early / Emerging / Professionalizing / Established） */
  stageBadge?: string | null;
};

function getInitials(value: string): string {
  const normalized = value.trim();
  if (!normalized) return "?";
  return normalized.slice(0, 1).toUpperCase();
}

function formatSupportAmount(
  value: number | null,
  currency: "JPYC" | "USDC"
): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return currency === "USDC" ? "0.00 USDC" : `0 ${currency}`;
  }

  if (currency === "USDC") {
    return `${value.toLocaleString("ja-JP", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} USDC`;
  }

  return `${Math.floor(value).toLocaleString("ja-JP")} ${currency}`;
}

function extractYouTubeId(url: string): string {
  const match = url.match(/(?:v=|youtu\.be\/)([^&]+)/);
  return match ? match[1] : "";
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function buildSupportHref(username: string, projectId: string): string {
  return `/${username}?projectId=${encodeURIComponent(projectId)}&support=1#support-projects`;
}

function StaticAvatar(props: {
  src?: string | null;
  alt: string;
  fallbackText: string;
  size: number;
}) {
  if (!props.src) {
    return (
      <div
        style={{ width: props.size, height: props.size }}
        className="avatar-circle flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-400 to-sky-500 font-semibold text-white ring-2 ring-[var(--line)]"
        aria-label={props.alt}
      >
        {props.fallbackText}
      </div>
    );
  }

  return (
    <Image
      src={props.src}
      alt={props.alt}
      width={props.size}
      height={props.size}
      quality={95}
      sizes={`${props.size}px`}
      className="avatar-circle shrink-0 rounded-full object-cover bg-[var(--surface-subtle)] ring-2 ring-[var(--line)]"
    />
  );
}

function StaticSupportProjectCard(props: {
  creator: PublicCreatorIntro;
  displayName: string;
  project: SupportProjectView;
  compact?: boolean;
  actionHref?: string;
}) {
  const progressPct = Math.floor(clampProgress(props.project.progressPct));

  return (
    <article className="sheet-section px-4 py-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <StaticAvatar
          src={props.creator.avatarUrl}
          alt={`${props.displayName} のアイコン`}
          fallbackText={props.displayName.slice(0, 1) || "?"}
          size={44}
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-[var(--text)]">
            {props.displayName}
          </div>
          <div className="truncate text-xs text-[var(--text-subtle)]">
            @{props.creator.username}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="surface-chip">
            {props.project.currency}
          </span>
          <span className="text-xs font-medium text-[var(--text-subtle)]">
            {props.project.status === "ACHIEVED"
              ? "目標達成済み"
              : props.project.status === "NO_GOAL"
              ? "目標未設定"
              : "受付中"}
          </span>
        </div>

        <div className="mt-2 text-[15px] font-semibold text-[var(--text)]">
          {props.project.title}
        </div>
        {props.project.description ? (
          <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
            {props.project.description}
          </p>
        ) : null}
      </div>

      <div
        className={`mt-4 grid gap-3 border-t border-[var(--line)] pt-4 ${
          props.compact ? "sm:grid-cols-4" : "sm:grid-cols-3"
        }`}
      >
        <div className="data-tile px-4 py-3">
          <div className="text-[11px] font-medium text-[var(--text-subtle)]">
            集まった応援
          </div>
          <div className="mt-1 text-sm font-semibold text-[var(--text)]">
            {formatSupportAmount(
              props.project.confirmedAmount,
              props.project.currency
            )}
          </div>
        </div>
        <div className="data-tile px-4 py-3">
          <div className="text-[11px] font-medium text-[var(--text-subtle)]">
            目標
          </div>
          <div className="mt-1 text-sm font-semibold text-[var(--text)]">
            {props.project.targetAmount != null
              ? formatSupportAmount(
                  props.project.targetAmount,
                  props.project.currency
                )
              : "未設定"}
          </div>
        </div>
        <div className="data-tile px-4 py-3">
          <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-[var(--text-subtle)]">
            <span>進捗</span>
            <span className="font-semibold text-[var(--text)]">
              {progressPct}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface)]">
            <div
              className="h-full rounded-full bg-[var(--support)]"
              style={{ width: `${clampProgress(props.project.progressPct)}%` }}
            />
          </div>
        </div>
        {props.compact ? (
          <div className="data-tile px-4 py-3">
            <div className="text-[11px] font-medium text-[var(--text-subtle)]">
              状態
            </div>
            <div className="mt-1 text-sm font-semibold text-[var(--text)]">
              {props.project.deadline
                ? `期限 ${props.project.deadline.slice(0, 10)}`
                : props.project.status === "ACHIEVED"
                ? "達成済み"
                : "受付中"}
            </div>
          </div>
        ) : null}
      </div>

      {props.actionHref ? (
        <div className="mt-4 border-t border-[var(--line)] pt-4">
          <Link href={props.actionHref} className="btn w-full sm:w-auto">
            応援する
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export function PublicProfileIntroServer({
  username,
  creator,
  supportProfileView,
  recruitingProjects,
  impactContent,
  stageBadge,
}: Props) {
  const displayName = creator.displayName || username;
  const socialEntries = SOCIAL_ICON_CONFIG.flatMap((item) => {
    const url = creator.socials?.[item.key];
    if (!url) return [];
    return [{ key: item.key, label: item.label, icon: item.icon, url }];
  });
  const shouldShowExternalUrl =
    !!creator.url &&
    !socialEntries.some((entry) => entry.url === creator.url);
  const heroBackgroundStyle = creator.themeColor
    ? {
        backgroundImage: `linear-gradient(135deg, ${creator.themeColor}, color-mix(in srgb, ${creator.themeColor} 58%, white) 45%, color-mix(in srgb, ${creator.themeColor} 28%, white))`,
      }
    : undefined;

  const activeSupportProject = getActiveSupportProject(supportProfileView);
  const faqEntries = buildPublicProfileFaqEntries({
    displayName,
    recruitingProjectCount: recruitingProjects.length,
    supportProfileView,
  });
  const supportCardReady = activeSupportProject !== null;
  const supportTitle = supportCardReady
    ? activeSupportProject.title
    : supportProfileView.mode === "draft"
    ? supportProfileView.draft?.title ?? `${displayName}の公開ページは準備中です`
    : `${displayName}の公開ページは準備中です`;
  const supportDescription = supportCardReady
    ? activeSupportProject.description
    : supportProfileView.mode === "draft"
    ? supportProfileView.draft?.description ?? null
    : "公開ページを準備中です。応援内容が整うと、ここから確認できます。";
  const profileSummaryItems = [
    {
      label: "公開状態",
      value: supportCardReady
        ? "応援受付中"
        : supportProfileView.mode === "draft"
          ? "準備中"
          : "閲覧のみ",
    },
    {
      label: "募集中 project",
      value: `${recruitingProjects.length > 0 ? recruitingProjects.length : activeSupportProject ? 1 : 0}件`,
    },
    {
      label: "外部リンク",
      value: `${socialEntries.length + (shouldShowExternalUrl ? 1 : 0)}件`,
    },
    {
      label: "紹介動画",
      value: `${creator.youtubeVideos?.length ?? 0}件`,
    },
  ];

  return (
    <div className="space-y-4">
      <section className="sheet-section overflow-hidden">
        <div
          className="h-32 bg-[var(--surface-subtle)] sm:h-40"
          style={heroBackgroundStyle}
        />
        <div className="-mt-11 px-4 pb-3.5 sm:-mt-14 sm:px-5 sm:pb-4">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-6">
            <div className="min-w-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <div className="inline-flex rounded-full border-2 border-[var(--surface)] bg-[var(--surface)] p-1 shadow-sm">
                    <StaticAvatar
                      src={creator.avatarUrl}
                      alt={`${displayName} のアイコン`}
                      fallbackText={getInitials(displayName)}
                      size={76}
                    />
                  </div>
                  <div className="mt-2.5">
                    <h1 className="text-[1.25rem] font-semibold tracking-tight text-[var(--text)] sm:text-[1.4rem]">
                      {displayName}
                    </h1>
                    <p className="mt-0.5 text-[12px] text-[var(--text-subtle)]">@{username}</p>
                    {(creator.creatorType || creator.ecosystemRole || stageBadge) ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {creator.creatorType ? (
                          <span className="surface-chip">
                            {CREATOR_TYPE_LABELS[creator.creatorType]}
                          </span>
                        ) : null}
                        {creator.ecosystemRole ? (
                          <span className="surface-chip">
                            {ECOSYSTEM_ROLE_LABELS[creator.ecosystemRole]}
                          </span>
                        ) : null}
                        {stageBadge ? (
                          <span className="surface-chip text-[var(--text-subtle)]">
                            Stage: {stageBadge}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {creator.profile ? (
                    <p className="mt-2 max-w-2xl whitespace-pre-wrap text-[12px] leading-5 text-[var(--text)]">
                      {creator.profile}
                    </p>
                  ) : null}
                  {socialEntries.length > 0 || shouldShowExternalUrl ? (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {socialEntries.map((entry) => (
                        <Link
                          key={entry.key}
                          href={entry.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 w-8 items-center justify-center text-[var(--text-subtle)] transition hover:text-[var(--text)]"
                          aria-label={entry.label}
                        >
                          <Image
                            src={entry.icon}
                            alt={entry.label}
                            width={16}
                            height={16}
                            className="social-icon h-4 w-4"
                          />
                        </Link>
                      ))}
                      {shouldShowExternalUrl ? (
                        <Link
                          href={creator.url!}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 w-8 items-center justify-center text-[var(--text-subtle)] transition hover:text-[var(--text)]"
                          aria-label="外部リンク"
                        >
                          <Image
                            src="/icon/icon-link.svg"
                            alt="外部リンク"
                            width={16}
                            height={16}
                            className="social-icon h-4 w-4"
                          />
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                  {activeSupportProject ? (
                    <div className="mt-3">
                      <Link
                        href={buildSupportHref(username, activeSupportProject.projectId)}
                        className="btn"
                      >
                        {displayName}を応援する
                      </Link>
                    </div>
                  ) : null}
                  {impactContent ? (
                    <div className="mt-3 border-t border-[var(--line)] pt-3">
                      {impactContent}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <aside className="data-tile mt-4 hidden p-4 lg:block">
              <div className="section-kicker">
                プロフィール要約
              </div>
              <div className="mt-3 space-y-3">
                {profileSummaryItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="text-[11px] font-medium text-[var(--text-subtle)]">
                      {item.label}
                    </div>
                    <div className="text-sm font-semibold text-[var(--text)]">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {recruitingProjects.length === 0 ? (
        <section
          id="support-projects"
          className="sheet-section px-3.5 py-3 sm:px-4 sm:py-3.5"
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.88fr)_1.12fr] lg:items-start">
            <div className="min-w-0 space-y-3">
              <div className="section-kicker">Support</div>
              <div className="text-[14px] font-semibold text-[var(--text)] sm:text-[15px]">
                {supportTitle}
              </div>
              {supportDescription ? (
                <p className="mt-1 whitespace-pre-wrap text-[12px] leading-5 text-[var(--text-subtle)]">
                  {supportDescription}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <span className="surface-chip">
                  公開状態:{" "}
                  {supportProfileView.mode === "ready"
                    ? "公開中"
                    : supportProfileView.mode === "draft"
                      ? "準備中"
                      : "閲覧のみ"}
                </span>
                <span className="surface-chip">
                  募集 project {activeSupportProject ? "1件" : "0件"}
                </span>
              </div>
            </div>

            <div className="min-w-0">
              {activeSupportProject ? (
                <StaticSupportProjectCard
                  creator={creator}
                  displayName={displayName}
                  project={activeSupportProject}
                  compact
                />
              ) : (
                <div className="data-tile px-4 py-3 text-[12px] leading-5 text-[var(--text-subtle)]">
                  {supportProfileView.mode === "draft"
                    ? "公開ページを準備中です。応援内容が整うと、ここに進捗が表示されます。"
                    : "いまは応援内容を読み込めません。時間をおいてもう一度お試しください。"}
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section
          id="support-projects"
          className="sheet-section px-4 py-4 sm:px-5 sm:py-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="section-kicker">Support</div>
              <div className="text-base font-semibold text-[var(--text)]">
                募集中のプロジェクト
              </div>
              <p className="mt-1 text-sm text-[var(--text-subtle)]">
                いま応援を受け付けている project をまとめて見られます。
              </p>
            </div>
            <div className="text-sm text-[var(--text-subtle)]">
              {recruitingProjects.length} 件
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {recruitingProjects.map((project) => (
              <StaticSupportProjectCard
                key={project.projectId}
                creator={creator}
                displayName={displayName}
                project={project}
                actionHref={buildSupportHref(username, project.projectId)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="sheet-section px-4 py-4 sm:px-5 sm:py-5">
        <div className="section-kicker">FAQ</div>
        <div className="text-base font-semibold text-[var(--text)]">
          よくある質問
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          {faqEntries.map((entry) => (
            <article key={entry.question} className="data-tile px-4 py-4">
              <h2 className="text-sm font-semibold text-[var(--text)]">
                {entry.question}
              </h2>
              <p className="mt-2 text-[12px] leading-6 text-[var(--text-subtle)]">
                {entry.answer}
              </p>
            </article>
          ))}
        </div>
      </section>

      {creator.youtubeVideos && creator.youtubeVideos.length > 0 ? (
        <section className="sheet-section px-4 py-4 sm:px-5 sm:py-5">
          <div className="section-kicker">Video</div>
          <div className="text-base font-semibold text-[var(--text)]">紹介動画</div>
          <div className="mt-3 space-y-4">
            {creator.youtubeVideos.map((video, index) => {
              const videoId = extractYouTubeId(video.url);

              return (
                <div key={`${video.url}-${index}`} className="space-y-2.5">
                  {videoId ? (
                    <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-black">
                      <div className="aspect-video w-full">
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
                          title={video.title || "紹介動画"}
                          className="h-full w-full"
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  ) : video.url ? (
                    <Link
                      href={video.url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary px-3 py-2 text-sm"
                    >
                      動画を開く
                    </Link>
                  ) : null}
                  <div>
                    <div className="text-[15px] font-semibold text-[var(--text)]">
                      {video.title || "紹介動画"}
                    </div>
                    {video.description ? (
                      <p className="mt-1.5 text-[13px] leading-6 text-[var(--text-subtle)]">
                        {video.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
