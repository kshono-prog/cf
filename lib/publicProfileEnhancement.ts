import { unstable_cache } from "next/cache";

import { normalizeAddress } from "@/lib/api/guards";
import { decimalToAmountByCurrency } from "@/lib/currencyUtils";
import { prisma } from "@/lib/prisma";
import { PUBLIC_CLOSED_PROJECT_STATUSES } from "@/lib/recruitingProjects";
import type { SupportProjectView } from "@/lib/supportProfileView";

export type RecentPublicContributor = {
  address: string;
  addressAbbr: string;
  displayLabel: string;
  avatarUrl: string | null;
  username: string | null;
};

export type PublicProfileRecentSupportersData = {
  recentContributors: RecentPublicContributor[];
  totalContributorCount: number;
};

export type PublicProfileSupporterWallItem = {
  address: string;
  addressAbbr: string;
  displayLabel: string;
  avatarUrl: string | null;
  username: string | null;
};

export type PublicProfileSupporterWallData = {
  supporters: PublicProfileSupporterWallItem[];
  totalSupporterCount: number;
};

export type PublicProfileActivityHeatmapCell = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
};

export type PublicProfileActivityHeatmapWeek = {
  startDate: string;
  monthLabel: string | null;
  cells: PublicProfileActivityHeatmapCell[];
};

export type PublicProfileActivityHeatmapData = {
  weeks: PublicProfileActivityHeatmapWeek[];
  totalPosts: number;
  activeDays: number;
  windowWeeks: number;
};

export type PublicProfileNextGoalRevealData = {
  projectTitle: string;
  projectDescription: string | null;
  currency: "JPYC" | "USDC";
  targetAmount: number;
  confirmedAmount: number;
  remainingAmount: number;
  progressPct: number;
  deadline: string | null;
  recentSupporterCount: number;
  recentAmount: number;
  estimatedCompletionAt: string | null;
  estimatedDays: number | null;
};

type SupporterIdentity = {
  address: string;
  addressAbbr: string;
  displayLabel: string;
  avatarUrl: string | null;
  username: string | null;
};

function abbreviateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function resolveSupporterIdentityMap(
  addresses: string[]
): Promise<Map<string, SupporterIdentity>> {
  const normalized = [...new Set(addresses.map((address) => normalizeAddress(address)))];

  if (normalized.length === 0) {
    return new Map();
  }

  const profiles = await prisma.creatorProfile.findMany({
    where: {
      walletAddress: {
        in: normalized,
      },
    },
    select: {
      walletAddress: true,
      displayName: true,
      avatarUrl: true,
      username: true,
    },
  });

  const byAddress = new Map<string, SupporterIdentity>();
  for (const profile of profiles) {
    if (!profile.walletAddress) continue;
    const normalizedAddress = normalizeAddress(profile.walletAddress);
    byAddress.set(normalizedAddress, {
      address: profile.walletAddress,
      addressAbbr: abbreviateAddress(profile.walletAddress),
      displayLabel: profile.displayName,
      avatarUrl: profile.avatarUrl ?? null,
      username: profile.username,
    });
  }

  return byAddress;
}

function toSupporterIdentity(
  address: string,
  identityMap: Map<string, SupporterIdentity>
): SupporterIdentity {
  const normalizedAddress = normalizeAddress(address);
  const knownIdentity = identityMap.get(normalizedAddress);

  if (knownIdentity) {
    return {
      ...knownIdentity,
      address,
      addressAbbr: abbreviateAddress(address),
    };
  }

  return {
    address,
    addressAbbr: abbreviateAddress(address),
    displayLabel: abbreviateAddress(address),
    avatarUrl: null,
    username: null,
  };
}

