import { prisma } from "@/lib/prisma";
import type { SupporterOverviewData, SupporterTopItem } from "@/lib/operations/supporterOverviewTypes";

export async function getSupporterOverview(args: {
  creatorProfileId: bigint;
}): Promise<SupporterOverviewData> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const since30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [allTimeByCurrency, thisMonth, recent] = await Promise.all([
    // All-time: group by fromAddress + currency
    prisma.contribution.groupBy({
      by: ["fromAddress", "currency"],
      where: {
        project: { creatorProfileId: args.creatorProfileId },
        status: "CONFIRMED",
      },
      _count: { _all: true },
    }),
    // This month: unique fromAddresses
    prisma.contribution.groupBy({
      by: ["fromAddress"],
      where: {
        project: { creatorProfileId: args.creatorProfileId },
        status: "CONFIRMED",
        confirmedAt: { gte: startOfMonth },
      },
    }),
    // Last 30 days: unique fromAddresses
    prisma.contribution.groupBy({
      by: ["fromAddress"],
      where: {
        project: { creatorProfileId: args.creatorProfileId },
        status: "CONFIRMED",
        confirmedAt: { gte: since30Days },
      },
    }),
  ]);

  // Aggregate by fromAddress across all currencies
  const byAddress = new Map<string, { count: number; currencies: Set<string> }>();
  for (const row of allTimeByCurrency) {
    const existing = byAddress.get(row.fromAddress);
    if (existing) {
      existing.count += row._count._all;
      existing.currencies.add(row.currency);
    } else {
      byAddress.set(row.fromAddress, {
        count: row._count._all,
        currencies: new Set([row.currency]),
      });
    }
  }

  const totalSupporterCount = byAddress.size;
  const newThisMonthCount = thisMonth.length;
  const recentSupporterCount = recent.length;

  // Top supporters by contribution count (max 5)
  const topSupporters: SupporterTopItem[] = [...byAddress.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([fromAddress, data]) => ({
      fromAddress,
      contributionCount: data.count,
      currencies: [...data.currencies],
    }));

  return {
    creatorProfileId: args.creatorProfileId.toString(),
    totalSupporterCount,
    newThisMonthCount,
    recentSupporterCount,
    topSupporters,
    generatedAt: now.toISOString(),
  };
}
