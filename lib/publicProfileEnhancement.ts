import { unstable_cache } from "next/cache";

import { normalizeAddress } from "@/lib/api/guards";
import { decimalToAmountByCurrency } from "@/lib/currencyUtils";
import { prisma } from "@/lib/prisma";
import { isPrismaUnavailableError, withPrismaRetry } from "@/lib/prismaRetry";
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

export type PublicProfilePageEnhancements = {
  recentSupporters: PublicProfileRecentSupportersData;
  supporterWall: PublicProfileSupporterWallData;
  contributorMetrics: PublicProfileContributorMetrics;
  activityHeatmap: PublicProfileActivityHeatmapData | null;
  microTestimonials: PublicProfileMicroTestimonialsData;
  supporterTrust: PublicProfileSupporterTrustData | null;
  revenueProof: PublicProfileRevenueProofData | null;
  teamMembers: PublicProfileTeamData | null;
};

export type PublicProfileContributorMetrics = {
  totalContributorCount: number;
  repeatSupporterCount: number;
};

type PublicProfileContributionBundle = {
  openProjectIds: string[];
  contributions: Array<{
    projectId: string;
    fromAddress: string;
    message: string | null;
    confirmedAt: string | null;
  }>;
  identityMap: Record<string, SupporterIdentity>;
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
): Promise<Record<string, SupporterIdentity>> {
  const normalized = [...new Set(addresses.map((address) => normalizeAddress(address)))];

  if (normalized.length === 0) {
    return {};
  }

  let profiles: Array<{
    walletAddress: string | null;
    displayName: string;
    avatarUrl: string | null;
    username: string;
  }> = [];
  try {
    profiles = await withPrismaRetry(() =>
      prisma.creatorProfile.findMany({
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
      })
    );
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return {};
    }
    throw error;
  }

  const byAddress: Record<string, SupporterIdentity> = {};
  for (const profile of profiles) {
    if (!profile.walletAddress) continue;
    const normalizedAddress = normalizeAddress(profile.walletAddress);
    byAddress[normalizedAddress] = {
      address: profile.walletAddress,
      addressAbbr: abbreviateAddress(profile.walletAddress),
      displayLabel: profile.displayName,
      avatarUrl: profile.avatarUrl ?? null,
      username: profile.username,
    };
  }

  return byAddress;
}