async function getRecentPublicContributorsUncached(
  creatorProfileId: bigint,
  limit: number
): Promise<PublicProfileRecentSupportersData> {
  const projects = await prisma.project.findMany({
    where: {
      creatorProfileId,
      status: { notIn: Array.from(PUBLIC_CLOSED_PROJECT_STATUSES) },
    },
    select: { id: true },
  });

  if (projects.length === 0) {
    return { recentContributors: [], totalContributorCount: 0 };
  }

  const projectIds = projects.map((p) => p.id);

  const [recentRows, distinctRows] = await Promise.all([
    prisma.contribution.findMany({
      where: { projectId: { in: projectIds }, status: "CONFIRMED" },
      select: { fromAddress: true },
      orderBy: { confirmedAt: "desc" },
      take: limit * 10,
    }),
    prisma.contribution.groupBy({
      by: ["fromAddress"],
      where: { projectId: { in: projectIds }, status: "CONFIRMED" },
    }),
  ]);

  const seen = new Set<string>();
  const recentAddresses: string[] = [];
  for (const row of recentRows) {
    if (!seen.has(row.fromAddress)) {
      seen.add(row.fromAddress);
      recentAddresses.push(row.fromAddress);
      if (recentAddresses.length >= limit) break;
    }
  }

  const identityMap = await resolveSupporterIdentityMap(recentAddresses);
  const recentContributors = recentAddresses.map((address) =>
    toSupporterIdentity(address, identityMap)
  );

  return {
    recentContributors,
    totalContributorCount: distinctRows.length,
  };
}

const _cached = unstable_cache(
  (idStr: string, limit: number) =>
    getRecentPublicContributorsUncached(BigInt(idStr), limit),
  ["public-profile-recent-supporters"],
  { revalidate: 120 }
);

export async function getRecentPublicContributors(
  creatorProfileId: bigint,
  limit = 4
): Promise<PublicProfileRecentSupportersData> {
  return _cached(creatorProfileId.toString(), limit);
}

async function getPublicSupporterWallUncached(
  creatorProfileId: bigint,
  limit: number
): Promise<PublicProfileSupporterWallData> {
  const [recentRows, distinctRows] = await Promise.all([
    prisma.contribution.findMany({
      where: {
        project: { creatorProfileId },
        status: "CONFIRMED",
      },
      select: { fromAddress: true },
      orderBy: { confirmedAt: "desc" },
      take: limit * 12,
    }),
    prisma.contribution.groupBy({
      by: ["fromAddress"],
      where: {
        project: { creatorProfileId },
        status: "CONFIRMED",
      },
    }),
  ]);

  const seen = new Set<string>();
  const supporterAddresses: string[] = [];
  for (const row of recentRows) {
    if (seen.has(row.fromAddress)) continue;
    seen.add(row.fromAddress);
    supporterAddresses.push(row.fromAddress);
    if (supporterAddresses.length >= limit) break;
  }

  const identityMap = await resolveSupporterIdentityMap(supporterAddresses);

  return {
    supporters: supporterAddresses.map((address) =>
      toSupporterIdentity(address, identityMap)
    ),
    totalSupporterCount: distinctRows.length,
  };
}

const _cachedSupporterWall = unstable_cache(
  (idStr: string, limit: number) =>
    getPublicSupporterWallUncached(BigInt(idStr), limit),
  ["public-profile-supporter-wall"],
  { revalidate: 120 }
);

export async function getPublicSupporterWall(
  creatorProfileId: bigint,
  limit = 10
): Promise<PublicProfileSupporterWallData> {
  return _cachedSupporterWall(creatorProfileId.toString(), limit);
}

function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function startOfWeekMonday(value: Date): Date {
  const date = startOfLocalDay(value);
  const weekday = date.getDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  date.setDate(date.getDate() + delta);
  return date;
}

function toDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveHeatLevel(count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || maxCount <= 0) return 0;
  if (maxCount === 1) return 4;

  const ratio = count / maxCount;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

async function getPublicActivityHeatmapUncached(
  creatorProfileId: bigint,
  windowWeeks: number
): Promise<PublicProfileActivityHeatmapData | null> {
  const startDate = startOfWeekMonday(
    new Date(Date.now() - (windowWeeks - 1) * 7 * 24 * 60 * 60 * 1000)
  );

  const posts = await prisma.post.findMany({
    where: {
      creatorProfileId,
      createdAt: { gte: startDate },
      OR: [
        { status: "PUBLISHED", visibility: "PUBLIC" },
        { status: "PUBLIC" },
      ],
    },
    select: {
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (posts.length === 0) {
    return null;
  }

  const countsByDate = new Map<string, number>();
  for (const post of posts) {
    const key = toDateKey(post.createdAt);
    countsByDate.set(key, (countsByDate.get(key) ?? 0) + 1);
  }

  const maxCount = Math.max(...countsByDate.values());
  const weeks: PublicProfileActivityHeatmapWeek[] = [];

  for (let weekIndex = 0; weekIndex < windowWeeks; weekIndex += 1) {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + weekIndex * 7);

    const previousWeekStart =
      weekIndex > 0
        ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + (weekIndex - 1) * 7)
        : null;

    const monthLabel =
      weekIndex === 0 || previousWeekStart?.getMonth() !== weekStart.getMonth()
        ? `${weekStart.getMonth() + 1}月`
        : null;

    const cells: PublicProfileActivityHeatmapCell[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + dayIndex);
      const key = toDateKey(date);
      const count = countsByDate.get(key) ?? 0;

      cells.push({
        date: date.toISOString(),
        count,
        level: resolveHeatLevel(count, maxCount),
      });
    }

    weeks.push({
      startDate: weekStart.toISOString(),
      monthLabel,
      cells,
    });
  }

  return {
    weeks,
    totalPosts: posts.length,
    activeDays: countsByDate.size,
    windowWeeks,
  };
}

