import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";
import { getProjectSummaryView } from "@/lib/projectSummary";
import {
  buildSupportProjectViewFromSummary,
  type SupportProjectView,
} from "@/lib/supportProfileView";
import type { SummaryViewData } from "@/lib/mypage/accountPageTypes";

export const PUBLIC_CLOSED_PROJECT_STATUSES = new Set<string>([
  "ARCHIVED",
  "BRIDGED",
  "COMPLETED",
  "GOAL_ACHIEVED",
  "READY_TO_BRIDGE",
]);

export function isRecruitingProjectSummary(summary: SummaryViewData): boolean {
  if (PUBLIC_CLOSED_PROJECT_STATUSES.has(summary.project.status)) {
    return false;
  }

  return summary.goal?.achievedAt == null;
}

export async function loadRecruitingProjectViews(args: {
  creatorProfileId: bigint;
  ownerAddress?: string | null;
}): Promise<SupportProjectView[]> {
  const projectWhereOr: Array<
    { creatorProfileId: bigint } | { ownerAddress: string }
  > = [{ creatorProfileId: args.creatorProfileId }];

  if (args.ownerAddress) {
    projectWhereOr.push({ ownerAddress: args.ownerAddress.toLowerCase() });
  }

  const projectRows = await withPrismaRetry(() =>
    prisma.project.findMany({
      where: {
        OR: projectWhereOr,
        status: {
          notIn: Array.from(PUBLIC_CLOSED_PROJECT_STATUSES),
        },
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    })
  );

  const projectSummaries = await Promise.all(
    projectRows.map((row) => getProjectSummaryView(row.id).catch(() => null))
  );
  const seen = new Set<string>();

  return projectSummaries
    .filter((summary): summary is SummaryViewData => summary !== null)
    .filter(isRecruitingProjectSummary)
    .map((summary) => buildSupportProjectViewFromSummary(summary))
    .filter((project): project is SupportProjectView => project !== null)
    .filter((project) => {
      if (seen.has(project.projectId)) return false;
      seen.add(project.projectId);
      return true;
    });
}
