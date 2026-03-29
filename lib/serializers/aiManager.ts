import { Prisma } from "@prisma/client";

import { isRecord, toOptionalString } from "@/lib/api/guards";
import { toTaskType, type TaskType } from "@/lib/agentTaskParsers";
import {
  AI_MANAGER_BILLABLE_CAPABILITIES,
  isAiManagerArchetype,
  isAiManagerBillingMode,
  isAiManagerBillingPolicyStatus,
  isAiManagerBillableCapability,
  isAiManagerBudgetTransactionDirection,
  isAiManagerBudgetTransactionType,
  isAiManagerDisclosurePolicy,
  isAiManagerFundingEvidenceStatus,
  isAiManagerFreeTierScope,
  isAiManagerPaymentAttemptEventSource,
  isAiManagerPaymentAttemptEventType,
  isAiManagerPaymentAttemptRail,
  isAiManagerPaymentAttemptStatus,
  isAiManagerPaymentRail,
  isAiManagerPublicVisibility,
  isAiManagerStatus,
  isAiManagerSupportStyle,
  isAiManagerTone,
  isAiManagerUsageBillingState,
  type AiManagerBillableCapability,
  type AiManagerBillingMode,
  type AiManagerBillingPolicyStatus,
  type AiManagerBudgetTransactionDirection,
  type AiManagerBudgetTransactionType,
  type AiManagerDisclosurePolicy,
  type AiManagerFundingEvidenceStatus,
  type AiManagerFreeTierScope,
  type AiManagerPaymentAttemptEventSource,
  type AiManagerPaymentAttemptEventType,
  type AiManagerPaymentAttemptRail,
  type AiManagerPaymentAttemptStatus,
  type AiManagerPaymentRail,
  type AiManagerPublicVisibility,
  type AiManagerStatus,
  type AiManagerSupportStyle,
  type AiManagerTone,
  type AiManagerArchetype,
  type AiManagerUsageBillingState,
} from "@/lib/aiManager/config";
import {
  buildEmptyAiManagerReconciliationSummary,
  type AiManagerX402DeliveryStatus,
  type SerializedAiManagerReconciliationSummary,
} from "@/lib/aiManager/reconciliationShared";
import { deriveAiManagerX402RecoverySummary } from "@/lib/aiManager/x402RecoverySummary";
import {
  isAiManagerPayeeVerificationStatus,
  type AiManagerPayeeVerificationStatus,
} from "@/lib/aiManager/payeeRegistry";
import { getAgentTaskTypeCopy } from "@/lib/uxCopy";

export type SerializedAiManagerBillingPolicy = {
  status: AiManagerBillingPolicyStatus;
  billingMode: AiManagerBillingMode;
  preferredRail: AiManagerPaymentRail;
  currency: string;
  freeTierEnabled: boolean;
  freeTierScope: AiManagerFreeTierScope;
  autoPayEnabled: boolean;
  monthlyJpycCap: number;
  dailyJpycCap: number;
  perActionJpycCap: number;
  allowedBillableCapabilities: AiManagerBillableCapability[];
  pausedAt: string | null;
  pauseReason: string | null;
};

export type SerializedAiManagerBudgetBalance = {
  currency: string;
  availableAmount: string;
  reservedAmount: string;
  updatedAt: string;
};

export type SerializedAiManagerPaymentAttempt = {
  id: string;
  rail: AiManagerPaymentAttemptRail;
  status: AiManagerPaymentAttemptStatus;
  payerWalletAddress: string | null;
  currency: string;
  amount: string;
  txHash: string | null;
  payeeWalletAddress: string | null;
  failureReason: string | null;
  createdAt: string;
  confirmedAt: string | null;
};

export type SerializedAiManagerPaymentAttemptEvent = {
  id: string;
  paymentAttemptId: string;
  usageId: string;
  source: AiManagerPaymentAttemptEventSource;
  eventType: AiManagerPaymentAttemptEventType;
  status: AiManagerPaymentAttemptStatus;
  rail: AiManagerPaymentAttemptRail;
  capability: AiManagerBillableCapability;
  taskType: string | null;
  txHash: string | null;
  detail: string | null;
  createdAt: string;
};

export type SerializedAiManagerUsageRecord = {
  id: string;
  capability: AiManagerBillableCapability;
  provider: string;
  model: string | null;
  taskType: string | null;
  currency: string;
  chargeAmount: string;
  providerCostUsd: string;
  platformFeeUsd: string;
  totalChargeUsd: string;
  billingState: AiManagerUsageBillingState;
  failureReason: string | null;
  createdAt: string;
  latestPaymentAttempt: SerializedAiManagerPaymentAttempt | null;
};

export type SerializedAiManagerBudgetTransaction = {
  id: string;
  direction: AiManagerBudgetTransactionDirection;
  transactionType: AiManagerBudgetTransactionType;
  currency: string;
  amount: string;
  resultingAvailableAmount: string;
  note: string | null;
  actorAddress: string | null;
  createdAt: string;
};

export type SerializedAiManagerFundingEvidence = {
  id: string;
  status: AiManagerFundingEvidenceStatus;
  chainId: number;
  currency: string;
  amount: string;
  txHash: string;
  fromWalletAddress: string | null;
  toWalletAddress: string;
  reportedByAddress: string | null;
  note: string | null;
  createdAt: string;
  matchedAt: string | null;
  matchedBudgetTransactionId: string | null;
};

export type SerializedPublicAiManagerProfile = {
  displayName: string;
  slug: string;
  avatarAssetUrl: string | null;
  intro: string | null;
  archetype: AiManagerArchetype;
  primaryLanguage: string;
  tone: AiManagerTone;
  supportStyle: AiManagerSupportStyle;
  disclosurePolicy: AiManagerDisclosurePolicy;
  specialties: string[];
  updatedAt: string;
};

export type SerializedPublicAiManagerSupportActivity = {
  taskType: TaskType;
  label: string;
  helper: string | null;
  createdAt: string;
};

export type SerializedManagerDeskAiManagerOperatingMode =
  | "INACTIVE"
  | "FREE_ONLY"
  | "BILLABLE_ACTIVE";

