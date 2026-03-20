import { isRecord } from "@/lib/api/guards";

export type PublicSummaryLite = {
  goal: {
    targetAmount: number;
    achievedAt: string | null;
    deadline: string | null;
  } | null;
  progress: {
    confirmedAmount: number;
    targetAmount: number | null;
    progressPct: number;
  } | null;
};

export function pickPublicSummaryLite(summary: unknown): PublicSummaryLite {
  if (!isRecord(summary)) return { goal: null, progress: null };

  const goalRaw = summary.goal;
  const progressRaw = summary.progress;

  const goal =
    isRecord(goalRaw) &&
    (typeof goalRaw.targetAmount === "number" ||
      typeof goalRaw.targetAmountJpyc === "number") &&
    (typeof goalRaw.achievedAt === "string" || goalRaw.achievedAt === null) &&
    (typeof goalRaw.deadline === "string" || goalRaw.deadline === null)
      ? {
          targetAmount:
            typeof goalRaw.targetAmount === "number"
              ? goalRaw.targetAmount
              : (goalRaw.targetAmountJpyc as number),
          achievedAt: goalRaw.achievedAt as string | null,
          deadline: goalRaw.deadline as string | null,
        }
      : null;

  const progress =
    isRecord(progressRaw) &&
    (typeof progressRaw.confirmedAmount === "number" ||
      typeof progressRaw.confirmedTotal === "number" ||
      typeof progressRaw.confirmedJpyc === "number") &&
    (typeof progressRaw.targetAmount === "number" ||
      progressRaw.targetAmount === null ||
      typeof progressRaw.targetJpyc === "number" ||
      progressRaw.targetJpyc === null) &&
    typeof progressRaw.progressPct === "number"
      ? {
          confirmedAmount:
            typeof progressRaw.confirmedAmount === "number"
              ? progressRaw.confirmedAmount
              : typeof progressRaw.confirmedTotal === "number"
                ? progressRaw.confirmedTotal
                : (progressRaw.confirmedJpyc as number),
          targetAmount:
            typeof progressRaw.targetAmount === "number" ||
            progressRaw.targetAmount === null
              ? (progressRaw.targetAmount as number | null)
              : (progressRaw.targetJpyc as number | null),
          progressPct: progressRaw.progressPct,
        }
      : null;

  return { goal, progress };
}
