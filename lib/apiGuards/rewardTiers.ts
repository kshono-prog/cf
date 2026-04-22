/* lib/apiGuards/rewardTiers.ts
 *
 * 公開ページ / 管理画面で受け取る reward-tier API レスポンスの shape guard。
 */

import type { RewardTierProductionStatus } from "@/lib/rewardTierProgress";

export type RewardTierThresholdTypeView = "COUNT" | "AMOUNT" | null;

export type RewardTierView = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  priceJpyc: number;
  currency: string;
  quantityLimit: number | null;
  soldCount: number;
  isPublished: boolean;
  sortOrder: number;
  deliveryType: string | null;
  imageUrl: string | null;
  startThresholdType: RewardTierThresholdTypeView;
  startThresholdValue: number | null;
  productionStatus: RewardTierProductionStatus;
  productionStartedAt: string | null;
  productionCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  confirmedSupportCount: number;
  confirmedSupportAmountJpyc: number;
  progressToStartPct: number;
  remainingCountToStart: number | null;
  remainingAmountToStart: number | null;
  thresholdLabel: string | null;
  progressLabel: string | null;
  isThresholdReached: boolean;
  canStartProduction: boolean;
  canCompleteProduction: boolean;
  hasThreshold: boolean;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asBoolean(v: unknown, fallback: boolean = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function asNullableNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function asNullableString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asThresholdType(v: unknown): RewardTierThresholdTypeView {
  if (v === "COUNT" || v === "AMOUNT") return v;
  return null;
}

function asProductionStatus(v: unknown): RewardTierProductionStatus {
  if (
    v === "NOT_STARTED" ||
    v === "READY_TO_START" ||
    v === "IN_PROGRESS" ||
    v === "COMPLETED" ||
    v === "CANCELED"
  ) {
    return v;
  }
  return "NOT_STARTED";
}

export function parseRewardTierView(input: unknown): RewardTierView | null {
  if (!isRecord(input)) return null;
  const id = asString(input.id);
  const projectId = asString(input.projectId);
  const title = asString(input.title);
  const createdAt = asString(input.createdAt);
  const updatedAt = asString(input.updatedAt);
  if (!id || !projectId || !title || !createdAt || !updatedAt) return null;
  const priceJpyc = asNumber(input.priceJpyc, 0);
  const currency = asString(input.currency) ?? "JPYC";
  return {
    id,
    projectId,
    title,
    description: asNullableString(input.description),
    priceJpyc,
    currency,
    quantityLimit: asNullableNumber(input.quantityLimit),
    soldCount: asNumber(input.soldCount, 0),
    isPublished: asBoolean(input.isPublished, false),
    sortOrder: asNumber(input.sortOrder, 0),
    deliveryType: asNullableString(input.deliveryType),
    imageUrl: asNullableString(input.imageUrl),
    startThresholdType: asThresholdType(input.startThresholdType),
    startThresholdValue: asNullableNumber(input.startThresholdValue),
    productionStatus: asProductionStatus(input.productionStatus),
    productionStartedAt: asNullableString(input.productionStartedAt),
    productionCompletedAt: asNullableString(input.productionCompletedAt),
    createdAt,
    updatedAt,
    confirmedSupportCount: asNumber(input.confirmedSupportCount, 0),
    confirmedSupportAmountJpyc: asNumber(input.confirmedSupportAmountJpyc, 0),
    progressToStartPct: asNumber(input.progressToStartPct, 0),
    remainingCountToStart: asNullableNumber(input.remainingCountToStart),
    remainingAmountToStart: asNullableNumber(input.remainingAmountToStart),
    thresholdLabel: asNullableString(input.thresholdLabel),
    progressLabel: asNullableString(input.progressLabel),
    isThresholdReached: asBoolean(input.isThresholdReached, false),
    canStartProduction: asBoolean(input.canStartProduction, false),
    canCompleteProduction: asBoolean(input.canCompleteProduction, false),
    hasThreshold: asBoolean(input.hasThreshold, false),
  };
}

export function parseRewardTierListResponse(input: unknown): RewardTierView[] {
  if (!isRecord(input)) return [];
  const items = input.items;
  if (!Array.isArray(items)) return [];
  const parsed: RewardTierView[] = [];
  for (const raw of items) {
    const view = parseRewardTierView(raw);
    if (view) parsed.push(view);
  }
  return parsed;
}

export function parseRewardTierCreateResponse(
  input: unknown
): RewardTierView | null {
  if (!isRecord(input)) return null;
  return parseRewardTierView(input.tier);
}