const _cachedActivityHeatmap = unstable_cache(
  (idStr: string, windowWeeks: number) =>
    getPublicActivityHeatmapUncached(BigInt(idStr), windowWeeks),
  ["public-profile-activity-heatmap"],
  { revalidate: 120 }
);

export async function getPublicActivityHeatmap(
  creatorProfileId: bigint,
  windowWeeks = 20
): Promise<PublicProfileActivityHeatmapData | null> {
  return _cachedActivityHeatmap(creatorProfileId.toString(), windowWeeks);
}

async function getPublicNextGoalRevealUncached(
  project: SupportProjectView
): Promise<PublicProfileNextGoalRevealData | null> {
  if (
    project.currency !== "JPYC" &&
    project.currency !== "USDC"
  ) {
    return null;
  }

  if (project.status !== "OPEN" || project.targetAmount == null) {
    return null;
  }

  const remainingAmount = Math.max(0, project.targetAmount - project.confirmedAmount);
  if (remainingAmount <= 0) {
    return null;
  }

  const since30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const projectId = BigInt(project.projectId);

  const [recentAmountAggregate, recentSupporters] = await Promise.all([
    prisma.contribution.aggregate({
      where: {
        projectId,
        status: "CONFIRMED",
        confirmedAt: { gte: since30Days },
      },
      _sum: {
        amountDecimal: true,
      },
    }),
    prisma.contribution.groupBy({
      by: ["fromAddress"],
      where: {
        projectId,
        status: "CONFIRMED",
        confirmedAt: { gte: since30Days },
      },
    }),
  ]);

  const recentAmount = decimalToAmountByCurrency(
    project.currency,
    recentAmountAggregate._sum.amountDecimal ?? null
  );

  let estimatedCompletionAt: string | null = null;
  let estimatedDays: number | null = null;

  if (recentAmount > 0) {
    const dailyPace = recentAmount / 30;
    if (dailyPace > 0) {
      estimatedDays = Math.ceil(remainingAmount / dailyPace);
      const estimateDate = new Date();
      estimateDate.setDate(estimateDate.getDate() + estimatedDays);
      estimatedCompletionAt = estimateDate.toISOString();
    }
  }

  return {
    projectTitle: project.title,
    projectDescription: project.description,
    currency: project.currency,
    targetAmount: project.targetAmount,
    confirmedAmount: project.confirmedAmount,
    remainingAmount,
    progressPct: project.progressPct,
    deadline: project.deadline,
    recentSupporterCount: recentSupporters.length,
    recentAmount,
    estimatedCompletionAt,
    estimatedDays,
  };
}

const _cachedNextGoalReveal = unstable_cache(
  (
    projectId: string,
    currency: "JPYC" | "USDC",
    targetAmount: number,
    confirmedAmount: number,
    progressPct: number,
    status: string,
    deadline: string | null,
    title: string,
    description: string | null
  ) =>
    getPublicNextGoalRevealUncached({
      projectId,
      currency,
      targetAmount,
      confirmedAmount,
      progressPct,
      status: status as SupportProjectView["status"],
      deadline,
      title,
      description,
      achievedAt: null,
    }),
  ["public-profile-next-goal-reveal"],
  { revalidate: 120 }
);

export async function getPublicNextGoalReveal(
  project: SupportProjectView | null
): Promise<PublicProfileNextGoalRevealData | null> {
  if (
    !project ||
    (project.currency !== "JPYC" && project.currency !== "USDC") ||
    project.targetAmount == null
  ) {
    return null;
  }

  return _cachedNextGoalReveal(
    project.projectId,
    project.currency,
    project.targetAmount,
    project.confirmedAmount,
    project.progressPct,
    project.status,
    project.deadline,
    project.title,
    project.description
  );
}
