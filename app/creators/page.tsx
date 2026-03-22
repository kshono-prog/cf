// app/creators/page.tsx
// Creator discovery page — shows public creator profiles with creatorType filter.

import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { isCreatorType, CREATOR_TYPE_OPTIONS, CREATOR_TYPE_LABELS } from "@/lib/creatorTaxonomy";
import type { CreatorType } from "@/lib/creatorTaxonomy";
import { Avatar } from "@/components/shared/Avatar";

export const metadata: Metadata = {
  title: "クリエイターを探す — Creator Founding",
  description: "Creator Founding に参加しているクリエイターを一覧で見つけられます。",
};

export const revalidate = 120;

type SearchParams = { creatorType?: string };

async function fetchCreators(creatorType: CreatorType | null) {
  const rows = await prisma.creatorProfile.findMany({
    where: creatorType ? { creatorType } : undefined,
    orderBy: { createdAt: "asc" },
    take: 60,
    select: {
      username: true,
      displayName: true,
      profileText: true,
      avatarUrl: true,
      creatorType: true,
      _count: {
        select: {
          posts: { where: { status: "PUBLIC" } },
        },
      },
      projects: {
        take: 1,
        select: {
          goal: {
            select: { achievedAt: true },
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
    creatorType: isCreatorType(r.creatorType ?? "") ? (r.creatorType as CreatorType) : null,
    postCount: r._count.posts,
    hasAchievedGoal: r.projects.some(
      (p) => p.goal !== null && p.goal.achievedAt !== null
    ),
  }));
}

type CreatorRow = Awaited<ReturnType<typeof fetchCreators>>[number];

function CreatorCard({ creator }: { creator: CreatorRow }) {
  const typeLabel = creator.creatorType ? CREATOR_TYPE_LABELS[creator.creatorType] : null;
  const profileExcerpt = creator.profileText
    ? creator.profileText.slice(0, 60) + (creator.profileText.length > 60 ? "…" : "")
    : null;

  return (
    <Link
      href={`/${creator.username}`}
      className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 transition hover:border-[var(--muted)] hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <Avatar
          src={creator.avatarUrl}
          alt={creator.displayName}
          fallbackText={creator.displayName.slice(0, 1)}
          size={44}
        />
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-[var(--text)]">
            {creator.displayName}
          </div>
          <div className="text-[11px] text-[var(--muted)]">@{creator.username}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {typeLabel ? (
          <span className="rounded-full bg-[var(--bg)] border border-[var(--line)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-subtle)]">
            {typeLabel}
          </span>
        ) : null}
        {creator.hasAchievedGoal ? (
          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
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
    </Link>
  );
}

export default async function CreatorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { creatorType: typeParam } = await searchParams;
  const selectedType =
    typeof typeParam === "string" && isCreatorType(typeParam) ? typeParam : null;

  const creators = await fetchCreators(selectedType);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">クリエイターを探す</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Creator Founding に参加しているクリエイターを見つけて、活動を応援しましょう。
        </p>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/creators"
          className={`rounded-full border px-3 py-1 text-[12px] font-medium transition ${
            !selectedType
              ? "border-[var(--text)] bg-[var(--text)] text-[var(--bg)]"
              : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--muted)]"
          }`}
        >
          すべて
        </Link>
        {CREATOR_TYPE_OPTIONS.map((type) => (
          <Link
            key={type}
            href={`/creators?creatorType=${type}`}
            className={`rounded-full border px-3 py-1 text-[12px] font-medium transition ${
              selectedType === type
                ? "border-[var(--text)] bg-[var(--text)] text-[var(--bg)]"
                : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--muted)]"
            }`}
          >
            {CREATOR_TYPE_LABELS[type]}
          </Link>
        ))}
      </div>

      {creators.length === 0 ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-6 py-10 text-center text-sm text-[var(--muted)]">
          {selectedType
            ? `「${CREATOR_TYPE_LABELS[selectedType]}」のクリエイターはまだいません。`
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