function toSupporterIdentity(
  address: string,
  identityMap: Record<string, SupporterIdentity>
): SupporterIdentity {
  const normalizedAddress = normalizeAddress(address);
  const knownIdentity = identityMap[normalizedAddress];

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

async function loadPublicProfileContributionBundleUncached(
  creatorProfileId: bigint
): Promise<PublicProfileContributionBundle> {
  const [openProjects, contributions] = await Promise.all([
    withPrismaRetry(() =>
      prisma.project.findMany({
        where: {
          creatorProfileId,
          status: { notIn: Array.from(PUBLIC_CLOSED_PROJECT_STATUSES) },
        },
        select: { id: true },
      })
    ),
    withPrismaRetry(() =>
      prisma.contribution.findMany({
        where: {
          project: { creatorProfileId },
          status: "CONFIRMED",
        },
        select: {
          projectId: true,
          fromAddress: true,
          message: true,
          confirmedAt: true,
        },
        orderBy: { confirmedAt: "desc" },
      })
    ),
  ]);

  const identityMap = await resolveSupporterIdentityMap(
    contributions.map((row) => row.fromAddress)
  );

  return {
    openProjectIds: openProjects.map((project) => project.id.toString()),
    contributions: contributions.map((contribution) => ({
      projectId: contribution.projectId.toString(),
      fromAddress: contribution.fromAddress,
      message: contribution.message,
      confirmedAt: contribution.confirmedAt?.toISOString() ?? null,
    })),
    identityMap,
  };
}

const _cachedContributionBundle = unstable_cache(
  (idStr: string) => loadPublicProfileContributionBundleUncached(BigInt(idStr)),
  ["public-profile-contribution-bundle"],
  { revalidate: 120 }
);

async function getPublicProfileContributionBundle(
  creatorProfileId: bigint
): Promise<PublicProfileContributionBundle> {
  return _cachedContributionBundle(creatorProfileId.toString());
}

function buildRecentPublicContributorsFromBundle(
  bundle: PublicProfileContributionBundle,
  limit: number
): PublicProfileRecentSupportersData {
  if (bundle.openProjectIds.length === 0) {
    return { recentContributors: [], totalContributorCount: 0 };
  }

  const openProjectIds = new Set(bundle.openProjectIds);
  const recentRows = bundle.contributions.filter((row) =>
    openProjectIds.has(row.projectId)
  );

  const seen = new Set<string>();
  const recentAddresses: string[] = [];
  for (const row of recentRows) {
    if (!seen.has(row.fromAddress)) {
      seen.add(row.fromAddress);
      recentAddresses.push(row.fromAddress);
      if (recentAddresses.length >= limit) break;
    }
  }

  return {
    recentContributors: recentAddresses.map((address) =>
      toSupporterIdentity(address, bundle.identityMap)
    ),
    totalContributorCount: new Set(
      recentRows.map((row) => normalizeAddress(row.fromAddress))
    ).size,
  };
}

function buildPublicSupporterWallFromBundle(
  bundle: PublicProfileContributionBundle,
  limit: number
): PublicProfileSupporterWallData {
  const seen = new Set<string>();
  const supporterAddresses: string[] = [];
  for (const row of bundle.contributions) {
    if (seen.has(row.fromAddress)) continue;
    seen.add(row.fromAddress);
    supporterAddresses.push(row.fromAddress);
    if (supporterAddresses.length >= limit) break;
  }

  return {
    supporters: supporterAddresses.map((address) =>
      toSupporterIdentity(address, bundle.identityMap)
    ),
    totalSupporterCount: new Set(
      bundle.contributions.map((row) => normalizeAddress(row.fromAddress))
    ).size,
  };
}

function buildPublicContributorMetricsFromBundle(
  bundle: PublicProfileContributionBundle
): PublicProfileContributorMetrics {
  const contributionCountByAddress = new Map<string, number>();

  for (const row of bundle.contributions) {
    const addressKey = normalizeAddress(row.fromAddress);
    contributionCountByAddress.set(
      addressKey,
      (contributionCountByAddress.get(addressKey) ?? 0) + 1
    );
  }

  let repeatSupporterCount = 0;
  for (const contributionCount of contributionCountByAddress.values()) {
    if (contributionCount > 1) {
      repeatSupporterCount += 1;
    }
  }

  return {
    totalContributorCount: contributionCountByAddress.size,
    repeatSupporterCount,
  };
}

function buildPublicMicroTestimonialsFromBundle(
  bundle: PublicProfileContributionBundle
): PublicProfileMicroTestimonialsData {
  const testimonials: PublicProfileTestimonial[] = bundle.contributions
    .filter(
      (
        contribution
      ): contribution is typeof contribution & {
        message: string;
        confirmedAt: string;
      } =>
        typeof contribution.message === "string" &&
        contribution.message.trim().length > 0 &&
        typeof contribution.confirmedAt === "string"
    )
    .slice(0, 12)
    .map((contribution) => {
      const abbr = abbreviateAddress(contribution.fromAddress);
      const profile = bundle.identityMap[normalizeAddress(contribution.fromAddress)];

      return {
        address: contribution.fromAddress,
        addressAbbr: abbr,
        displayLabel: profile?.displayLabel || profile?.username || abbr,
        avatarUrl: profile?.avatarUrl ?? null,
        message: contribution.message,
        confirmedAt: contribution.confirmedAt,
      };
    });

  return { testimonials };
}

function buildPublicSupporterTrustSummaryFromBundle(
  bundle: PublicProfileContributionBundle
): PublicProfileSupporterTrustData | null {
  const contributions = [...bundle.contributions]
    .filter(
      (
        contribution
      ): contribution is typeof contribution & { confirmedAt: string } =>
        typeof contribution.confirmedAt === "string"
    )
    .map((contribution) => ({
      ...contribution,
      confirmedAt: new Date(contribution.confirmedAt),
    }))
    .sort(
      (left, right) => left.confirmedAt.getTime() - right.confirmedAt.getTime()
    );

  if (contributions.length === 0) return null;

  const dataByAddress = new Map<
    string,
    { monthSet: Set<string>; totalCount: number }
  >();
  for (const row of contributions) {
    const key = row.fromAddress;
    if (!dataByAddress.has(key)) {
      dataByAddress.set(key, { monthSet: new Set(), totalCount: 0 });
    }
    const entry = dataByAddress.get(key);
    if (!entry) continue;
    entry.monthSet.add(toMonthKey(row.confirmedAt));
    entry.totalCount += 1;
  }

  const totalSupporterCount = dataByAddress.size;

  const badgedAddresses: Array<{
    address: string;
    totalCount: number;
    consecutiveSupportMonths: number;
    badge: SupporterTrustBadge;
  }> = [];

  for (const [address, { monthSet, totalCount }] of dataByAddress.entries()) {
    const sorted = [...monthSet].sort();
    const consecutive = computeRecentStreak(sorted);
    let badge: SupporterTrustBadge | null = null;
    if (consecutive >= 3 || totalCount >= 5) {
      badge = "loyal";
    } else if (consecutive >= 2 || totalCount >= 3) {
      badge = "recurring";
    }
    if (badge) {
      badgedAddresses.push({
        address,
        totalCount,
        consecutiveSupportMonths: consecutive,
        badge,
      });
    }
  }

  if (badgedAddresses.length === 0) return null;

  badgedAddresses.sort((a, b) => {
    if (a.badge !== b.badge) return a.badge === "loyal" ? -1 : 1;
    return b.consecutiveSupportMonths - a.consecutiveSupportMonths;
  });

  const items: PublicProfileSupporterTrustItem[] = badgedAddresses
    .slice(0, 12)
    .map((entry) => ({
      ...toSupporterIdentity(entry.address, bundle.identityMap),
      totalCount: entry.totalCount,
      consecutiveSupportMonths: entry.consecutiveSupportMonths,
      badge: entry.badge,
    }));

  return {
    items,
    loyalCount: badgedAddresses.filter((entry) => entry.badge === "loyal").length,
    recurringCount: badgedAddresses.filter(
      (entry) => entry.badge === "recurring"
    ).length,
    totalSupporterCount,
  };
}

async function getRecentPublicContributorsUncached(
  creatorProfileId: bigint,
  limit: number
): Promise<PublicProfileRecentSupportersData> {
  try {
    const bundle = await getPublicProfileContributionBundle(creatorProfileId);
    return buildRecentPublicContributorsFromBundle(bundle, limit);
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return { recentContributors: [], totalContributorCount: 0 };
    }
    throw error;
  }
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
  try {
    const bundle = await getPublicProfileContributionBundle(creatorProfileId);
    return buildPublicSupporterWallFromBundle(bundle, limit);
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return { supporters: [], totalSupporterCount: 0 };
    }
    throw error;
  }
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
  try {
    const startDate = startOfWeekMonday(
      new Date(Date.now() - (windowWeeks - 1) * 7 * 24 * 60 * 60 * 1000)
    );

    const posts = await withPrismaRetry(() =>
      prisma.post.findMany({
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
      })
    );

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
          ? new Date(
              startDate.getFullYear(),
              startDate.getMonth(),
              startDate.getDate() + (weekIndex - 1) * 7
            )
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
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return null;
    }
    throw error;
  }
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

  try {
    const [recentAmountAggregate, recentSupporters] = await Promise.all([
      withPrismaRetry(() =>
        prisma.contribution.aggregate({
          where: {
            projectId,
            status: "CONFIRMED",
            confirmedAt: { gte: since30Days },
          },
          _sum: {
            amountDecimal: true,
          },
        })
      ),
      withPrismaRetry(() =>
        prisma.contribution.groupBy({
          by: ["fromAddress"],
          where: {
            projectId,
            status: "CONFIRMED",
            confirmedAt: { gte: since30Days },
          },
        })
      ),
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
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return null;
    }
    throw error;
  }
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

// ── Micro-testimonials ────────────────────────────────────────────────────────

export type PublicProfileTestimonial = {
  address: string;
  addressAbbr: string;
  displayLabel: string;
  avatarUrl: string | null;
  message: string;
  confirmedAt: string;
};

export type PublicProfileMicroTestimonialsData = {
  testimonials: PublicProfileTestimonial[];
};

async function getPublicMicroTestimonialsUncached(
  creatorProfileId: bigint
): Promise<PublicProfileMicroTestimonialsData> {
  try {
    const bundle = await getPublicProfileContributionBundle(creatorProfileId);
    return buildPublicMicroTestimonialsFromBundle(bundle);
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return { testimonials: [] };
    }
    throw error;
  }
}

