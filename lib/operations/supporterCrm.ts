import { prisma } from "@/lib/prisma";
import type { SupporterCrmData, SupporterCrmItem } from "@/lib/operations/supporterCrmTypes";

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

export async function getSupporterCrm(args: {
  creatorProfileId: bigint;
  limit?: number;
}): Promise<SupporterCrmData> {
  const now = new Date();
  const limit = args.limit ?? 20;

  // Group by fromAddress + currency to get amount sum, count, first/last dates
  const [rows, dateRows] = await Promise.all([
    prisma.contribution.groupBy({
      by: ["fromAddress", "currency"],
      where: {
        project: { creatorProfileId: args.creatorProfileId },
        status: "CONFIRMED",
      },
      _count: { _all: true },
      _sum: { amountDecimal: true },
      _min: { confirmedAt: true },
      _max: { confirmedAt: true },
    }),
    prisma.contribution.findMany({
      where: {
        project: { creatorProfileId: args.creatorProfileId },
        status: "CONFIRMED",
      },
      select: { fromAddress: true, confirmedAt: true },
      orderBy: { confirmedAt: "asc" },
    }),
  ]);

  // Compute consecutive months per address
  const monthsByAddress = new Map<string, Set<string>>();
  for (const row of dateRows) {
    if (!row.confirmedAt) continue;
    const key = row.fromAddress;
    if (!monthsByAddress.has(key)) monthsByAddress.set(key, new Set());
    monthsByAddress.get(key)!.add(toMonthKey(row.confirmedAt));
  }

  const consecutiveByAddress = new Map<string, number>();
  for (const [address, monthSet] of monthsByAddress.entries()) {
    const sorted = [...monthSet].sort();
    consecutiveByAddress.set(address, computeRecentStreak(sorted));
  }

  // Aggregate by fromAddress
  const byAddress = new Map<
    string,
    {
      totalCount: number;
      firstSupportAt: Date | null;
      lastSupportAt: Date | null;
      currencies: Map<string, { amount: string; count: number }>;
    }
  >();

  for (const row of rows) {
    const existing = byAddress.get(row.fromAddress);
    const rowFirst = row._min.confirmedAt;
    const rowLast = row._max.confirmedAt;

    if (existing) {
      existing.totalCount += row._count._all;
      if (rowFirst && (!existing.firstSupportAt || rowFirst < existing.firstSupportAt)) {
        existing.firstSupportAt = rowFirst;
      }
      if (rowLast && (!existing.lastSupportAt || rowLast > existing.lastSupportAt)) {
        existing.lastSupportAt = rowLast;
      }
      existing.currencies.set(row.currency, {
        amount: row._sum?.amountDecimal?.toString() ?? "0",
        count: row._count._all ?? 0,
      });
    } else {
      const currencies = new Map<string, { amount: string; count: number }>();
      currencies.set(row.currency, {
        amount: row._sum?.amountDecimal?.toString() ?? "0",
        count: row._count._all ?? 0,
      });
      byAddress.set(row.fromAddress, {
        totalCount: row._count._all ?? 0,
        firstSupportAt: rowFirst ?? null,
        lastSupportAt: rowLast ?? null,
        currencies,
      });
    }
  }

  // Sort by lastSupportAt desc (most recent first), then by totalCount desc
  const items: SupporterCrmItem[] = [...byAddress.entries()]
    .sort(([, a], [, b]) => {
      const aTime = a.lastSupportAt?.getTime() ?? 0;
      const bTime = b.lastSupportAt?.getTime() ?? 0;
      if (bTime !== aTime) return bTime - aTime;
      return b.totalCount - a.totalCount;
    })
    .slice(0, limit)
    .map(([fromAddress, data]) => {
      const consecutive = consecutiveByAddress.get(fromAddress) ?? 0;
      const trustScore = data.totalCount + consecutive * 2;
      return {
        fromAddress,
        totalCount: data.totalCount,
        firstSupportAt: data.firstSupportAt?.toISOString() ?? null,
        lastSupportAt: data.lastSupportAt?.toISOString() ?? null,
        currencies: [...data.currencies.entries()].map(([currency, info]) => ({
          currency,
          amount: info.amount,
          count: info.count,
        })),
        consecutiveSupportMonths: consecutive,
        trustScore,
      };
    });

  return {
    creatorProfileId: args.creatorProfileId.toString(),
    items,
    totalSupporterCount: byAddress.size,
    generatedAt: now.toISOString(),
  };
}
