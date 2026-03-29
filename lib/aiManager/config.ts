export const AI_MANAGER_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "ARCHIVED",
] as const;

export const AI_MANAGER_ARCHETYPES = [
  "GENTLE_SUPPORTER",
  "PRODUCER",
  "ANALYST",
  "PROMOTER",
  "FAN_GUIDE",
] as const;

export const AI_MANAGER_PUBLIC_VISIBILITIES = [
  "OWNER_ONLY",
  "PUBLIC_BADGED",
  "PRIVATE",
] as const;

export const AI_MANAGER_TONES = [
  "POLITE",
  "FRIENDLY",
  "ELEGANT",
  "ENERGETIC",
  "COOL",
] as const;

export const AI_MANAGER_SUPPORT_STYLES = [
  "ENCOURAGING",
  "CALM",
  "DATA_DRIVEN",
  "PROMOTIONAL",
] as const;

export const AI_MANAGER_DISCLOSURE_POLICIES = [
  "ALWAYS_DISCLOSE_AI",
  "DISCLOSE_ON_PUBLIC_ACTION",
] as const;

export const AI_MANAGER_BILLING_MODES = [
  "MANUAL_TOPUP",
  "AUTO_PAY_WITH_CAP",
] as const;

export const AI_MANAGER_BILLING_POLICY_STATUSES = [
  "ACTIVE",
  "PAUSED",
] as const;

export const AI_MANAGER_PAYMENT_RAILS = [
  "X402_PREFERRED",
  "INTERNAL_LEDGER_FALLBACK",
] as const;

export const AI_MANAGER_PAYMENT_ATTEMPT_RAILS = [
  "X402",
  "INTERNAL_LEDGER",
] as const;

export const AI_MANAGER_FREE_TIER_SCOPES = [
  "BRIEFING_AND_LIGHT_DRAFTS",
] as const;

export const AI_MANAGER_BILLABLE_CAPABILITIES = [
  "POST_DRAFTING",
  "FAN_REPLY_ASSIST",
  "PROGRESS_SUMMARY",
  "WEB_RESEARCH",
] as const;

export const AI_MANAGER_USAGE_BILLING_STATES = [
  "METERED",
  "PAYMENT_PENDING",
  "SETTLED",
  "FAILED",
  "WAIVED",
] as const;

export const AI_MANAGER_PAYMENT_ATTEMPT_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "FAILED",
] as const;

export const AI_MANAGER_PAYMENT_ATTEMPT_EVENT_SOURCES = [
  "BILLING_SYSTEM",
  "OWNER_REVIEW",
  "X402_CONNECTOR",
] as const;

export const AI_MANAGER_PAYMENT_ATTEMPT_EVENT_TYPES = [
  "ATTEMPT_CREATED",
  "PENDING_OBSERVED",
  "SETTLEMENT_CONFIRMED",
  "SETTLEMENT_FAILED",
  "SETTLEMENT_REPLAYED",
] as const;

export const AI_MANAGER_BUDGET_TRANSACTION_DIRECTIONS = [
  "CREDIT",
  "DEBIT",
] as const;

export const AI_MANAGER_BUDGET_TRANSACTION_TYPES = [
  "OWNER_TOP_UP",
  "OWNER_DEDUCTION",
  "USAGE_SETTLEMENT",
] as const;

export const AI_MANAGER_FUNDING_EVIDENCE_STATUSES = [
  "SELF_REPORTED",
  "MATCHED_TO_LEDGER",
  "REJECTED",
] as const;

export type AiManagerStatus = (typeof AI_MANAGER_STATUSES)[number];
export type AiManagerArchetype = (typeof AI_MANAGER_ARCHETYPES)[number];
export type AiManagerPublicVisibility =
  (typeof AI_MANAGER_PUBLIC_VISIBILITIES)[number];
export type AiManagerTone = (typeof AI_MANAGER_TONES)[number];
export type AiManagerSupportStyle =
  (typeof AI_MANAGER_SUPPORT_STYLES)[number];
export type AiManagerDisclosurePolicy =
  (typeof AI_MANAGER_DISCLOSURE_POLICIES)[number];
export type AiManagerBillingMode = (typeof AI_MANAGER_BILLING_MODES)[number];
export type AiManagerBillingPolicyStatus =
  (typeof AI_MANAGER_BILLING_POLICY_STATUSES)[number];
export type AiManagerPaymentRail = (typeof AI_MANAGER_PAYMENT_RAILS)[number];
export type AiManagerPaymentAttemptRail =
  (typeof AI_MANAGER_PAYMENT_ATTEMPT_RAILS)[number];
export type AiManagerFreeTierScope =
  (typeof AI_MANAGER_FREE_TIER_SCOPES)[number];
export type AiManagerBillableCapability =
  (typeof AI_MANAGER_BILLABLE_CAPABILITIES)[number];
export type AiManagerUsageBillingState =
  (typeof AI_MANAGER_USAGE_BILLING_STATES)[number];
export type AiManagerPaymentAttemptStatus =
  (typeof AI_MANAGER_PAYMENT_ATTEMPT_STATUSES)[number];
export type AiManagerPaymentAttemptEventSource =
  (typeof AI_MANAGER_PAYMENT_ATTEMPT_EVENT_SOURCES)[number];
export type AiManagerPaymentAttemptEventType =
  (typeof AI_MANAGER_PAYMENT_ATTEMPT_EVENT_TYPES)[number];
export type AiManagerBudgetTransactionDirection =
  (typeof AI_MANAGER_BUDGET_TRANSACTION_DIRECTIONS)[number];