const _cachedMicroTestimonials = unstable_cache(
  (idStr: string) => getPublicMicroTestimonialsUncached(BigInt(idStr)),
  ["public-profile-micro-testimonials"],
  { revalidate: 120 }
);

export async function getPublicMicroTestimonials(
  creatorProfileId: bigint
): Promise<PublicProfileMicroTestimonialsData> {
  return _cachedMicroTestimonials(creatorProfileId.toString());
}

// ── Supporter Trust Badges ────────────────────────────────────────────────────

export type SupporterTrustBadge = "loyal" | "recurring";

export type PublicProfileSupporterTrustItem = {
  address: string;
  addressAbbr: string;
  displayLabel: string;
  avatarUrl: string | null;
  username: string | null;
  totalCount: number;
  consecutiveSupportMonths: number;
  badge: SupporterTrustBadge;
};

export type PublicProfileSupporterTrustData = {
  items: PublicProfileSupporterTrustItem[];
  loyalCount: number;
  recurringCount: number;
  totalSupporterCount: number;
};

function toMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function computeRecentStreak(sortedMonths: string[]): number {
  if (sortedMonths.length === 0) return 0;
  let streak = 1;
  for (let i = sortedMonths.length - 1; i > 0; i--) {
    const curr = sortedMonths[i];
    const prev = sortedMonths[i - 1];
    const [cy, cm] = curr.split("-").map(Number);
    const expectedPrevMonth = cm === 1 ? 12 : cm - 1;
    const expectedPrevYear = cm === 1 ? cy - 1 : cy;
    const [py, pm] = prev.split("-").map(Number);
    if (py === expectedPrevYear && pm === expectedPrevMonth) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

async function getPublicSupporterTrustSummaryUncached(
  creatorProfileId: bigint
): Promise<PublicProfileSupporterTrustData | null> {
  try {
    const bundle = await getPublicProfileContributionBundle(creatorProfileId);
    return buildPublicSupporterTrustSummaryFromBundle(bundle);
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return null;
    }
    throw error;
  }
}

const _cachedSupporterTrust = unstable_cache(
  (idStr: string) => getPublicSupporterTrustSummaryUncached(BigInt(idStr)),
  ["public-profile-supporter-trust"],
  { revalidate: 120 }
);

export async function getPublicSupporterTrustSummary(
  creatorProfileId: bigint
): Promise<PublicProfileSupporterTrustData | null> {
  return _cachedSupporterTrust(creatorProfileId.toString());
}

// ── Revenue Proof ─────────────────────────────────────────────────────────────

export type PublicProfileRevenueProofCurrencyTotal = {
  currency: string;
  total: number;
  maxMonthlyTotal: number;
};

export type PublicProfileRevenueProofData = {
  currencyTotals: PublicProfileRevenueProofCurrencyTotal[];
  activeRevenueMonths: number;
  mostRecentOccurredAt: string | null;
};

async function getPublicRevenueProofUncached(
  creatorProfileId: bigint
): Promise<PublicProfileRevenueProofData | null> {
  try {
    const records = await withPrismaRetry(() =>
      prisma.revenueRecord.findMany({
        where: { creatorProfileId },
        select: {
          amountDecimal: true,
          currency: true,
          occurredAt: true,
        },
        orderBy: { occurredAt: "desc" },
      })
    );

    if (records.length === 0) return null;

    const byCurrency = new Map<string, { total: number; monthMap: Map<string, number> }>();
    for (const r of records) {
      const n = Number(r.amountDecimal);
      if (!Number.isFinite(n)) continue;
      const c = r.currency;
      const month = r.occurredAt.toISOString().slice(0, 7);
      if (!byCurrency.has(c)) {
        byCurrency.set(c, { total: 0, monthMap: new Map() });
      }
      const entry = byCurrency.get(c);
      if (!entry) continue;
      entry.total += n;
      entry.monthMap.set(month, (entry.monthMap.get(month) ?? 0) + n);
    }

    const currencyTotals: PublicProfileRevenueProofCurrencyTotal[] = [
      ...byCurrency.entries(),
    ].map(([currency, { total, monthMap }]) => ({
      currency,
      total,
      maxMonthlyTotal: Math.max(...monthMap.values()),
    }));

    const allMonths = new Set<string>();
    for (const r of records) {
      allMonths.add(r.occurredAt.toISOString().slice(0, 7));
    }

    return {
      currencyTotals,
      activeRevenueMonths: allMonths.size,
      mostRecentOccurredAt: records[0]?.occurredAt.toISOString() ?? null,
    };
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return null;
    }
    throw error;
  }
}

