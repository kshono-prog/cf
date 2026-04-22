/* lib/rewardTierService.ts
 *
 * RewardTier の confirmed 支援集計と readiness 再計算を DB とやりとりしながら行う。
 * - API route から共通利用する I/O レイヤ
 * - readiness 判定自体は lib/rewardTierProgress.ts (純関数) に委譲
 */

import type { Prisma, PrismaClient, RewardTier } from "@prisma/client";
import {
  toRewardTierProgressDto,
  type RewardTierProgressDto,
  type RewardTierProductionStatus,
} from "@/lib/rewardTierProgress";

type PrismaDb = PrismaClient | Prisma.TransactionClient;

/**
 * 指定 RewardTier の confirmed 支援件数 / 合計金額を算出する。
 * ルール:
 *   - 対象 PaymentIntent は rewardTierId 一致かつ contributionId が紐づくもの
 *   - 紐づく Contribution.status === "CONFIRMED" のみ計上
 *   - 金額は PaymentIntent.expectedAmountJpyc を足し合わせる
 *     (実受領金額の厳密一致は contribution 側で既に検証済のため、申告ベースで集計)
 */
export async function aggregateRewardTierSupport(args: {
  db: PrismaDb;
  rewardTierId: bigint;
}): Promise<{
  confirmedSupportCount: number;
  confirmedSupportAmountJpyc: number;
}> {
  const { db, rewardTierId } = args;

  const confirmedIntents = await db.paymentIntent.findMany({
    where: {
      rewardTierId,
      contributionId: { not: null },
      contribution: { status: "CONFIRMED" },
    },
    select: {
      expectedAmountJpyc: true,
      quantity: true,
    },
  });

  let confirmedSupportCount = 0;
  let confirmedSupportAmountJpyc = 0;
  for (const intent of confirmedIntents) {
    const qty =
      typeof intent.quantity === "number" && intent.quantity > 0
        ? intent.quantity
        : 1;
    confirmedSupportCount += qty;
    confirmedSupportAmountJpyc += Math.max(
      0,
      Math.floor(intent.expectedAmountJpyc ?? 0)
    );
  }

  return { confirmedSupportCount, confirmedSupportAmountJpyc };
}

/**
 * Tier の現在値と集計値から DTO を作る。
 */
export function buildRewardTierProgressDto(args: {
  tier: RewardTier;
  confirmedSupportCount: number;
  confirmedSupportAmountJpyc: number;
}): RewardTierProgressDto {
  return toRewardTierProgressDto({
    tier: {
      startThresholdType: args.tier.startThresholdType,
      startThresholdValue: args.tier.startThresholdValue,
      productionStatus: args.tier.productionStatus,
    },
    confirmedSupportCount: args.confirmedSupportCount,
    confirmedSupportAmountJpyc: args.confirmedSupportAmountJpyc,
  });
}

/**
 * readiness を再計算し、DB 側の RewardTier.productionStatus を必要に応じて更新する。
 * - NOT_STARTED かつ閾値到達 → READY_TO_START に更新
 * - READY_TO_START / IN_PROGRESS / COMPLETED / CANCELED は維持 (ここでは自動遷移しない)
 */
export async function recalcAndPersistRewardTierProduction(args: {
  db: PrismaDb;
  tierId: bigint;
}): Promise<{
  tier: RewardTier;
  progress: RewardTierProgressDto;
  didUpdate: boolean;
  nextStatus: RewardTierProductionStatus;
}> {
  const { db, tierId } = args;

  const tier = await db.rewardTier.findUnique({ where: { id: tierId } });
  if (!tier) {
    throw new Error("REWARD_TIER_NOT_FOUND");
  }

  const { confirmedSupportCount, confirmedSupportAmountJpyc } =
    await aggregateRewardTierSupport({ db, rewardTierId: tierId });

  const progress = buildRewardTierProgressDto({
    tier,
    confirmedSupportCount,
    confirmedSupportAmountJpyc,
  });

  const currentStatus = tier.productionStatus;
  const nextStatus = progress.productionStatus;

  let updatedTier = tier;
  let didUpdate = false;
  if (
    currentStatus === "NOT_STARTED" &&
    nextStatus === "READY_TO_START"
  ) {
    updatedTier = await db.rewardTier.update({
      where: { id: tierId },
      data: {
        productionStatus: "READY_TO_START",
        updatedAt: new Date(),
      },
    });
    didUpdate = true;
  }

  return {
    tier: updatedTier,
    progress: { ...progress, productionStatus: nextStatus },
    didUpdate,
    nextStatus,
  };
}

export function serializeRewardTierWithProgress(args: {
  tier: RewardTier;
  progress: RewardTierProgressDto;
}): Record<string, unknown> {
  const { tier, progress } = args;
  return {
    id: tier.id.toString(),
    projectId: tier.projectId.toString(),
    title: tier.title,
    description: tier.description,
    priceJpyc: tier.priceJpyc,
    currency: tier.currency,
    quantityLimit: tier.quantityLimit,
    soldCount: tier.soldCount,
    isPublished: tier.isPublished,
    sortOrder: tier.sortOrder,
    deliveryType: tier.deliveryType,
    imageUrl: tier.imageUrl,
    startThresholdType: tier.startThresholdType,
    startThresholdValue: tier.startThresholdValue,
    productionStatus: progress.productionStatus,
    productionStartedAt: tier.productionStartedAt
      ? tier.productionStartedAt.toISOString()
      : null,
    productionCompletedAt: tier.productionCompletedAt
      ? tier.productionCompletedAt.toISOString()
      : null,
    createdAt: tier.createdAt.toISOString(),
    updatedAt: tier.updatedAt.toISOString(),
    confirmedSupportCount: progress.confirmedSupportCount,
    confirmedSupportAmountJpyc: progress.confirmedSupportAmountJpyc,
    progressToStartPct: progress.progressToStartPct,
    remainingCountToStart: progress.remainingCountToStart,
    remainingAmountToStart: progress.remainingAmountToStart,
    thresholdLabel: progress.thresholdLabel,
    progressLabel: progress.progressLabel,
    isThresholdReached: progress.isThresholdReached,
    canStartProduction: progress.canStartProduction,
    canCompleteProduction: progress.canCompleteProduction,
    hasThreshold: progress.hasThreshold,
  };
}