export type AiManagerBudgetTransactionType =
  (typeof AI_MANAGER_BUDGET_TRANSACTION_TYPES)[number];
export type AiManagerFundingEvidenceStatus =
  (typeof AI_MANAGER_FUNDING_EVIDENCE_STATUSES)[number];

const INITIAL_CAPS = {
  perActionJpyc: 100,
  dailyJpyc: 300,
  monthlyJpyc: 3000,
} as const;

export const AI_MANAGER_INITIAL_CAPS = INITIAL_CAPS;
export const AI_MANAGER_PLATFORM_OPERATIONS_PAYEE_ID =
  "platform-operations-wallet";

export const AI_MANAGER_CAPABILITY_CHARGES = {
  POST_DRAFTING: {
    chargeAmountJpyc: "40.00",
    providerCostUsd: "0.090000",
    platformFeeUsd: "0.030000",
    model: "creator-office-draft-v1",
  },
  FAN_REPLY_ASSIST: {
    chargeAmountJpyc: "30.00",
    providerCostUsd: "0.070000",
    platformFeeUsd: "0.020000",
    model: "creator-office-reply-v1",
  },
  PROGRESS_SUMMARY: {
    chargeAmountJpyc: "20.00",
    providerCostUsd: "0.050000",
    platformFeeUsd: "0.015000",
    model: "creator-office-summary-v1",
  },
  WEB_RESEARCH: {
    chargeAmountJpyc: "60.00",
    providerCostUsd: "0.120000",
    platformFeeUsd: "0.040000",
    model: "creator-office-research-v1",
  },
} as const;

export function buildDefaultAiManagerDisplayName(ownerName: string): string {
  const trimmed = ownerName.trim();
  if (!trimmed) return "AI Manager";
  return `${trimmed} の AIマネージャー`;
}

function includesValue<T extends string>(
  choices: readonly T[],
  value: unknown
): value is T {
  return typeof value === "string" && choices.includes(value as T);
}

export function isAiManagerStatus(value: unknown): value is AiManagerStatus {
  return includesValue(AI_MANAGER_STATUSES, value);
}

export function isAiManagerArchetype(value: unknown): value is AiManagerArchetype {
  return includesValue(AI_MANAGER_ARCHETYPES, value);
}

export function isAiManagerPublicVisibility(
  value: unknown
): value is AiManagerPublicVisibility {
  return includesValue(AI_MANAGER_PUBLIC_VISIBILITIES, value);
}

export function isAiManagerTone(value: unknown): value is AiManagerTone {
  return includesValue(AI_MANAGER_TONES, value);
}

export function isAiManagerSupportStyle(
  value: unknown
): value is AiManagerSupportStyle {
  return includesValue(AI_MANAGER_SUPPORT_STYLES, value);
}

export function isAiManagerDisclosurePolicy(
  value: unknown
): value is AiManagerDisclosurePolicy {
  return includesValue(AI_MANAGER_DISCLOSURE_POLICIES, value);
}

export function isAiManagerBillingMode(
  value: unknown
): value is AiManagerBillingMode {
  return includesValue(AI_MANAGER_BILLING_MODES, value);
}

export function isAiManagerBillingPolicyStatus(
  value: unknown
): value is AiManagerBillingPolicyStatus {
  return includesValue(AI_MANAGER_BILLING_POLICY_STATUSES, value);
}

export function isAiManagerPaymentRail(
  value: unknown
): value is AiManagerPaymentRail {
  return includesValue(AI_MANAGER_PAYMENT_RAILS, value);
}

export function isAiManagerPaymentAttemptRail(
  value: unknown
): value is AiManagerPaymentAttemptRail {
  return includesValue(AI_MANAGER_PAYMENT_ATTEMPT_RAILS, value);
}

export function isAiManagerFreeTierScope(
  value: unknown
): value is AiManagerFreeTierScope {
  return includesValue(AI_MANAGER_FREE_TIER_SCOPES, value);
}

export function isAiManagerBillableCapability(
  value: unknown
): value is AiManagerBillableCapability {
  return includesValue(AI_MANAGER_BILLABLE_CAPABILITIES, value);
}

export function isAiManagerUsageBillingState(
  value: unknown
): value is AiManagerUsageBillingState {
  return includesValue(AI_MANAGER_USAGE_BILLING_STATES, value);
}

export function isAiManagerPaymentAttemptStatus(
  value: unknown
): value is AiManagerPaymentAttemptStatus {
  return includesValue(AI_MANAGER_PAYMENT_ATTEMPT_STATUSES, value);
}

export function isAiManagerPaymentAttemptEventSource(
  value: unknown
): value is AiManagerPaymentAttemptEventSource {
  return includesValue(AI_MANAGER_PAYMENT_ATTEMPT_EVENT_SOURCES, value);
}

export function isAiManagerPaymentAttemptEventType(
  value: unknown
): value is AiManagerPaymentAttemptEventType {
  return includesValue(AI_MANAGER_PAYMENT_ATTEMPT_EVENT_TYPES, value);
}

export function isAiManagerBudgetTransactionDirection(
  value: unknown
): value is AiManagerBudgetTransactionDirection {
  return includesValue(AI_MANAGER_BUDGET_TRANSACTION_DIRECTIONS, value);
}

export function isAiManagerBudgetTransactionType(
  value: unknown
): value is AiManagerBudgetTransactionType {
  return includesValue(AI_MANAGER_BUDGET_TRANSACTION_TYPES, value);
}

export function isAiManagerFundingEvidenceStatus(
  value: unknown
): value is AiManagerFundingEvidenceStatus {
  return includesValue(AI_MANAGER_FUNDING_EVIDENCE_STATUSES, value);
}
