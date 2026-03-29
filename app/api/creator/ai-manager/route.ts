import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { isRecord } from "@/lib/api/guards";
import {
  AI_MANAGER_BILLABLE_CAPABILITIES,
  AI_MANAGER_INITIAL_CAPS,
  buildDefaultAiManagerDisplayName,
  isAiManagerArchetype,
  isAiManagerBillingMode,
  isAiManagerBillableCapability,
  isAiManagerDisclosurePolicy,
  isAiManagerPaymentRail,
  isAiManagerPublicVisibility,
  isAiManagerStatus,
  isAiManagerSupportStyle,
  isAiManagerTone,
} from "@/lib/aiManager/config";
import { AI_MANAGER_ACCOUNT_SELECT } from "@/lib/aiManager/accountReadModel";
import { getAiManagerReconciliationSummary } from "@/lib/aiManager/reconciliation";
import { findCreatorByOwnerAddress } from "@/lib/aiManager/ownerAccess";
import {
  buildDefaultAiManagerSlug,
  normalizeAiManagerSlug,
} from "@/lib/aiManager/slug";
import { serializeAiManagerAccount } from "@/lib/serializers/aiManager";
import {
  requireOwnerSessionFromBody,
  requireOwnerSessionFromSearchParams,
} from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseNullableTrimmedString(
  value: unknown,
  maxLength: number,
  code: string
): string | null | undefined {
  if (typeof value === "undefined") return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error(code);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > maxLength) {
    throw new Error(code);
  }
  return trimmed;
}

function parseRequiredTrimmedString(
  value: unknown,
  maxLength: number,
  code: string
): string {
  const parsed = parseNullableTrimmedString(value, maxLength, code);
  if (!parsed) {
    throw new Error(code);
  }
  return parsed;
}

function parseStringArray(
  value: unknown,
  maxItems: number,
  maxLength: number,
  code: string
): string[] | undefined {
  if (typeof value === "undefined") return undefined;
  if (!Array.isArray(value)) {
    throw new Error(code);
  }

  const items = value
    .map((item) => {
      if (typeof item !== "string") {
        throw new Error(code);
      }
      const trimmed = item.trim();
      if (trimmed.length === 0) return null;
      if (trimmed.length > maxLength) {
        throw new Error(code);
      }
      return trimmed;
    })
    .filter((item): item is string => item !== null);

  if (items.length > maxItems) {
    throw new Error(code);
  }

  return items;
}

function parseBoolean(value: unknown, code: string): boolean | undefined {
  if (typeof value === "undefined") return undefined;
  if (typeof value !== "boolean") {
    throw new Error(code);
  }
  return value;
}

function parseCapInt(
  value: unknown,
  code: string
): number | undefined {
  if (typeof value === "undefined") return undefined;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 1_000_000
  ) {
    throw new Error(code);
  }
  return value;
}

