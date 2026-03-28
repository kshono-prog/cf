// app/creators/page.tsx
// Creator discovery page — shows public creator profiles with creatorType filter.

import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import {
  isCreatorType,
  CREATOR_TYPE_OPTIONS,
  CREATOR_TYPE_LABELS,
  isEcosystemRole,
  ECOSYSTEM_ROLE_OPTIONS,
  ECOSYSTEM_ROLE_LABELS,
} from "@/lib/creatorTaxonomy";
import type { CreatorType, EcosystemRole } from "@/lib/creatorTaxonomy";
import { Avatar } from "@/components/shared/Avatar";
import { serializeJsonLd } from "@/lib/seo/jsonLd";
import { buildCreatorDiscoveryStructuredData } from "@/lib/seo/creatorDiscoveryStructuredData";
import { withBaseUrl } from "@/utils/baseUrl";

const SITE_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";
const CREATORS_SOCIAL_IMAGE_URL = withBaseUrl("/icon/nagesen250.png", SITE_BASE_URL);

export const revalidate = 120;

type SearchParams = { creatorType?: string; ecosystemRole?: string };

function resolveCreatorType(value: string | undefined): CreatorType | null {
  return typeof value === "string" && isCreatorType(value) ? value : null;
}

function resolveEcosystemRole(value: string | undefined): EcosystemRole | null {
  return typeof value === "string" && isEcosystemRole(value) ? value : null;
}

