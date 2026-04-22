/* lib/rewardTierProgress.ts
 *
 * RewardTier の開始条件進捗・production status 遷移を扱う純関数。
 * UI / API の双方で利用するため DB アクセスは行わない。
 */

export type RewardTierThresholdType = "COUNT" | "AMOUNT";

export type RewardTierProductionStatus =
  | "NOT_STARTED"
  | "READY_TO_START"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELED";

export function isRewardTierThresholdType(
  value: unknown
): value is RewardTierThresholdType {
  return value === "COUNT" || value === "AMOUNT";
}

export function isRewardTierProductionStatus(
  value: unknown
): value is RewardTierProductionStatus {
  return (
    value === "NOT_STARTED" ||
    value === "READY_TO_START" ||
    value === "IN_PROGRESS" ||
    value === "COMPLETED" ||
    value === "CANCELED"
  );
}

export type RewardTierThresholdInput = {
  startThresholdType: string | null | undefined;
  startThresholdValue: number | null | undefined;
};

export type RewardTierFundingProgress = {
  confirmedSupportCount: number;
  confirmedSupportAmountJpyc: number;
  hasThreshold: boolean;
  thresholdType: RewardTierThresholdType | null;
  thresholdValue: number | null;
  progressToStartPct: number;
  remainingCountToStart: number | null;
  remainingAmountToStart: number | null;
  isThresholdReached: boolean;
  thresholdLabel: string | null;
  progressLabel: string | null;
};

function formatJpyc(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return `${safe.toLocaleString("en-US")} JPYC`;
}

export function calculateRewardTierFundingProgress(args: {
  tier: RewardTierThresholdInput;
  confirmedSupportCount: number;
  confirmedSupportAmountJpyc: number;
}): RewardTierFundingProgress {
  const confirmedSupportCount = Math.max(
    0,
    Math.floor(args.confirmedSupportCount ?? 0)
  );
  const confirmedSupportAmountJpyc = Math.max(
    0,
    Math.floor(args.confirmedSupportAmountJpyc ?? 0)
  );

  const thresholdType = isRewardTierThresholdType(args.tier.startThresholdType)
    ? args.tier.startThresholdType
    : null;
  const rawValue = args.tier.startThresholdValue;
  const thresholdValue =
    typeof rawValue === "number" && Number.isFinite(rawValue) && rawValue > 0
      ? Math.floor(rawValue)
      : null;

  const hasThreshold = thresholdType !== null && thresholdValue !== null;

  if (!hasThreshold) {
    return {
      confirmedSupportCount,
      confirmedSupportAmountJpyc,
      hasThreshold: false,
      thresholdType: null,
      thresholdValue: null,
      progressToStartPct: 0,
      remainingCountToStart: null,
      remainingAmountToStart: null,
      isThresholdReached: false,
      thresholdLabel: null,
      progressLabel: null,
    };
  }

  if (thresholdType === "COUNT") {
    const remaining = Math.max(0, thresholdValue - confirmedSupportCount);
    const pct = Math.min(
      100,
      Math.max(
        0,
        Math.floor((confirmedSupportCount / thresholdValue) * 100)
      )
    );
    const reached = confirmedSupportCount >= thresholdValue;
    return {
      confirmedSupportCount,
      confirmedSupportAmountJpyc,
      hasThreshold: true,
      thresholdType,
      thresholdValue,
      progressToStartPct: pct,
      remainingCountToStart: remaining,
      remainingAmountToStart: null,
      isThresholdReached: reached,
      thresholdLabel: `${thresholdValue}件で制作開始`,
      progressLabel: reached
        ? "開始条件達成"
        : `あと${remaining}件で制作開始可能`,
    };
  }

  // AMOUNT
  const remainingAmount = Math.max(
    0,
    thresholdValue - confirmedSupportAmountJpyc
  );
  const pct = Math.min(
    100,
    Math.max(
      0,
      Math.floor((confirmedSupportAmountJpyc / thresholdValue) * 100)
    )
  );
  const reached = confirmedSupportAmountJpyc >= thresholdValue;
  return {
    confirmedSupportCount,
    confirmedSupportAmountJpyc,
    hasThreshold: true,
    thresholdType,
    thresholdValue,
    progressToStartPct: pct,
    remainingCountToStart: null,
    remainingAmountToStart: remainingAmount,
    isThresholdReached: reached,
    thresholdLabel: `${formatJpyc(thresholdValue)}で制作開始`,
    progressLabel: reached
      ? "開始条件達成"
      : `あと${formatJpyc(remainingAmount)}で制作開始可能`,
  };
}

/**
 * 条件達成時の自動遷移ルール:
 *   NOT_STARTED かつ isThresholdReached → READY_TO_START
 *   それ以外は現状維持（READY_TO_START 以降は自動で進めない）
 */
export function resolveRewardTierProductionStatus(args: {
  currentProductionStatus: string | null | undefined;
  isThresholdReached: boolean;
}): RewardTierProductionStatus {
  const current = isRewardTierProductionStatus(args.currentProductionStatus)
    ? args.currentProductionStatus
    : "NOT_STARTED";

  if (current === "NOT_STARTED" && args.isThresholdReached) {
    return "READY_TO_START";
  }
  return current;
}

export type RewardTierProgressDto = RewardTierFundingProgress & {
  productionStatus: RewardTierProductionStatus;
  canStartProduction: boolean;
  canCompleteProduction: boolean;
};

export function toRewardTierProgressDto(args: {
  tier: RewardTierThresholdInput & {
    productionStatus?: string | null;
  };
  confirmedSupportCount: number;
  confirmedSupportAmountJpyc: number;
}): RewardTierProgressDto {
  const progress = calculateRewardTierFundingProgress({
    tier: args.tier,
    confirmedSupportCount: args.confirmedSupportCount,
    confirmedSupportAmountJpyc: args.confirmedSupportAmountJpyc,
  });

  const status = resolveRewardTierProductionStatus({
    currentProductionStatus: args.tier.productionStatus,
    isThresholdReached: progress.isThresholdReached,
  });

  return {
    ...progress,
    productionStatus: status,
    canStartProduction: status === "READY_TO_START",
    canCompleteProduction: status === "IN_PROGRESS",
  };
}