export type SerializedManagerDeskAiManagerSummary = {
  displayName: string;
  status: AiManagerStatus;
  publicVisibility: AiManagerPublicVisibility;
  intro: string | null;
  archetype: AiManagerArchetype;
  primaryLanguage: string;
  tone: AiManagerTone;
  supportStyle: AiManagerSupportStyle;
  disclosurePolicy: AiManagerDisclosurePolicy;
  specialties: string[];
  billingPolicyStatus: AiManagerBillingPolicyStatus | null;
  freeTierScope: AiManagerFreeTierScope | null;
  allowedBillableCapabilities: AiManagerBillableCapability[];
  operatingMode: SerializedManagerDeskAiManagerOperatingMode;
  updatedAt: string;
};

export const AI_MANAGER_FUNDING_X402_STATUSES = [
  "X402_READY",
  "X402_CONFIG_REQUIRED",
  "INTERNAL_LEDGER_ONLY",
] as const;

const AI_MANAGER_X402_DELIVERY_STATUSES = [
  "NONE",
  "ACTIVE",
  "WATCH",
  "STALE",
] as const;

export type SerializedAiManagerFundingX402Status =
  (typeof AI_MANAGER_FUNDING_X402_STATUSES)[number];

export type SerializedAiManagerFundingInstructions = {
  ownerControlWalletAddress: string | null;
  budgetWalletAddress: string | null;
  payeeId: string;
  payeeLabel: string;
  payeeVerificationStatus: AiManagerPayeeVerificationStatus;
  platformOperationsWalletAddress: string | null;
  currency: string;
  chainId: number;
  chainName: string;
  chainShortName: string;
  tokenSymbol: string;
  tokenAddress: string | null;
  preferredRail: AiManagerPaymentRail;
  activeSettlementRail: AiManagerPaymentAttemptRail;
  x402Status: SerializedAiManagerFundingX402Status;
  x402EndpointUrl: string | null;
  referenceCode: string;
  steps: string[];
  warnings: string[];
};

export type SerializedAiManagerAccount = {
  id: string;
  creatorProfileId: string;
  ownerControlWalletAddress: string | null;
  status: AiManagerStatus;
  displayName: string;
  slug: string | null;
  avatarAssetUrl: string | null;
  intro: string | null;
  archetype: AiManagerArchetype;
  publicVisibility: AiManagerPublicVisibility;
  primaryLanguage: string;
  tone: AiManagerTone;
  supportStyle: AiManagerSupportStyle;
  disclosurePolicy: AiManagerDisclosurePolicy;
  managerActivityWalletAddress: string | null;
  budgetWalletAddress: string | null;
  specialties: string[];
  forbiddenTopics: string[];
  brandGuardrails: string[];
  createdAt: string;
  updatedAt: string;
  billingPolicy: SerializedAiManagerBillingPolicy | null;
  budgetBalance: SerializedAiManagerBudgetBalance | null;
  recentUsageRecords: SerializedAiManagerUsageRecord[];
  recentBudgetTransactions: SerializedAiManagerBudgetTransaction[];
  recentFundingEvidences: SerializedAiManagerFundingEvidence[];
  recentPaymentAttemptEvents: SerializedAiManagerPaymentAttemptEvent[];
  reconciliation: SerializedAiManagerReconciliationSummary;
};

type AiManagerAccountRow = {
  id: string;
  creatorProfileId: bigint;
  status: string;
  displayName: string;
  slug: string | null;
  avatarAssetUrl: string | null;
  intro: string | null;
  archetype: string;
  publicVisibility: string;
  primaryLanguage: string;
  tone: string;
  supportStyle: string;
  disclosurePolicy: string;
  managerActivityWalletAddress: string | null;
  budgetWalletAddress: string | null;
  specialties: string[];
  forbiddenTopics: string[];
  brandGuardrails: string[];
  createdAt: Date;
  updatedAt: Date;
  billingPolicy: {
    status: string;
    billingMode: string;
    preferredRail: string;
    currency: string;
    freeTierEnabled: boolean;
    freeTierScope: string;
    autoPayEnabled: boolean;
    monthlyJpycCap: number;
    dailyJpycCap: number;
    perActionJpycCap: number;
    allowedBillableCapabilities: string[];
    pausedAt: Date | null;
    pauseReason: string | null;
  } | null;
  budgetBalance: {
    currency: string;
    availableAmount: Prisma.Decimal | string;
    reservedAmount: Prisma.Decimal | string;
    updatedAt: Date;
  } | null;
  usageRecords: Array<{
    id: string;
    capability: string;
    provider: string;
    model: string | null;
    currency: string;
    chargeAmount: Prisma.Decimal | string;
    providerCostUsd: Prisma.Decimal | string;
    platformFeeUsd: Prisma.Decimal | string;
    totalChargeUsd: Prisma.Decimal | string;
    billingState: string;
    failureReason: string | null;
    createdAt: Date;
    agentTask: {
      taskType: string;
    } | null;
    paymentAttempts: Array<{
      id: string;
      rail: string;
      status: string;
      payerWalletAddress: string | null;
      currency: string;
      amount: Prisma.Decimal | string;
      txHash: string | null;
      payeeWalletAddress: string | null;
      failureReason: string | null;
      createdAt: Date;
      confirmedAt: Date | null;
    }>;
  }>;
  budgetTransactions: Array<{
    id: string;
    direction: string;
    transactionType: string;
    currency: string;
    amount: Prisma.Decimal | string;
    resultingAvailableAmount: Prisma.Decimal | string;
    note: string | null;
    actorAddress: string | null;
    createdAt: Date;
  }>;
  fundingEvidences: Array<{
    id: string;
    status: string;
    chainId: number;
    currency: string;
    amount: Prisma.Decimal | string;
    txHash: string;
    fromWalletAddress: string | null;
    toWalletAddress: string;
    reportedByAddress: string | null;
    note: string | null;
    createdAt: Date;
    matchedAt: Date | null;
    matchedBudgetTransactionId: string | null;
  }>;
  paymentAttemptEvents: Array<{
    id: string;
    source: string;
    eventType: string;
    status: string;
    txHash: string | null;
    detail: string | null;
    createdAt: Date;
    paymentAttempt: {
      id: string;
      rail: string;
      usageRecord: {
        id: string;
        capability: string;
        agentTask: {
          taskType: string;
        } | null;
      };
    };
  }>;
};

type PublicAiManagerAccountRow = {
  status: string;
  displayName: string;
  slug: string | null;
  avatarAssetUrl: string | null;
  intro: string | null;
  archetype: string;
  publicVisibility: string;
  primaryLanguage: string;
  tone: string;
  supportStyle: string;
  disclosurePolicy: string;
  specialties: string[];
  updatedAt: Date;
};

