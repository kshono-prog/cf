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

export const metadata: Metadata = {
  title: "クリエイターを探す — Creator Founding",
  description: "Creator Founding に参加しているクリエイターを一覧で見つけられます。",
};

export const revalidate = 120;

type SearchParams = { creatorType?: string; ecosystemRole?: string };

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
  const selectedType =
    typeof typeParam === "string" && isCreatorType(typeParam) ? typeParam : null;
  const selectedRole =
    typeof roleParam === "string" && isEcosystemRole(roleParam) ? roleParam : null;

  const creators = await getCachedCreators(selectedType, selectedRole);

  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">クリエイターを探す</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Creator Founding に参加しているクリエイターを見つけて、活動を応援しましょう。
        </p>
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