function buildCreatorsFilterQueryString(
  creatorType: CreatorType | null,
  ecosystemRole: EcosystemRole | null
): string {
  const params = new URLSearchParams();

  if (creatorType) {
    params.set("creatorType", creatorType);
  }

  if (ecosystemRole) {
    params.set("ecosystemRole", ecosystemRole);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

function buildCreatorsMetadataCopy(
  creatorType: CreatorType | null,
  ecosystemRole: EcosystemRole | null
): {
  heading: string;
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl: string;
} {
  const typeLabel = creatorType ? CREATOR_TYPE_LABELS[creatorType] : null;
  const roleLabel = ecosystemRole ? ECOSYSTEM_ROLE_LABELS[ecosystemRole] : null;
  const queryString = buildCreatorsFilterQueryString(creatorType, ecosystemRole);
  const canonicalUrl = withBaseUrl(`/creators${queryString}`, SITE_BASE_URL);

  if (typeLabel && roleLabel) {
    return {
      heading: `${typeLabel} の ${roleLabel}を探す`,
      title: `${typeLabel} の ${roleLabel}を探す — Creator Founding`,
      description: `${typeLabel} 領域で活動する ${roleLabel} を Creator Founding で一覧できます。公開プロフィールや支援導線、投稿の雰囲気をまとめて確認できます。`,
      keywords: [
        "クリエイターを探す",
        "Creator Founding",
        typeLabel,
        roleLabel,
        `${typeLabel} ${roleLabel}`,
      ],
      canonicalUrl,
    };
  }

  if (typeLabel) {
    return {
      heading: `${typeLabel} のクリエイターを探す`,
      title: `${typeLabel} のクリエイターを探す — Creator Founding`,
      description: `${typeLabel} で活動するクリエイターを Creator Founding で見つけられます。公開プロフィール、支援導線、投稿の様子を一覧で確認できます。`,
      keywords: [
        "クリエイターを探す",
        "Creator Founding",
        typeLabel,
        `${typeLabel} クリエイター`,
      ],
      canonicalUrl,
    };
  }

  if (roleLabel) {
    return {
      heading: `${roleLabel} を探す`,
      title: `${roleLabel} を探す — Creator Founding`,
      description: `Creator Founding に参加している ${roleLabel} を一覧できます。公開プロフィールや活動の見え方を比較しながら探せます。`,
      keywords: [
        "クリエイターを探す",
        "Creator Founding",
        roleLabel,
        `${roleLabel} 一覧`,
      ],
      canonicalUrl,
    };
  }

  return {
    heading: "クリエイターを探す",
    title: "クリエイターを探す — Creator Founding",
    description: "Creator Founding に参加しているクリエイターを一覧で見つけられます。",
    keywords: [
      "クリエイターを探す",
      "Creator Founding",
      "クリエイター一覧",
      "コラボレーター",
      "マネージャー",
    ],
    canonicalUrl,
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const creatorType = resolveCreatorType(params.creatorType);
  const ecosystemRole = resolveEcosystemRole(params.ecosystemRole);
  const metadataCopy = buildCreatorsMetadataCopy(creatorType, ecosystemRole);

  return {
    title: metadataCopy.title,
    description: metadataCopy.description,
    alternates: {
      canonical: metadataCopy.canonicalUrl,
    },
    keywords: metadataCopy.keywords,
    openGraph: {
      title: metadataCopy.title,
      description: metadataCopy.description,
      url: metadataCopy.canonicalUrl,
      siteName: "Creator Founding",
      locale: "ja_JP",
      type: "website",
      images: [{ url: CREATORS_SOCIAL_IMAGE_URL }],
    },
    twitter: {
      card: "summary_large_image",
      title: metadataCopy.title,
      description: metadataCopy.description,
      images: [CREATORS_SOCIAL_IMAGE_URL],
    },
  };
}

const discoveryChipBaseClass =
  "rounded-full border px-3 py-1 text-[12px] font-medium transition";
const discoveryChipIdleClass =
  "border-[var(--line)] text-[var(--text-subtle)] hover:border-[var(--text-subtle)] hover:text-[var(--text)]";
const discoveryTypeChipSelectedClass =
  "border-slate-200 bg-slate-100 text-slate-900 shadow-sm";
const discoveryRoleChipSelectedClass =
  "border-violet-500 bg-violet-500 text-white shadow-sm";
const discoveryRoleChipSoftSelectedClass =
  "border-violet-300 bg-violet-500/12 text-violet-700 shadow-sm";

async function fetchCreators(
  creatorType: CreatorType | null,
  ecosystemRole: EcosystemRole | null
) {
  const where: Record<string, unknown> = {};
  if (creatorType) where.creatorType = creatorType;
  if (ecosystemRole) where.ecosystemRole = ecosystemRole;

  const rows = await prisma.creatorProfile.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: { createdAt: "asc" },
    take: 60,
    select: {
      username: true,
      displayName: true,
      profileText: true,
      avatarUrl: true,
      themeColor: true,
      creatorType: true,
      ecosystemRole: true,
      _count: {
        select: {
          posts: { where: { status: "PUBLIC" } },
        },
      },
      projects: {
        take: 3,
        select: {
          goal: {
            select: { achievedAt: true },
          },
          _count: {
            select: {
              contributions: { where: { status: "CONFIRMED" } },
            },
          },
        },
      },
    },
  });

  return rows.map((r) => ({
    username: r.username,
    displayName: r.displayName ?? r.username,
    profileText: r.profileText ?? null,
    avatarUrl: r.avatarUrl ?? null,
    themeColor: r.themeColor ?? null,
    creatorType: isCreatorType(r.creatorType ?? "") ? (r.creatorType as CreatorType) : null,
    ecosystemRole: isEcosystemRole(r.ecosystemRole ?? "") ? (r.ecosystemRole as EcosystemRole) : null,
    postCount: r._count.posts,
    supporterCount: r.projects.reduce((sum, p) => sum + p._count.contributions, 0),
    hasAchievedGoal: r.projects.some(
      (p) => p.goal !== null && p.goal.achievedAt !== null
    ),
  }));
}

const getCachedCreators = unstable_cache(
  async (creatorType: string | null, ecosystemRole: string | null) =>
    fetchCreators(
      creatorType && isCreatorType(creatorType) ? creatorType : null,
      ecosystemRole && isEcosystemRole(ecosystemRole) ? ecosystemRole : null
    ),
  ["creators-page-list"],
  { revalidate: 120 }
);

type CreatorRow = Awaited<ReturnType<typeof fetchCreators>>[number];

function CreatorCard({ creator }: { creator: CreatorRow }) {
  const typeLabel = creator.creatorType ? CREATOR_TYPE_LABELS[creator.creatorType] : null;
  const roleLabel = creator.ecosystemRole ? ECOSYSTEM_ROLE_LABELS[creator.ecosystemRole] : null;
  const profileExcerpt = creator.profileText
    ? creator.profileText.slice(0, 72) + (creator.profileText.length > 72 ? "…" : "")
    : null;

  const bannerStyle = creator.themeColor
    ? {
        backgroundImage: `linear-gradient(135deg, ${creator.themeColor}, color-mix(in srgb, ${creator.themeColor} 50%, white) 60%, color-mix(in srgb, ${creator.themeColor} 20%, white))`,
      }
    : undefined;

  return (
    <Link
      href={`/${creator.username}`}
      className="flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] transition hover:border-[var(--muted)] hover:shadow-sm"
    >
      {/* Theme color banner */}
      <div
        className="h-10 bg-[var(--surface-subtle)]"
        style={bannerStyle}
      />

      <div className="flex flex-col gap-2.5 p-4 -mt-5">
        {/* Avatar row */}
        <div className="flex items-end justify-between gap-2">
          <div className="inline-flex rounded-full border-2 border-[var(--surface)] bg-[var(--surface)] shadow-sm">
            <Avatar
              src={creator.avatarUrl}
              alt={creator.displayName}
              fallbackText={creator.displayName.slice(0, 1)}
              size={44}
            />
          </div>
          {/* Supporter count */}
          {creator.supporterCount > 0 ? (
            <div className="mb-0.5 flex items-center gap-1 text-[11px] text-[var(--text-subtle)]">
              <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
                <path
                  d="M12 20.3C5.5 16.3 3 13 3 9.5A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9 3.5C21 13 18.5 16.3 12 20.3Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="font-medium">{creator.supporterCount.toLocaleString()}人</span>
            </div>
          ) : null}
        </div>

        {/* Name */}
        <div>
          <div className="truncate text-[13px] font-semibold text-[var(--text)]">
            {creator.displayName}
          </div>
          <div className="text-[11px] text-[var(--muted)]">@{creator.username}</div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {roleLabel ? (
            <span className="rounded-full bg-violet-500/15 border border-violet-500/30 px-2 py-0.5 text-[10px] font-medium text-violet-500">
              {roleLabel}
            </span>
          ) : null}
          {typeLabel ? (
            <span className="rounded-full bg-[var(--bg)] border border-[var(--line)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-subtle)]">
              {typeLabel}
            </span>
          ) : null}
          {creator.hasAchievedGoal ? (
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
              目標達成実績あり
            </span>
          ) : null}
          {creator.postCount > 0 ? (
            <span className="rounded-full bg-[var(--bg)] border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
              {creator.postCount.toLocaleString()}件の投稿
            </span>
          ) : null}
        </div>

        {profileExcerpt ? (
          <p className="text-[12px] leading-5 text-[var(--text-subtle)]">{profileExcerpt}</p>
        ) : null}
      </div>
    </Link>
  );
}

export default async function CreatorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { creatorType: typeParam, ecosystemRole: roleParam } = await searchParams;
  const selectedType = resolveCreatorType(typeParam);
  const selectedRole = resolveEcosystemRole(roleParam);
  const metadataCopy = buildCreatorsMetadataCopy(selectedType, selectedRole);

  const creators = await getCachedCreators(selectedType, selectedRole);
  const structuredData = buildCreatorDiscoveryStructuredData({
    baseUrl: SITE_BASE_URL,
    creators: creators.map((creator) => ({
      username: creator.username,
      displayName: creator.displayName,
      profileText: creator.profileText,
      avatarUrl: creator.avatarUrl,
      creatorType: creator.creatorType,
      ecosystemRole: creator.ecosystemRole,
    })),
    selectedType,
    selectedRole,
  });

  return (
    <div className="space-y-6 py-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(structuredData),
        }}
      />
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">{metadataCopy.heading}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{metadataCopy.description}</p>
      </div>

      {/* Filter chips — creator type */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Link
            href={selectedRole ? `/creators?ecosystemRole=${selectedRole}` : "/creators"}
            className={`${discoveryChipBaseClass} ${
              !selectedType
                ? discoveryTypeChipSelectedClass
                : discoveryChipIdleClass
            }`}
          >
            すべて
          </Link>
          {CREATOR_TYPE_OPTIONS.map((type) => {
            const href = selectedRole
              ? `/creators?creatorType=${type}&ecosystemRole=${selectedRole}`
              : `/creators?creatorType=${type}`;
            return (
              <Link
                key={type}
                href={href}
                className={`${discoveryChipBaseClass} ${
                  selectedType === type
                    ? discoveryTypeChipSelectedClass
                    : discoveryChipIdleClass
                }`}
              >
                {CREATOR_TYPE_LABELS[type]}
              </Link>
            );
          })}
        </div>
        {/* Filter chips — ecosystem role */}
        <div className="flex flex-wrap gap-2">
          <Link
            href={selectedType ? `/creators?creatorType=${selectedType}` : "/creators"}
            className={`${discoveryChipBaseClass} ${
              !selectedRole
                ? discoveryRoleChipSoftSelectedClass
                : discoveryChipIdleClass
            }`}
          >
            全ロール
          </Link>
          {ECOSYSTEM_ROLE_OPTIONS.map((role) => {
            const href = selectedType
              ? `/creators?creatorType=${selectedType}&ecosystemRole=${role}`
              : `/creators?ecosystemRole=${role}`;
            return (
              <Link
                key={role}
                href={href}
                className={`${discoveryChipBaseClass} ${
                  selectedRole === role
                    ? discoveryRoleChipSelectedClass
                    : `${discoveryChipIdleClass} hover:border-violet-400`
                }`}
              >
                {ECOSYSTEM_ROLE_LABELS[role]}
              </Link>
            );
          })}
        </div>
      </div>

      {creators.length === 0 ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-6 py-10 text-center text-sm text-[var(--muted)]">
          {selectedType || selectedRole
            ? `該当するクリエイターはまだいません。`
            : "クリエイターがまだいません。"}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {creators.map((creator) => (
            <CreatorCard key={creator.username} creator={creator} />
          ))}
        </div>
      )}

      <p className="text-center text-[11px] text-[var(--muted)]">
        最大 60 名を表示しています。
      </p>
    </div>
  );
}