function parseAiManagerSlug(value: unknown, code: string): string | undefined {
  if (typeof value === "undefined" || value === null) return undefined;
  if (typeof value !== "string") {
    throw new Error(code);
  }
  // Empty string means "no slug provided" — fall back to default
  if (value.trim().length === 0) return undefined;

  const normalized = normalizeAiManagerSlug(value);
  if (!normalized) {
    throw new Error(code);
  }

  return normalized;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const ownerSession = await requireOwnerSessionFromSearchParams(
      req,
      searchParams
    );
    if (!ownerSession.ok) return ownerSession.response;

    const creator = await findCreatorByOwnerAddress(ownerSession.address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const row = await prisma.aiManagerAccount.findUnique({
      where: { creatorProfileId: creator.id },
      select: AI_MANAGER_ACCOUNT_SELECT,
    });

    return okJson({
      account: row
        ? serializeAiManagerAccount({
            row,
            ownerControlWalletAddress: creator.walletAddress ?? null,
            reconciliation: await getAiManagerReconciliationSummary({
              aiManagerAccountId: row.id,
            }),
          })
        : null,
    });
  } catch (error) {
    console.error("CREATOR_AI_MANAGER_GET_FAILED", error);
    return errJson("CREATOR_AI_MANAGER_GET_FAILED", 500);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return ownerSession.response;

    const creator = await findCreatorByOwnerAddress(ownerSession.address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const existing = await prisma.aiManagerAccount.findUnique({
      where: { creatorProfileId: creator.id },
      select: AI_MANAGER_ACCOUNT_SELECT,
    });
    if (existing) {
      return okJson({
        account: serializeAiManagerAccount({
          row: existing,
          ownerControlWalletAddress: creator.walletAddress ?? null,
          reconciliation: await getAiManagerReconciliationSummary({
            aiManagerAccountId: existing.id,
          }),
        }),
        created: false,
      });
    }

    const initialName =
      parseNullableTrimmedString(raw.displayName, 80, "DISPLAY_NAME_INVALID") ??
      buildDefaultAiManagerDisplayName(creator.displayName || creator.username);
    const initialSlug =
      parseAiManagerSlug(raw.slug, "SLUG_INVALID") ??
      buildDefaultAiManagerSlug(creator.username);

    const row = await prisma.aiManagerAccount.create({
      data: {
        creatorProfileId: creator.id,
        displayName: initialName,
        slug: initialSlug,
        status: "DRAFT",
        archetype: "GENTLE_SUPPORTER",
        publicVisibility: "OWNER_ONLY",
        primaryLanguage: "ja",
        tone: "FRIENDLY",
        supportStyle: "ENCOURAGING",
        disclosurePolicy: "ALWAYS_DISCLOSE_AI",
        specialties: [],
        forbiddenTopics: [],
        brandGuardrails: [],
        billingPolicy: {
          create: {
            billingMode: "MANUAL_TOPUP",
            preferredRail: "X402_PREFERRED",
            currency: "JPYC",
            freeTierEnabled: true,
            freeTierScope: "BRIEFING_AND_LIGHT_DRAFTS",
            autoPayEnabled: false,
            monthlyJpycCap: AI_MANAGER_INITIAL_CAPS.monthlyJpyc,
            dailyJpycCap: AI_MANAGER_INITIAL_CAPS.dailyJpyc,
            perActionJpycCap: AI_MANAGER_INITIAL_CAPS.perActionJpyc,
            allowedBillableCapabilities: [...AI_MANAGER_BILLABLE_CAPABILITIES],
          },
        },
        budgetBalance: {
          create: {
            currency: "JPYC",
          },
        },
      },
      select: AI_MANAGER_ACCOUNT_SELECT,
    });

    return okJson(
      {
        account: serializeAiManagerAccount({
          row,
          ownerControlWalletAddress: creator.walletAddress ?? null,
          reconciliation: await getAiManagerReconciliationSummary({
            aiManagerAccountId: row.id,
          }),
        }),
        created: true,
      },
      201
    );
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "DISPLAY_NAME_INVALID":
        case "SLUG_INVALID":
          return errJson(error.message, 400);
        default:
          break;
      }
    }

    console.error("CREATOR_AI_MANAGER_POST_FAILED", error);
    return errJson("CREATOR_AI_MANAGER_POST_FAILED", 500);
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return ownerSession.response;

    const creator = await findCreatorByOwnerAddress(ownerSession.address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const existing = await prisma.aiManagerAccount.findUnique({
      where: { creatorProfileId: creator.id },
      select: { id: true },
    });
    if (!existing) return errJson("AI_MANAGER_NOT_FOUND", 404);

    const displayName = parseRequiredTrimmedString(
      raw.displayName,
      80,
      "DISPLAY_NAME_INVALID"
    );
    const slug =
      parseAiManagerSlug(raw.slug, "SLUG_INVALID") ??
      buildDefaultAiManagerSlug(creator.username);
    const intro = parseNullableTrimmedString(raw.intro, 800, "INTRO_INVALID");
    const archetype = raw.archetype;
    const publicVisibility = raw.publicVisibility;
    const status = raw.status;
    const primaryLanguage = parseRequiredTrimmedString(
      raw.primaryLanguage,
      16,
      "PRIMARY_LANGUAGE_INVALID"
    );
    const tone = raw.tone;
    const supportStyle = raw.supportStyle;
    const disclosurePolicy = raw.disclosurePolicy;
    const managerActivityWalletAddress = parseNullableTrimmedString(
      raw.managerActivityWalletAddress,
      120,
      "MANAGER_ACTIVITY_WALLET_INVALID"
    );
    const budgetWalletAddress = parseNullableTrimmedString(
      raw.budgetWalletAddress,
      120,
      "BUDGET_WALLET_INVALID"
    );
    const specialties = parseStringArray(
      raw.specialties,
      12,
      80,
      "SPECIALTIES_INVALID"
    );
    const forbiddenTopics = parseStringArray(
      raw.forbiddenTopics,
      12,
      80,
      "FORBIDDEN_TOPICS_INVALID"
    );
    const brandGuardrails = parseStringArray(
      raw.brandGuardrails,
      12,
      120,
      "BRAND_GUARDRAILS_INVALID"
    );

    if (!isAiManagerArchetype(archetype)) {
      console.warn("[ai-manager PATCH] ARCHETYPE_INVALID:", archetype);
      return errJson("ARCHETYPE_INVALID", 400);
    }
    if (!isAiManagerPublicVisibility(publicVisibility)) {
      console.warn("[ai-manager PATCH] PUBLIC_VISIBILITY_INVALID:", publicVisibility);
      return errJson("PUBLIC_VISIBILITY_INVALID", 400);
    }
    if (!isAiManagerStatus(status)) {
      console.warn("[ai-manager PATCH] STATUS_INVALID:", status);
      return errJson("STATUS_INVALID", 400);
    }
    if (!isAiManagerTone(tone)) {
      console.warn("[ai-manager PATCH] TONE_INVALID:", tone);
      return errJson("TONE_INVALID", 400);
    }
    if (!isAiManagerSupportStyle(supportStyle)) {
      console.warn("[ai-manager PATCH] SUPPORT_STYLE_INVALID:", supportStyle);
      return errJson("SUPPORT_STYLE_INVALID", 400);
    }
    if (!isAiManagerDisclosurePolicy(disclosurePolicy)) {
      console.warn("[ai-manager PATCH] DISCLOSURE_POLICY_INVALID:", disclosurePolicy);
      return errJson("DISCLOSURE_POLICY_INVALID", 400);
    }
    if (!specialties || !forbiddenTopics || !brandGuardrails) {
      console.warn("[ai-manager PATCH] AI_MANAGER_ARRAY_INVALID");
      return errJson("AI_MANAGER_ARRAY_INVALID", 400);
    }

    const billingRaw = raw.billing;
    if (!isRecord(billingRaw)) {
      console.warn("[ai-manager PATCH] BILLING_REQUIRED: billing field missing or not an object");
      return errJson("BILLING_REQUIRED", 400);
    }
    const billingMode = billingRaw.billingMode;
    const preferredRail = billingRaw.preferredRail;
    const freeTierEnabled = parseBoolean(
      billingRaw.freeTierEnabled,
      "FREE_TIER_ENABLED_INVALID"
    );
    const autoPayEnabled = parseBoolean(
      billingRaw.autoPayEnabled,
      "AUTO_PAY_ENABLED_INVALID"
    );
    const monthlyJpycCap = parseCapInt(
      billingRaw.monthlyJpycCap,
      "MONTHLY_CAP_INVALID"
    );
    const dailyJpycCap = parseCapInt(
      billingRaw.dailyJpycCap,
      "DAILY_CAP_INVALID"
    );
    const perActionJpycCap = parseCapInt(
      billingRaw.perActionJpycCap,
      "PER_ACTION_CAP_INVALID"
    );
    const allowedBillableCapabilities = parseStringArray(
      billingRaw.allowedBillableCapabilities,
      AI_MANAGER_BILLABLE_CAPABILITIES.length,
      40,
      "ALLOWED_CAPABILITIES_INVALID"
    );

    if (!isAiManagerBillingMode(billingMode)) {
      console.warn("[ai-manager PATCH] BILLING_MODE_INVALID:", billingMode);
      return errJson("BILLING_MODE_INVALID", 400);
    }
    if (!isAiManagerPaymentRail(preferredRail)) {
      console.warn("[ai-manager PATCH] PREFERRED_RAIL_INVALID:", preferredRail);
      return errJson("PREFERRED_RAIL_INVALID", 400);
    }
    if (
      typeof freeTierEnabled !== "boolean" ||
      typeof autoPayEnabled !== "boolean" ||
      typeof monthlyJpycCap !== "number" ||
      typeof dailyJpycCap !== "number" ||
      typeof perActionJpycCap !== "number" ||
      !allowedBillableCapabilities
    ) {
      console.warn("[ai-manager PATCH] BILLING_INVALID:", {
        freeTierEnabled: typeof freeTierEnabled,
        autoPayEnabled: typeof autoPayEnabled,
        monthlyJpycCap: typeof monthlyJpycCap,
        dailyJpycCap: typeof dailyJpycCap,
        perActionJpycCap: typeof perActionJpycCap,
        allowedBillableCapabilities: !!allowedBillableCapabilities,
      });
      return errJson("BILLING_INVALID", 400);
    }

    const filteredCapabilities = allowedBillableCapabilities.filter(
      isAiManagerBillableCapability
    );
    if (filteredCapabilities.length === 0) {
      console.warn("[ai-manager PATCH] ALLOWED_CAPABILITIES_REQUIRED:", allowedBillableCapabilities);
      return errJson("ALLOWED_CAPABILITIES_REQUIRED", 400);
    }

    const row = await prisma.aiManagerAccount.update({
      where: { creatorProfileId: creator.id },
      data: {
        displayName,
        slug,
        intro,
        archetype,
        publicVisibility,
        status,
        primaryLanguage,
        tone,
        supportStyle,
        disclosurePolicy,
        managerActivityWalletAddress,
        budgetWalletAddress,
        specialties,
        forbiddenTopics,
        brandGuardrails,
        billingPolicy: {
          upsert: {
            create: {
              billingMode,
              preferredRail,
              currency: "JPYC",
              freeTierEnabled,
              freeTierScope: "BRIEFING_AND_LIGHT_DRAFTS",
              autoPayEnabled,
              monthlyJpycCap,
              dailyJpycCap,
              perActionJpycCap,
              allowedBillableCapabilities: filteredCapabilities,
            },
            update: {
              billingMode,
              preferredRail,
              currency: "JPYC",
              freeTierEnabled,
              freeTierScope: "BRIEFING_AND_LIGHT_DRAFTS",
              autoPayEnabled,
              monthlyJpycCap,
              dailyJpycCap,
              perActionJpycCap,
              allowedBillableCapabilities: filteredCapabilities,
            },
          },
        },
      },
      select: AI_MANAGER_ACCOUNT_SELECT,
    });

    return okJson({
      account: serializeAiManagerAccount({
        row,
        ownerControlWalletAddress: creator.walletAddress ?? null,
        reconciliation: await getAiManagerReconciliationSummary({
          aiManagerAccountId: row.id,
        }),
      }),
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "DISPLAY_NAME_INVALID":
        case "SLUG_INVALID":
        case "INTRO_INVALID":
        case "PRIMARY_LANGUAGE_INVALID":
        case "MANAGER_ACTIVITY_WALLET_INVALID":
        case "BUDGET_WALLET_INVALID":
        case "SPECIALTIES_INVALID":
        case "FORBIDDEN_TOPICS_INVALID":
        case "BRAND_GUARDRAILS_INVALID":
          console.warn("[ai-manager PATCH] validation error:", error.message);
          return errJson(error.message, 400);
        default:
          break;
      }
    }

    console.error("CREATOR_AI_MANAGER_PATCH_FAILED", error);
    return errJson("CREATOR_AI_MANAGER_PATCH_FAILED", 500);
  }
}