type PublicAiManagerSupportActivityRow = {
  billingState: string;
  createdAt: Date;
  agentTask: {
    taskType: string;
  } | null;
};

type ManagerDeskAiManagerRow = {
  status: string;
  displayName: string;
  intro: string | null;
  archetype: string;
  publicVisibility: string;
  primaryLanguage: string;
  tone: string;
  supportStyle: string;
  disclosurePolicy: string;
  specialties: string[];
  updatedAt: Date;
  billingPolicy: {
    status: string;
    freeTierScope: string;
    autoPayEnabled: boolean;
    allowedBillableCapabilities: string[];
  } | null;
  budgetBalance: {
    availableAmount: Prisma.Decimal | string;
  } | null;
};

function toDecimalString(value: Prisma.Decimal | string): string {
  return typeof value === "string" ? value : value.toString();
}

function toStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const values = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
  return values;
}

function isAiManagerFundingX402Status(
  value: unknown
): value is SerializedAiManagerFundingX402Status {
  return (
    typeof value === "string" &&
    (AI_MANAGER_FUNDING_X402_STATUSES as readonly string[]).includes(value)
  );
}

function isAiManagerX402DeliveryStatus(
  value: unknown
): value is AiManagerX402DeliveryStatus {
  return (
    typeof value === "string" &&
    (AI_MANAGER_X402_DELIVERY_STATUSES as readonly string[]).includes(value)
  );
}

