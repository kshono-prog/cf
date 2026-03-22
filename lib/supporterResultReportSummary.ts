import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { isRecord } from "@/lib/api/guards";

export type SupporterResultReportSummary = {
  summary: string;
  approvedAt: string;
};

async function getLatestSupporterResultReportSummaryUncached(
  creatorProfileId: bigint
): Promise<SupporterResultReportSummary | null> {
  const task = await prisma.agentTask.findFirst({
    where: {
      creatorProfileId,
      taskType: "SUPPORTER_RESULT_REPORT",
      approvalState: "APPROVED",
    },
    orderBy: { approvedAt: "desc" },
    select: { outputJson: true, approvedAt: true },
  });

  if (!task || !task.approvedAt) return null;

  const output = task.outputJson;
  if (!isRecord(output)) return null;

  const summary = typeof output.summary === "string" ? output.summary : null;
  if (!summary) return null;

  return {
    summary,
    approvedAt: task.approvedAt.toISOString(),
  };
}

const _getLatestSupporterResultReportSummaryCached = unstable_cache(
  (idStr: string) => getLatestSupporterResultReportSummaryUncached(BigInt(idStr)),
  ["supporter-result-report-summary"],
  { revalidate: 120 }
);

export async function getLatestSupporterResultReportSummary(
  creatorProfileId: bigint
): Promise<SupporterResultReportSummary | null> {
  return _getLatestSupporterResultReportSummaryCached(creatorProfileId.toString());
}
