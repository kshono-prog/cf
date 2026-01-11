export type PublicSummaryLite = {
  goal: {
    targetAmountJpyc: number;
    achievedAt: string | null;
    deadline: string | null;
  } | null;
  progress: {
    confirmedJpyc: number;
    targetJpyc: number | null;
    progressPct: number;
  } | null;
};

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function pickPublicSummaryLite(summary: unknown): PublicSummaryLite {
  if (!isRecord(summary)) return { goal: null, progress: null };

  const goalRaw = summary.goal;
  const progressRaw = summary.progress;

  const goal =
    isRecord(goalRaw) &&
    typeof goalRaw.targetAmountJpyc === "number" &&
    (typeof goalRaw.achievedAt === "string" || goalRaw.achievedAt === null) &&
    (typeof goalRaw.deadline === "string" || goalRaw.deadline === null)
      ? {
          targetAmountJpyc: goalRaw.targetAmountJpyc,
          achievedAt: goalRaw.achievedAt as string | null,
          deadline: goalRaw.deadline as string | null,
        }
      : null;

  const progress =
    isRecord(progressRaw) &&
    typeof progressRaw.confirmedJpyc === "number" &&
    (typeof progressRaw.targetJpyc === "number" ||
      progressRaw.targetJpyc === null) &&
    typeof progressRaw.progressPct === "number"
      ? {
          confirmedJpyc: progressRaw.confirmedJpyc,
          targetJpyc: progressRaw.targetJpyc as number | null,
          progressPct: progressRaw.progressPct,
        }
      : null;

  return { goal, progress };
}
