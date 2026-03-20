type GoalAmountLike = {
  targetAmount?: unknown;
  targetAmountJpyc?: unknown;
} | null | undefined;

type ProgressAmountLike = {
  confirmedAmount?: unknown;
  confirmedTotal?: unknown;
  confirmedJpyc?: unknown;
  targetAmount?: unknown;
  targetJpyc?: unknown;
} | null | undefined;

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function resolveGoalTargetAmount(goal: GoalAmountLike): number | null {
  return (
    toFiniteNumber(goal?.targetAmount) ??
    toFiniteNumber(goal?.targetAmountJpyc) ??
    null
  );
}

export function resolveConfirmedAmount(
  progress: ProgressAmountLike
): number {
  return (
    toFiniteNumber(progress?.confirmedAmount) ??
    toFiniteNumber(progress?.confirmedTotal) ??
    toFiniteNumber(progress?.confirmedJpyc) ??
    0
  );
}

export function resolveProgressTargetAmount(
  progress: ProgressAmountLike
): number | null {
  return (
    toFiniteNumber(progress?.targetAmount) ??
    toFiniteNumber(progress?.targetJpyc) ??
    null
  );
}