export function serializePublicAiManagerProfile(
  row: PublicAiManagerAccountRow
): SerializedPublicAiManagerProfile | null {
  if (
    !isAiManagerStatus(row.status) ||
    row.status !== "ACTIVE" ||
    !row.slug ||
    !isAiManagerPublicVisibility(row.publicVisibility) ||
    row.publicVisibility !== "PUBLIC_BADGED" ||
    !isAiManagerArchetype(row.archetype) ||
    !isAiManagerTone(row.tone) ||
    !isAiManagerSupportStyle(row.supportStyle) ||
    !isAiManagerDisclosurePolicy(row.disclosurePolicy)
  ) {
    return null;
  }

  return {
    displayName: row.displayName,
    slug: row.slug,
    avatarAssetUrl: row.avatarAssetUrl,
    intro: row.intro,
    archetype: row.archetype,
    primaryLanguage: row.primaryLanguage,
    tone: row.tone,
    supportStyle: row.supportStyle,
    disclosurePolicy: row.disclosurePolicy,
    specialties: row.specialties,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializePublicAiManagerSupportActivities(
  rows: PublicAiManagerSupportActivityRow[]
): SerializedPublicAiManagerSupportActivity[] {
  return rows
    .map((row) => {
      if (row.billingState === "FAILED" || row.agentTask === null) {
        return null;
      }

      const taskType = toTaskType(row.agentTask.taskType);
      if (!taskType) {
        return null;
      }

      const copy = getAgentTaskTypeCopy(taskType);
      return {
        taskType,
        label: copy.label,
        helper: copy.helper ?? null,
        createdAt: row.createdAt.toISOString(),
      };
    })
    .filter(
      (row): row is SerializedPublicAiManagerSupportActivity => row !== null
    )
    .slice(0, 4);
}

export function serializeManagerDeskAiManagerSummary(
  row: ManagerDeskAiManagerRow
): SerializedManagerDeskAiManagerSummary | null {
  if (
    !isAiManagerStatus(row.status) ||
    !isAiManagerArchetype(row.archetype) ||
    !isAiManagerPublicVisibility(row.publicVisibility) ||
    !isAiManagerTone(row.tone) ||
    !isAiManagerSupportStyle(row.supportStyle) ||
    !isAiManagerDisclosurePolicy(row.disclosurePolicy)
  ) {
    return null;
  }

  const billingPolicyStatus =
    row.billingPolicy && isAiManagerBillingPolicyStatus(row.billingPolicy.status)
      ? row.billingPolicy.status
      : null;
  const freeTierScope =
    row.billingPolicy && isAiManagerFreeTierScope(row.billingPolicy.freeTierScope)
      ? row.billingPolicy.freeTierScope
      : null;
  const allowedBillableCapabilities =
    row.billingPolicy?.allowedBillableCapabilities.filter(
      isAiManagerBillableCapability
    ) ?? [];
  const availableAmount = row.budgetBalance
    ? Number(toDecimalString(row.budgetBalance.availableAmount))
    : 0;
  const hasBudget = Number.isFinite(availableAmount) && availableAmount > 0;

  const operatingMode: SerializedManagerDeskAiManagerOperatingMode =
    row.status !== "ACTIVE" || billingPolicyStatus === "PAUSED"
      ? "INACTIVE"
      : row.billingPolicy?.autoPayEnabled && hasBudget
        ? "BILLABLE_ACTIVE"
        : "FREE_ONLY";

  return {
    displayName: row.displayName,
    status: row.status,
    publicVisibility: row.publicVisibility,
    intro: row.intro,
    archetype: row.archetype,
    primaryLanguage: row.primaryLanguage,
    tone: row.tone,
    supportStyle: row.supportStyle,
    disclosurePolicy: row.disclosurePolicy,
    specialties: row.specialties,
    billingPolicyStatus,
    freeTierScope,
    allowedBillableCapabilities,
    operatingMode,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeAiManagerAccount(args: {
  row: AiManagerAccountRow;
  ownerControlWalletAddress: string | null;
  reconciliation?: SerializedAiManagerReconciliationSummary;
}): SerializedAiManagerAccount {
  const { row } = args;
  const recentPaymentAttemptEvents = row.paymentAttemptEvents
    .map((entry) => {
      if (
        !isAiManagerPaymentAttemptEventSource(entry.source) ||
        !isAiManagerPaymentAttemptEventType(entry.eventType) ||
        !isAiManagerPaymentAttemptStatus(entry.status) ||
        !isAiManagerPaymentAttemptRail(entry.paymentAttempt.rail) ||
        !isAiManagerBillableCapability(entry.paymentAttempt.usageRecord.capability)
      ) {
        return null;
      }

      return {
        id: entry.id,
        paymentAttemptId: entry.paymentAttempt.id,
        usageId: entry.paymentAttempt.usageRecord.id,
        source: entry.source,
        eventType: entry.eventType,
        status: entry.status,
        rail: entry.paymentAttempt.rail,
        capability: entry.paymentAttempt.usageRecord.capability,
        taskType: entry.paymentAttempt.usageRecord.agentTask?.taskType ?? null,
        txHash: entry.txHash,
        detail: entry.detail,
        createdAt: entry.createdAt.toISOString(),
      };
    })
    .filter(
      (entry): entry is SerializedAiManagerPaymentAttemptEvent => entry !== null
    );
  const recoverySummary = deriveAiManagerX402RecoverySummary({
    recentPaymentAttemptEvents,
  });
  const baseReconciliation =
    args.reconciliation ?? buildEmptyAiManagerReconciliationSummary();

  return {
    id: row.id,
    creatorProfileId: row.creatorProfileId.toString(),
    ownerControlWalletAddress: args.ownerControlWalletAddress,
    status: isAiManagerStatus(row.status) ? row.status : "DRAFT",
    displayName: row.displayName,
    slug: row.slug,
    avatarAssetUrl: row.avatarAssetUrl,
    intro: row.intro,
    archetype: isAiManagerArchetype(row.archetype)
      ? row.archetype
      : "GENTLE_SUPPORTER",
    publicVisibility: isAiManagerPublicVisibility(row.publicVisibility)
      ? row.publicVisibility
      : "OWNER_ONLY",
    primaryLanguage: row.primaryLanguage,
    tone: isAiManagerTone(row.tone) ? row.tone : "FRIENDLY",
    supportStyle: isAiManagerSupportStyle(row.supportStyle)
      ? row.supportStyle
      : "ENCOURAGING",
    disclosurePolicy: isAiManagerDisclosurePolicy(row.disclosurePolicy)
      ? row.disclosurePolicy
      : "ALWAYS_DISCLOSE_AI",
    managerActivityWalletAddress: row.managerActivityWalletAddress,
    budgetWalletAddress: row.budgetWalletAddress,
    specialties: row.specialties,
    forbiddenTopics: row.forbiddenTopics,
    brandGuardrails: row.brandGuardrails,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    billingPolicy: row.billingPolicy
      ? {
          status: isAiManagerBillingPolicyStatus(row.billingPolicy.status)
            ? row.billingPolicy.status
            : "ACTIVE",
          billingMode: isAiManagerBillingMode(row.billingPolicy.billingMode)
            ? row.billingPolicy.billingMode
            : "MANUAL_TOPUP",
          preferredRail: isAiManagerPaymentRail(row.billingPolicy.preferredRail)
            ? row.billingPolicy.preferredRail
            : "X402_PREFERRED",
          currency: row.billingPolicy.currency,
          freeTierEnabled: row.billingPolicy.freeTierEnabled,
          freeTierScope: isAiManagerFreeTierScope(row.billingPolicy.freeTierScope)
            ? row.billingPolicy.freeTierScope
            : "BRIEFING_AND_LIGHT_DRAFTS",
          autoPayEnabled: row.billingPolicy.autoPayEnabled,
          monthlyJpycCap: row.billingPolicy.monthlyJpycCap,
          dailyJpycCap: row.billingPolicy.dailyJpycCap,
          perActionJpycCap: row.billingPolicy.perActionJpycCap,
          allowedBillableCapabilities:
            row.billingPolicy.allowedBillableCapabilities.filter(
              isAiManagerBillableCapability
            ),
          pausedAt: row.billingPolicy.pausedAt?.toISOString() ?? null,
          pauseReason: row.billingPolicy.pauseReason,
        }
      : null,
    budgetBalance: row.budgetBalance
      ? {
          currency: row.budgetBalance.currency,
          availableAmount: toDecimalString(row.budgetBalance.availableAmount),
          reservedAmount: toDecimalString(row.budgetBalance.reservedAmount),
          updatedAt: row.budgetBalance.updatedAt.toISOString(),
        }
      : null,
    recentUsageRecords: row.usageRecords
      .map((usage) => {
        if (
          !isAiManagerBillableCapability(usage.capability) ||
          !isAiManagerUsageBillingState(usage.billingState)
        ) {
          return null;
        }

        const latestAttempt = usage.paymentAttempts[0] ?? null;
        const serializedAttempt =
          latestAttempt &&
          isAiManagerPaymentAttemptRail(latestAttempt.rail) &&
          isAiManagerPaymentAttemptStatus(latestAttempt.status)
            ? {
                id: latestAttempt.id,
                rail: latestAttempt.rail,
                status: latestAttempt.status,
                payerWalletAddress: latestAttempt.payerWalletAddress,
                currency: latestAttempt.currency,
                amount: toDecimalString(latestAttempt.amount),
                txHash: latestAttempt.txHash,
                payeeWalletAddress: latestAttempt.payeeWalletAddress,
                failureReason: latestAttempt.failureReason,
                createdAt: latestAttempt.createdAt.toISOString(),
                confirmedAt: latestAttempt.confirmedAt?.toISOString() ?? null,
              }
            : null;

        return {
          id: usage.id,
          capability: usage.capability,
          provider: usage.provider,
          model: usage.model,
          taskType: usage.agentTask?.taskType ?? null,
          currency: usage.currency,
          chargeAmount: toDecimalString(usage.chargeAmount),
          providerCostUsd: toDecimalString(usage.providerCostUsd),
          platformFeeUsd: toDecimalString(usage.platformFeeUsd),
          totalChargeUsd: toDecimalString(usage.totalChargeUsd),
          billingState: usage.billingState,
          failureReason: usage.failureReason,
          createdAt: usage.createdAt.toISOString(),
          latestPaymentAttempt: serializedAttempt,
        };
      })
      .filter(
        (usage): usage is SerializedAiManagerUsageRecord => usage !== null
      ),
    recentBudgetTransactions: row.budgetTransactions
      .map((entry) => {
        if (
          !isAiManagerBudgetTransactionDirection(entry.direction) ||
          !isAiManagerBudgetTransactionType(entry.transactionType)
        ) {
          return null;
        }

        return {
          id: entry.id,
          direction: entry.direction,
          transactionType: entry.transactionType,
          currency: entry.currency,
          amount: toDecimalString(entry.amount),
          resultingAvailableAmount: toDecimalString(entry.resultingAvailableAmount),
          note: entry.note,
          actorAddress: entry.actorAddress,
          createdAt: entry.createdAt.toISOString(),
        };
      })
      .filter(
        (entry): entry is SerializedAiManagerBudgetTransaction => entry !== null
      ),
    recentFundingEvidences: row.fundingEvidences
      .map((entry) => {
        if (!isAiManagerFundingEvidenceStatus(entry.status)) {
          return null;
        }

        return {
          id: entry.id,
          status: entry.status,
          chainId: entry.chainId,
          currency: entry.currency,
          amount: toDecimalString(entry.amount),
          txHash: entry.txHash,
          fromWalletAddress: entry.fromWalletAddress,
          toWalletAddress: entry.toWalletAddress,
          reportedByAddress: entry.reportedByAddress,
          note: entry.note,
          createdAt: entry.createdAt.toISOString(),
          matchedAt: entry.matchedAt?.toISOString() ?? null,
          matchedBudgetTransactionId: entry.matchedBudgetTransactionId,
        };
      })
      .filter(
        (entry): entry is SerializedAiManagerFundingEvidence => entry !== null
      ),
    recentPaymentAttemptEvents,
    reconciliation: {
      ...baseReconciliation,
      recoveryCount: recoverySummary.count,
      latestRecoveryLabel: recoverySummary.latestRecoveryLabel,
      latestRecoverySourceLabel: recoverySummary.latestSourceLabel,
      latestRecoveryCreatedAt: recoverySummary.latestCreatedAt,
      recoveryConnectorCount: recoverySummary.connectorCount,
      recoveryOwnerReviewCount: recoverySummary.ownerReviewCount,
      recoveryBillingSystemCount: recoverySummary.billingSystemCount,
    },
  };
}

export function parseAiManagerAccount(
  value: unknown
): SerializedAiManagerAccount | null {
  if (!isRecord(value)) return null;

  const id = toOptionalString(value.id);
  const creatorProfileId = toOptionalString(value.creatorProfileId);
  const ownerControlWalletAddress =
    value.ownerControlWalletAddress === null
      ? null
      : toOptionalString(value.ownerControlWalletAddress);
  const status = value.status;
  const displayName = toOptionalString(value.displayName);
  const slug = value.slug === null ? null : toOptionalString(value.slug);
  const avatarAssetUrl =
    value.avatarAssetUrl === null ? null : toOptionalString(value.avatarAssetUrl);
  const intro = value.intro === null ? null : toOptionalString(value.intro);
  const archetype = value.archetype;
  const publicVisibility = value.publicVisibility;
  const primaryLanguage = toOptionalString(value.primaryLanguage);
  const tone = value.tone;
  const supportStyle = value.supportStyle;
  const disclosurePolicy = value.disclosurePolicy;
  const managerActivityWalletAddress =
    value.managerActivityWalletAddress === null
      ? null
      : toOptionalString(value.managerActivityWalletAddress);
  const budgetWalletAddress =
    value.budgetWalletAddress === null
      ? null
      : toOptionalString(value.budgetWalletAddress);
  const specialties = toStringArray(value.specialties);
  const forbiddenTopics = toStringArray(value.forbiddenTopics);
  const brandGuardrails = toStringArray(value.brandGuardrails);
  const createdAt = toOptionalString(value.createdAt);
  const updatedAt = toOptionalString(value.updatedAt);

  if (
    !id ||
    !creatorProfileId ||
    !isAiManagerStatus(status) ||
    !displayName ||
    !isAiManagerArchetype(archetype) ||
    !isAiManagerPublicVisibility(publicVisibility) ||
    !primaryLanguage ||
    !isAiManagerTone(tone) ||
    !isAiManagerSupportStyle(supportStyle) ||
    !isAiManagerDisclosurePolicy(disclosurePolicy) ||
    specialties === null ||
    forbiddenTopics === null ||
    brandGuardrails === null ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  let billingPolicy: SerializedAiManagerBillingPolicy | null = null;
  if (value.billingPolicy !== null) {
    if (!isRecord(value.billingPolicy)) return null;
    const status = value.billingPolicy.status;
    const billingMode = value.billingPolicy.billingMode;
    const preferredRail = value.billingPolicy.preferredRail;
    const currency = toOptionalString(value.billingPolicy.currency);
    const freeTierEnabled = value.billingPolicy.freeTierEnabled;
    const freeTierScope = value.billingPolicy.freeTierScope;
    const autoPayEnabled = value.billingPolicy.autoPayEnabled;
    const monthlyJpycCap = value.billingPolicy.monthlyJpycCap;
    const dailyJpycCap = value.billingPolicy.dailyJpycCap;
    const perActionJpycCap = value.billingPolicy.perActionJpycCap;
    const allowedBillableCapabilities = toStringArray(
      value.billingPolicy.allowedBillableCapabilities
    );
    const pausedAt =
      value.billingPolicy.pausedAt === null
        ? null
        : toOptionalString(value.billingPolicy.pausedAt);
    const pauseReason =
      value.billingPolicy.pauseReason === null
        ? null
        : toOptionalString(value.billingPolicy.pauseReason);
    if (
      !isAiManagerBillingPolicyStatus(status) ||
      !isAiManagerBillingMode(billingMode) ||
      !isAiManagerPaymentRail(preferredRail) ||
      !currency ||
      typeof freeTierEnabled !== "boolean" ||
      !isAiManagerFreeTierScope(freeTierScope) ||
      typeof autoPayEnabled !== "boolean" ||
      typeof monthlyJpycCap !== "number" ||
      typeof dailyJpycCap !== "number" ||
      typeof perActionJpycCap !== "number" ||
      allowedBillableCapabilities === null
    ) {
      return null;
    }
    billingPolicy = {
      status,
      billingMode,
      preferredRail,
      currency,
      freeTierEnabled,
      freeTierScope,
      autoPayEnabled,
      monthlyJpycCap,
      dailyJpycCap,
      perActionJpycCap,
      allowedBillableCapabilities: allowedBillableCapabilities.filter(
        isAiManagerBillableCapability
      ),
      pausedAt: pausedAt ?? null,
      pauseReason: pauseReason ?? null,
    };
  }

  let budgetBalance: SerializedAiManagerBudgetBalance | null = null;
  if (value.budgetBalance !== null) {
    if (!isRecord(value.budgetBalance)) return null;
    const currency = toOptionalString(value.budgetBalance.currency);
    const availableAmount = toOptionalString(value.budgetBalance.availableAmount);
    const reservedAmount = toOptionalString(value.budgetBalance.reservedAmount);
    const updatedAt = toOptionalString(value.budgetBalance.updatedAt);
    if (!currency || !availableAmount || !reservedAmount || !updatedAt) {
      return null;
    }
    budgetBalance = {
      currency,
      availableAmount,
      reservedAmount,
      updatedAt,
    };
  }

  if (!Array.isArray(value.recentUsageRecords)) {
    return null;
  }

  const recentUsageRecords = value.recentUsageRecords
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const usageId = toOptionalString(entry.id);
      const capability = entry.capability;
      const provider = toOptionalString(entry.provider);
      const model = entry.model === null ? null : toOptionalString(entry.model);
      const taskType = entry.taskType === null ? null : toOptionalString(entry.taskType);
      const currency = toOptionalString(entry.currency);
      const chargeAmount = toOptionalString(entry.chargeAmount);
      const providerCostUsd = toOptionalString(entry.providerCostUsd);
      const platformFeeUsd = toOptionalString(entry.platformFeeUsd);
      const totalChargeUsd = toOptionalString(entry.totalChargeUsd);
      const billingState = entry.billingState;
      const failureReason =
        entry.failureReason === null ? null : toOptionalString(entry.failureReason);
      const createdAt = toOptionalString(entry.createdAt);
      const latestPaymentAttemptValue = entry.latestPaymentAttempt;

      if (
        !usageId ||
        !isAiManagerBillableCapability(capability) ||
        !provider ||
        !currency ||
        !chargeAmount ||
        !providerCostUsd ||
        !platformFeeUsd ||
        !totalChargeUsd ||
        !isAiManagerUsageBillingState(billingState) ||
        !createdAt
      ) {
        return null;
      }

      let latestPaymentAttempt: SerializedAiManagerPaymentAttempt | null = null;
      if (latestPaymentAttemptValue !== null) {
        if (!isRecord(latestPaymentAttemptValue)) return null;
        const attemptId = toOptionalString(latestPaymentAttemptValue.id);
        const rail = latestPaymentAttemptValue.rail;
        const status = latestPaymentAttemptValue.status;
        const payerWalletAddress =
          latestPaymentAttemptValue.payerWalletAddress === null
            ? null
            : toOptionalString(latestPaymentAttemptValue.payerWalletAddress);
        const attemptCurrency = toOptionalString(latestPaymentAttemptValue.currency);
        const amount = toOptionalString(latestPaymentAttemptValue.amount);
        const txHash =
          latestPaymentAttemptValue.txHash === null
            ? null
            : toOptionalString(latestPaymentAttemptValue.txHash);
        const payeeWalletAddress =
          latestPaymentAttemptValue.payeeWalletAddress === null
            ? null
            : toOptionalString(latestPaymentAttemptValue.payeeWalletAddress);
        const attemptFailureReason =
          latestPaymentAttemptValue.failureReason === null
            ? null
            : toOptionalString(latestPaymentAttemptValue.failureReason);
        const attemptCreatedAt = toOptionalString(latestPaymentAttemptValue.createdAt);
        const confirmedAt =
          latestPaymentAttemptValue.confirmedAt === null
            ? null
            : toOptionalString(latestPaymentAttemptValue.confirmedAt);

        if (
          !attemptId ||
          !isAiManagerPaymentAttemptRail(rail) ||
          !isAiManagerPaymentAttemptStatus(status) ||
          !attemptCurrency ||
          !amount ||
          !attemptCreatedAt
        ) {
          return null;
        }

        latestPaymentAttempt = {
          id: attemptId,
          rail,
          status,
          payerWalletAddress: payerWalletAddress ?? null,
          currency: attemptCurrency,
          amount,
          txHash: txHash ?? null,
          payeeWalletAddress: payeeWalletAddress ?? null,
          failureReason: attemptFailureReason ?? null,
          createdAt: attemptCreatedAt,
          confirmedAt: confirmedAt ?? null,
        };
      }

      return {
        id: usageId,
        capability,
        provider,
        model: model ?? null,
        taskType: taskType ?? null,
        currency,
        chargeAmount,
        providerCostUsd,
        platformFeeUsd,
        totalChargeUsd,
        billingState,
        failureReason: failureReason ?? null,
        createdAt,
        latestPaymentAttempt,
      };
    })
    .filter((entry): entry is SerializedAiManagerUsageRecord => entry !== null);

  if (!Array.isArray(value.recentBudgetTransactions)) {
    return null;
  }

  const recentBudgetTransactions = value.recentBudgetTransactions
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const id = toOptionalString(entry.id);
      const direction = entry.direction;
      const transactionType = entry.transactionType;
      const currency = toOptionalString(entry.currency);
      const amount = toOptionalString(entry.amount);
      const resultingAvailableAmount = toOptionalString(entry.resultingAvailableAmount);
      const note = entry.note === null ? null : toOptionalString(entry.note);
      const actorAddress =
        entry.actorAddress === null ? null : toOptionalString(entry.actorAddress);
      const createdAt = toOptionalString(entry.createdAt);

      if (
        !id ||
        !isAiManagerBudgetTransactionDirection(direction) ||
        !isAiManagerBudgetTransactionType(transactionType) ||
        !currency ||
        !amount ||
        !resultingAvailableAmount ||
        !createdAt
      ) {
        return null;
      }

      return {
        id,
        direction,
        transactionType,
        currency,
        amount,
        resultingAvailableAmount,
        note: note ?? null,
        actorAddress: actorAddress ?? null,
        createdAt,
      };
    })
    .filter(
      (entry): entry is SerializedAiManagerBudgetTransaction => entry !== null
    );

  if (!Array.isArray(value.recentFundingEvidences)) {
    return null;
  }

  const recentFundingEvidences = value.recentFundingEvidences
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const id = toOptionalString(entry.id);
      const status = entry.status;
      const chainId = entry.chainId;
      const currency = toOptionalString(entry.currency);
      const amount = toOptionalString(entry.amount);
      const txHash = toOptionalString(entry.txHash);
      const fromWalletAddress =
        entry.fromWalletAddress === null
          ? null
          : toOptionalString(entry.fromWalletAddress);
      const toWalletAddress = toOptionalString(entry.toWalletAddress);
      const reportedByAddress =
        entry.reportedByAddress === null
          ? null
          : toOptionalString(entry.reportedByAddress);
      const note = entry.note === null ? null : toOptionalString(entry.note);
      const createdAt = toOptionalString(entry.createdAt);
      const matchedAt =
        entry.matchedAt === null ? null : toOptionalString(entry.matchedAt);
      const matchedBudgetTransactionId =
        entry.matchedBudgetTransactionId === null
          ? null
          : toOptionalString(entry.matchedBudgetTransactionId);

      if (
        !id ||
        !isAiManagerFundingEvidenceStatus(status) ||
        typeof chainId !== "number" ||
        !Number.isInteger(chainId) ||
        chainId <= 0 ||
        !currency ||
        !amount ||
        !txHash ||
        !toWalletAddress ||
        !createdAt
      ) {
        return null;
      }

      return {
        id,
        status,
        chainId,
        currency,
        amount,
        txHash,
        fromWalletAddress: fromWalletAddress ?? null,
        toWalletAddress,
        reportedByAddress: reportedByAddress ?? null,
        note: note ?? null,
        createdAt,
        matchedAt: matchedAt ?? null,
        matchedBudgetTransactionId: matchedBudgetTransactionId ?? null,
      };
    })
    .filter((entry): entry is SerializedAiManagerFundingEvidence => entry !== null);

  const recentPaymentAttemptEventsRaw =
    value.recentPaymentAttemptEvents == null ? [] : value.recentPaymentAttemptEvents;
  if (!Array.isArray(recentPaymentAttemptEventsRaw)) {
    return null;
  }

  const recentPaymentAttemptEvents = recentPaymentAttemptEventsRaw
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const id = toOptionalString(entry.id);
      const paymentAttemptId = toOptionalString(entry.paymentAttemptId);
      const usageId = toOptionalString(entry.usageId);
      const source = entry.source;
      const eventType = entry.eventType;
      const status = entry.status;
      const rail = entry.rail;
      const capability = entry.capability;
      const taskType =
        entry.taskType === null ? null : toOptionalString(entry.taskType);
      const txHash = entry.txHash === null ? null : toOptionalString(entry.txHash);
      const detail = entry.detail === null ? null : toOptionalString(entry.detail);
      const createdAt = toOptionalString(entry.createdAt);

      if (
        !id ||
        !paymentAttemptId ||
        !usageId ||
        !isAiManagerPaymentAttemptEventSource(source) ||
        !isAiManagerPaymentAttemptEventType(eventType) ||
        !isAiManagerPaymentAttemptStatus(status) ||
        !isAiManagerPaymentAttemptRail(rail) ||
        !isAiManagerBillableCapability(capability) ||
        !createdAt
      ) {
        return null;
      }

      return {
        id,
        paymentAttemptId,
        usageId,
        source,
        eventType,
        status,
        rail,
        capability,
        taskType: taskType ?? null,
        txHash: txHash ?? null,
        detail: detail ?? null,
        createdAt,
      };
    })
    .filter(
      (entry): entry is SerializedAiManagerPaymentAttemptEvent => entry !== null
    );

  let reconciliation = buildEmptyAiManagerReconciliationSummary();
  if (value.reconciliation != null) {
    if (!isRecord(value.reconciliation)) return null;
    const pendingX402Count = value.reconciliation.pendingX402Count;
    const pendingX402Amount = toOptionalString(value.reconciliation.pendingX402Amount);
    const oldestPendingX402CreatedAt =
      value.reconciliation.oldestPendingX402CreatedAt === null
        ? null
        : toOptionalString(value.reconciliation.oldestPendingX402CreatedAt);
    const pendingX402DeliveryStatus =
      value.reconciliation.pendingX402DeliveryStatus;
    const pendingX402DeliveryHint =
      value.reconciliation.pendingX402DeliveryHint === null
        ? null
        : toOptionalString(value.reconciliation.pendingX402DeliveryHint);
    const latestPendingX402EventAt =
      value.reconciliation.latestPendingX402EventAt === null
        ? null
        : toOptionalString(value.reconciliation.latestPendingX402EventAt);
    const latestPendingX402EventSource =
      value.reconciliation.latestPendingX402EventSource ?? null;
    const latestPendingX402EventType =
      value.reconciliation.latestPendingX402EventType ?? null;
    const failedX402Count = value.reconciliation.failedX402Count;
    const failedX402Amount = toOptionalString(value.reconciliation.failedX402Amount);
    const unmatchedFundingEvidenceCount =
      value.reconciliation.unmatchedFundingEvidenceCount;
    const unmatchedFundingEvidenceAmount = toOptionalString(
      value.reconciliation.unmatchedFundingEvidenceAmount
    );
    const latestConfirmedX402At =
      value.reconciliation.latestConfirmedX402At === null
        ? null
        : toOptionalString(value.reconciliation.latestConfirmedX402At);
    const recoveryCount = value.reconciliation.recoveryCount ?? 0;
    const latestRecoveryLabel =
      value.reconciliation.latestRecoveryLabel === null ||
      value.reconciliation.latestRecoveryLabel === undefined
        ? null
        : toOptionalString(value.reconciliation.latestRecoveryLabel);
    const latestRecoverySourceLabel =
      value.reconciliation.latestRecoverySourceLabel === null ||
      value.reconciliation.latestRecoverySourceLabel === undefined
        ? null
        : toOptionalString(value.reconciliation.latestRecoverySourceLabel);
    const latestRecoveryCreatedAt =
      value.reconciliation.latestRecoveryCreatedAt === null ||
      value.reconciliation.latestRecoveryCreatedAt === undefined
        ? null
        : toOptionalString(value.reconciliation.latestRecoveryCreatedAt);
    const recoveryConnectorCount =
      value.reconciliation.recoveryConnectorCount ?? 0;
    const recoveryOwnerReviewCount =
      value.reconciliation.recoveryOwnerReviewCount ?? 0;
    const recoveryBillingSystemCount =
      value.reconciliation.recoveryBillingSystemCount ?? 0;
    const requiresAttention = value.reconciliation.requiresAttention;

    if (
      typeof pendingX402Count !== "number" ||
      !Number.isInteger(pendingX402Count) ||
      pendingX402Count < 0 ||
      !pendingX402Amount ||
      !isAiManagerX402DeliveryStatus(pendingX402DeliveryStatus) ||
      (latestPendingX402EventSource !== null &&
        !isAiManagerPaymentAttemptEventSource(latestPendingX402EventSource)) ||
      (latestPendingX402EventType !== null &&
        !isAiManagerPaymentAttemptEventType(latestPendingX402EventType)) ||
      typeof failedX402Count !== "number" ||
      !Number.isInteger(failedX402Count) ||
      failedX402Count < 0 ||
      !failedX402Amount ||
      typeof unmatchedFundingEvidenceCount !== "number" ||
      !Number.isInteger(unmatchedFundingEvidenceCount) ||
      unmatchedFundingEvidenceCount < 0 ||
      !unmatchedFundingEvidenceAmount ||
      typeof recoveryCount !== "number" ||
      !Number.isInteger(recoveryCount) ||
      recoveryCount < 0 ||
      (latestRecoveryLabel !== null && !latestRecoveryLabel) ||
      (latestRecoverySourceLabel !== null && !latestRecoverySourceLabel) ||
      (latestRecoveryCreatedAt !== null && !latestRecoveryCreatedAt) ||
      typeof recoveryConnectorCount !== "number" ||
      !Number.isInteger(recoveryConnectorCount) ||
      recoveryConnectorCount < 0 ||
      typeof recoveryOwnerReviewCount !== "number" ||
      !Number.isInteger(recoveryOwnerReviewCount) ||
      recoveryOwnerReviewCount < 0 ||
      typeof recoveryBillingSystemCount !== "number" ||
      !Number.isInteger(recoveryBillingSystemCount) ||
      recoveryBillingSystemCount < 0 ||
      typeof requiresAttention !== "boolean"
    ) {
      return null;
    }

    reconciliation = {
      pendingX402Count,
      pendingX402Amount,
      oldestPendingX402CreatedAt: oldestPendingX402CreatedAt ?? null,
      pendingX402DeliveryStatus,
      pendingX402DeliveryHint: pendingX402DeliveryHint ?? null,
      latestPendingX402EventAt: latestPendingX402EventAt ?? null,
      latestPendingX402EventSource: latestPendingX402EventSource ?? null,
      latestPendingX402EventType: latestPendingX402EventType ?? null,
      failedX402Count,
      failedX402Amount,
      unmatchedFundingEvidenceCount,
      unmatchedFundingEvidenceAmount,
      latestConfirmedX402At: latestConfirmedX402At ?? null,
      recoveryCount,
      latestRecoveryLabel: latestRecoveryLabel ?? null,
      latestRecoverySourceLabel: latestRecoverySourceLabel ?? null,
      latestRecoveryCreatedAt: latestRecoveryCreatedAt ?? null,
      recoveryConnectorCount,
      recoveryOwnerReviewCount,
      recoveryBillingSystemCount,
      requiresAttention,
    };
  }

  return {
    id,
    creatorProfileId,
    ownerControlWalletAddress: ownerControlWalletAddress ?? null,
    status,
    displayName,
    slug: slug ?? null,
    avatarAssetUrl: avatarAssetUrl ?? null,
    intro: intro ?? null,
    archetype,
    publicVisibility,
    primaryLanguage,
    tone,
    supportStyle,
    disclosurePolicy,
    managerActivityWalletAddress: managerActivityWalletAddress ?? null,
    budgetWalletAddress: budgetWalletAddress ?? null,
    specialties,
    forbiddenTopics,
    brandGuardrails,
    createdAt,
    updatedAt,
    billingPolicy,
    budgetBalance,
    recentUsageRecords,
    recentBudgetTransactions,
    recentFundingEvidences,
    recentPaymentAttemptEvents,
    reconciliation,
  };
}

