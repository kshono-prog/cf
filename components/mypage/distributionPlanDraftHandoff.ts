"use client";

import { isRecord } from "@/lib/api/guards";
import {
  formatDistributionPlanDraftPayload,
  type DistributionPlanDraftPayload,
} from "@/lib/creator-ai/distributionPlanDraft";
import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";

export const DISTRIBUTION_PLAN_DRAFT_HANDOFF_STORAGE_KEY =
  "cf:settlement:distribution-plan-draft-handoff";

export type DistributionPlanDraftHandoff = {
  projectId: string;
  currency: CurrencyCode;
  payloadText: string;
  createdAt: string;
};

function toCurrencyCode(value: unknown): CurrencyCode | null {
  return value === "JPYC" || value === "USDC" ? value : null;
}

function normalizeCreatorMypagePath(pathname: string): string {
  const mypageIndex = pathname.indexOf("/mypage");

  if (mypageIndex < 0) {
    return pathname;
  }

  return `${pathname.slice(0, mypageIndex)}/mypage/advanced`;
}

export function buildDistributionPlanDraftHandoff(
  payload: DistributionPlanDraftPayload
): DistributionPlanDraftHandoff {
  return {
    projectId: payload.projectId,
    currency: payload.currency,
    payloadText: formatDistributionPlanDraftPayload(payload),
    createdAt: payload.generatedAt,
  };
}

export function parseDistributionPlanDraftHandoff(
  value: unknown
): DistributionPlanDraftHandoff | null {
  if (!isRecord(value)) {
    return null;
  }

  const projectId =
    typeof value.projectId === "string" && value.projectId.trim().length > 0
      ? value.projectId
      : null;
  const currency = toCurrencyCode(value.currency);
  const payloadText =
    typeof value.payloadText === "string" && value.payloadText.trim().length > 0
      ? value.payloadText
      : null;
  const createdAt =
    typeof value.createdAt === "string" && value.createdAt.trim().length > 0
      ? value.createdAt
      : null;

  if (!projectId || !currency || !payloadText || !createdAt) {
    return null;
  }

  return {
    projectId,
    currency,
    payloadText,
    createdAt,
  };
}

export function buildSettlementPlanAnchorId(currency: CurrencyCode): string {
  return `settlement-plan-${currency.toLowerCase()}`;
}

export function buildSettlementDraftHref(args: {
  pathname: string;
  currency: CurrencyCode;
}): string {
  return `${normalizeCreatorMypagePath(args.pathname)}#${buildSettlementPlanAnchorId(
    args.currency
  )}`;
}
