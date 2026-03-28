import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { isRecord } from "@/lib/api/guards";
import { isPrismaUnavailableError, withPrismaRetry } from "@/lib/prismaRetry";

export type SupporterResultReportSummary = {
  summary: string;
  approvedAt: string | null;
};

const globalForSupporterResultReportSummary = globalThis as unknown as {
  supporterResultReportSummaryStaleByCreatorId?: Map<
    string,
    SupporterResultReportSummary
  >;
};

function getSupporterResultReportSummaryStaleMap(): Map<
  string,
  SupporterResultReportSummary
> {
  if (!globalForSupporterResultReportSummary.supporterResultReportSummaryStaleByCreatorId) {
    globalForSupporterResultReportSummary.supporterResultReportSummaryStaleByCreatorId =
      new Map();
  }

  return globalForSupporterResultReportSummary.supporterResultReportSummaryStaleByCreatorId;
}

function buildGenericSupporterResultReportSummary(): SupporterResultReportSummary {
  return {
    summary:
      "最新の支援者レポートを一時的に読み込めないため、最新の投稿や進捗を優先して表示しています。",
    approvedAt: null,
  };
}

async function getLatestSupporterResultReportSummaryUncached(
  creatorProfileId: bigint
): Promise<SupporterResultReportSummary | null> {
  const staleMap = getSupporterResultReportSummaryStaleMap();
  const staleKey = creatorProfileId.toString();

  try {
    const task = await withPrismaRetry(() =>
      prisma.agentTask.findFirst({
        where: {
          creatorProfileId,
          taskType: "SUPPORTER_RESULT_REPORT",
          approvalState: "APPROVED",
        },
        orderBy: { approvedAt: "desc" },
        select: { outputJson: true, approvedAt: true },
      })
    );

    if (!task || !task.approvedAt) return null;

    const output = task.outputJson;
    if (!isRecord(output)) return null;

    const summary = typeof output.summary === "string" ? output.summary : null;
    if (!summary) return null;

    const result = {
      summary,
      approvedAt: task.approvedAt.toISOString(),
    };

    staleMap.set(staleKey, result);
    return result;
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return staleMap.get(staleKey) ?? buildGenericSupporterResultReportSummary();
    }

    throw error;
  }
}

const _getLatestSupporterResultReportSummaryCached = unstable_cache(
  (idStr: string) => getLatestSupporterResultReportSummaryUncached(BigInt(idStr)),
  ["supporter-result-report-summary"],
  { revalidate: 300 }
);

export async function getLatestSupporterResultReportSummary(
  creatorProfileId: bigint
): Promise<SupporterResultReportSummary | null> {
  return _getLatestSupporterResultReportSummaryCached(creatorProfileId.toString());
}