const _cachedRevenueProof = unstable_cache(
  (idStr: string) => getPublicRevenueProofUncached(BigInt(idStr)),
  ["public-profile-revenue-proof"],
  { revalidate: 120 }
);

export async function getPublicRevenueProof(
  creatorProfileId: bigint
): Promise<PublicProfileRevenueProofData | null> {
  return _cachedRevenueProof(creatorProfileId.toString());
}

async function getPublicProfilePageEnhancementsUncached(
  creatorProfileId: bigint
): Promise<PublicProfilePageEnhancements> {
  let contributionBundle: PublicProfileContributionBundle | null = null;

  try {
    contributionBundle = await getPublicProfileContributionBundle(creatorProfileId);
  } catch (error) {
    if (!isPrismaUnavailableError(error)) {
      throw error;
    }
  }

  const recentSupporters = contributionBundle
    ? buildRecentPublicContributorsFromBundle(contributionBundle, 4)
    : { recentContributors: [], totalContributorCount: 0 };
  const supporterWall = contributionBundle
    ? buildPublicSupporterWallFromBundle(contributionBundle, 10)
    : { supporters: [], totalSupporterCount: 0 };
  const contributorMetrics = contributionBundle
    ? buildPublicContributorMetricsFromBundle(contributionBundle)
    : { totalContributorCount: 0, repeatSupporterCount: 0 };
  const microTestimonials = contributionBundle
    ? buildPublicMicroTestimonialsFromBundle(contributionBundle)
    : { testimonials: [] };
  const supporterTrust = contributionBundle
    ? buildPublicSupporterTrustSummaryFromBundle(contributionBundle)
    : null;

  const [activityHeatmap, revenueProof, teamMembers] = await Promise.all([
    getPublicActivityHeatmap(creatorProfileId),
    getPublicRevenueProof(creatorProfileId),
    getPublicTeamMembers(creatorProfileId),
  ]);

  return {
    recentSupporters,
    supporterWall,
    contributorMetrics,
    activityHeatmap,
    microTestimonials,
    supporterTrust,
    revenueProof,
    teamMembers,
  };
}