export function parseAiManagerFundingInstructions(
  value: unknown
): SerializedAiManagerFundingInstructions | null {
  if (!isRecord(value)) return null;

  const ownerControlWalletAddress =
    value.ownerControlWalletAddress === null
      ? null
      : toOptionalString(value.ownerControlWalletAddress);
  const budgetWalletAddress =
    value.budgetWalletAddress === null
      ? null
      : toOptionalString(value.budgetWalletAddress);
  const payeeId = toOptionalString(value.payeeId);
  const payeeLabel = toOptionalString(value.payeeLabel);
  const payeeVerificationStatus = value.payeeVerificationStatus;
  const platformOperationsWalletAddress =
    value.platformOperationsWalletAddress === null
      ? null
      : toOptionalString(value.platformOperationsWalletAddress);
  const currency = toOptionalString(value.currency);
  const chainId = value.chainId;
  const chainName = toOptionalString(value.chainName);
  const chainShortName = toOptionalString(value.chainShortName);
  const tokenSymbol = toOptionalString(value.tokenSymbol);
  const tokenAddress =
    value.tokenAddress === null ? null : toOptionalString(value.tokenAddress);
  const preferredRail = value.preferredRail;
  const activeSettlementRail = value.activeSettlementRail;
  const x402Status = value.x402Status;
  const x402EndpointUrl =
    value.x402EndpointUrl === null
      ? null
      : toOptionalString(value.x402EndpointUrl);
  const referenceCode = toOptionalString(value.referenceCode);
  const steps = toStringArray(value.steps);
  const warnings = toStringArray(value.warnings);

  if (
    !payeeId ||
    !payeeLabel ||
    !isAiManagerPayeeVerificationStatus(payeeVerificationStatus) ||
    !currency ||
    typeof chainId !== "number" ||
    !Number.isInteger(chainId) ||
    chainId <= 0 ||
    !chainName ||
    !chainShortName ||
    !tokenSymbol ||
    !isAiManagerPaymentRail(preferredRail) ||
    !isAiManagerPaymentAttemptRail(activeSettlementRail) ||
    !isAiManagerFundingX402Status(x402Status) ||
    !referenceCode ||
    steps === null ||
    warnings === null
  ) {
    return null;
  }

  return {
    ownerControlWalletAddress: ownerControlWalletAddress ?? null,
    budgetWalletAddress: budgetWalletAddress ?? null,
    payeeId,
    payeeLabel,
    payeeVerificationStatus,
    platformOperationsWalletAddress: platformOperationsWalletAddress ?? null,
    currency,
    chainId,
    chainName,
    chainShortName,
    tokenSymbol,
    tokenAddress: tokenAddress ?? null,
    preferredRail,
    activeSettlementRail,
    x402Status,
    x402EndpointUrl: x402EndpointUrl ?? null,
    referenceCode,
    steps,
    warnings,
  };
}

export function parseAiManagerAccountList(
  value: unknown
): SerializedAiManagerAccount[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => parseAiManagerAccount(item))
    .filter((item): item is SerializedAiManagerAccount => item !== null);
}

export const AI_MANAGER_DEFAULT_ALLOWED_CAPABILITIES =
  AI_MANAGER_BILLABLE_CAPABILITIES satisfies readonly AiManagerBillableCapability[];