const _cachedPageEnhancements = unstable_cache(
  (idStr: string) => getPublicProfilePageEnhancementsUncached(BigInt(idStr)),
  ["public-profile-page-enhancements"],
  { revalidate: 120 }
);

export async function getPublicProfilePageEnhancements(
  creatorProfileId: bigint
): Promise<PublicProfilePageEnhancements> {
  return _cachedPageEnhancements(creatorProfileId.toString());
}

// -------------------------
// Team Members (ProjectMember)
// -------------------------

export type PublicProfileTeamMember = {
  id: string;
  role: string;
  displayName: string | null;
  walletAddress: string | null;
  walletAddressAbbr: string | null;
  sharePercent: number | null;
  note: string | null;
};

export type PublicProfileTeamData = {
  members: PublicProfileTeamMember[];
  totalCount: number;
};

async function getPublicTeamMembersUncached(
  creatorProfileId: bigint
): Promise<PublicProfileTeamData | null> {
  try {
    const rows = await withPrismaRetry(() =>
      prisma.projectMember.findMany({
        where: {
          project: { creatorProfileId },
          status: "ACTIVE",
        },
        orderBy: [{ role: "asc" }, { addedAt: "asc" }],
        take: 20,
        select: {
          id: true,
          role: true,
          displayName: true,
          walletAddress: true,
          sharePercent: true,
          note: true,
        },
      })
    );

    if (rows.length === 0) return null;

    return {
      members: rows.map((r) => ({
        id: r.id,
        role: r.role,
        displayName: r.displayName,
        walletAddress: r.walletAddress,
        walletAddressAbbr: r.walletAddress
          ? `${r.walletAddress.slice(0, 6)}…${r.walletAddress.slice(-4)}`
          : null,
        sharePercent: r.sharePercent != null ? Number(r.sharePercent) : null,
        note: r.note,
      })),
      totalCount: rows.length,
    };
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return null;
    }
    throw error;
  }
}

const _cachedTeamMembers = unstable_cache(
  async (creatorProfileIdStr: string) => {
    return getPublicTeamMembersUncached(BigInt(creatorProfileIdStr));
  },
  ["public-profile-team-members"],
  { revalidate: 120 }
);

export async function getPublicTeamMembers(
  creatorProfileId: bigint
): Promise<PublicProfileTeamData | null> {
  return _cachedTeamMembers(creatorProfileId.toString());
}
