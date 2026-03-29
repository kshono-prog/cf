import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAiManagerBillingEnv } from "@/lib/env";
import {
  AI_MANAGER_CAPABILITY_CHARGES,
  isAiManagerBillableCapability,
  type AiManagerPaymentAttemptRail,
  type AiManagerBillableCapability,
} from "@/lib/aiManager/config";
import { resolveAiManagerSettlementRail } from "@/lib/aiManager/funding";
import { recordAiManagerPaymentAttemptEvent } from "@/lib/aiManager/paymentAttempts";
import { resolveAiManagerPlatformOperationsPayee } from "@/lib/aiManager/payeeRegistry";
import type { TaskType } from "@/lib/agentTaskParsers";
import { getTokenOnChain } from "@/lib/tokenRegistry";

const ACTOR_PROVIDER = "creator-founding-ai-office";
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

const FREE_TIER_TASK_TYPES = new Set<TaskType>([
  "MANAGER_NEXT_ACTIONS",
  "ANNOUNCEMENT_DRAFT",
  "SUPPORTER_MESSAGE_DRAFT",
]);

const BILLABLE_USAGE_STATES = [
  "METERED",
  "PAYMENT_PENDING",
  "SETTLED",
] as const;

const TASK_CAPABILITY_MAP: Partial<Record<TaskType, AiManagerBillableCapability>> = {
  MANAGER_NEXT_ACTIONS: "PROGRESS_SUMMARY",
  ANNOUNCEMENT_DRAFT: "POST_DRAFTING",
  SUPPORT_STORY_DRAFT: "POST_DRAFTING",
  PROPOSE: "POST_DRAFTING",
  SUPPORTER_MESSAGE_DRAFT: "FAN_REPLY_ASSIST",
  WEEKLY_REPORT: "PROGRESS_SUMMARY",
  SUPPORTER_RESULT_REPORT: "PROGRESS_SUMMARY",
  GROWTH_OPPORTUNITY_ALERT: "WEB_RESEARCH",
  CONTACT_INTELLIGENCE_ALERT: "WEB_RESEARCH",
};

const AI_MANAGER_BILLING_SELECT = {
  id: true,
  status: true,
  managerActivityWalletAddress: true,
  budgetWalletAddress: true,
  billingPolicy: {
    select: {
      status: true,
      billingMode: true,
      preferredRail: true,
      currency: true,
      freeTierEnabled: true,
      freeTierScope: true,
      autoPayEnabled: true,
      monthlyJpycCap: true,
      dailyJpycCap: true,
      perActionJpycCap: true,
      allowedBillableCapabilities: true,
      pausedAt: true,
      pauseReason: true,
    },
  },
  budgetBalance: {
    select: {
      currency: true,
      availableAmount: true,
      reservedAmount: true,
    },
  },
} as const;

type BillingDbClient = typeof prisma | Prisma.TransactionClient;

type BillingContext = Prisma.AiManagerAccountGetPayload<{
  select: typeof AI_MANAGER_BILLING_SELECT;
}>;

type BillingQuote = {
  capability: AiManagerBillableCapability;
  provider: string;
  model: string | null;
  currency: string;
  chargeAmount: Prisma.Decimal;
  providerCostUsd: Prisma.Decimal;
  platformFeeUsd: Prisma.Decimal;
  totalChargeUsd: Prisma.Decimal;
  payerWalletAddress: string | null;
  payeeWalletAddress: string | null;
  rail: AiManagerPaymentAttemptRail;
};

export type AiManagerTaskBillingErrorCode =
  | "AI_MANAGER_BILLING_PAUSED"
  | "AI_MANAGER_CAPABILITY_DISABLED"
  | "AI_MANAGER_AUTO_PAY_DISABLED"
  | "AI_MANAGER_BUDGET_REQUIRED"
  | "AI_MANAGER_ACTION_CAP_EXCEEDED"
  | "AI_MANAGER_DAILY_CAP_EXCEEDED"
  | "AI_MANAGER_MONTHLY_CAP_EXCEEDED";

export class AiManagerTaskBillingError extends Error {
  readonly code: AiManagerTaskBillingErrorCode;

  constructor(code: AiManagerTaskBillingErrorCode) {
    super(code);
    this.code = code;
    this.name = "AiManagerTaskBillingError";
  }
}

export type PreparedAiManagerTaskBilling =
  | { kind: "bypass" }
  | ({
      kind: "waived";
      aiManagerAccountId: string;
    } & BillingQuote)
  | ({
      kind: "bill";
      aiManagerAccountId: string;
    } & BillingQuote);

type BlockedAiManagerTaskBilling = {
  kind: "blocked";
  aiManagerAccountId: string;
  creatorProfileId: bigint;
  projectId: bigint | null;
  errorCode: AiManagerTaskBillingErrorCode;
  failureReason: string;
} & BillingQuote;

function startOfJstDay(date: Date): Date {
  const shifted = new Date(date.getTime() + JST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - JST_OFFSET_MS);
}

function startOfJstMonth(date: Date): Date {
  const shifted = new Date(date.getTime() + JST_OFFSET_MS);
  shifted.setUTCDate(1);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - JST_OFFSET_MS);
}

function toCapability(taskType: TaskType): AiManagerBillableCapability | null {
  return TASK_CAPABILITY_MAP[taskType] ?? null;
}

function shouldWaiveUsage(taskType: TaskType): boolean {
  return FREE_TIER_TASK_TYPES.has(taskType);
}

function buildQuote(
  context: BillingContext,
  capability: AiManagerBillableCapability
): BillingQuote {
  const pricing = AI_MANAGER_CAPABILITY_CHARGES[capability];
  const providerCostUsd = new Prisma.Decimal(pricing.providerCostUsd);
  const platformFeeUsd = new Prisma.Decimal(pricing.platformFeeUsd);
  const env = getAiManagerBillingEnv();
  const token = getTokenOnChain("JPYC", env.platformOperationsChainId);
  const payee = resolveAiManagerPlatformOperationsPayee({
    platformOperationsWalletAddress: env.platformOperationsWalletAddress,
    x402EndpointUrl: env.x402EndpointUrl,
  });
  const rail = resolveAiManagerSettlementRail({
    preferredRail: context.billingPolicy?.preferredRail ?? "X402_PREFERRED",
    payeeVerificationStatus: payee.verificationStatus,
    settlementTokenAddress: token?.address ?? null,
  }).activeSettlementRail;

  return {
    capability,
    provider: ACTOR_PROVIDER,
    model: pricing.model,
    currency: context.billingPolicy?.currency ?? "JPYC",
    chargeAmount: new Prisma.Decimal(pricing.chargeAmountJpyc),
    providerCostUsd,
    platformFeeUsd,
    totalChargeUsd: providerCostUsd.plus(platformFeeUsd),
    payerWalletAddress:
      context.budgetWalletAddress ?? context.managerActivityWalletAddress ?? null,
    payeeWalletAddress: payee.walletAddress,
    rail,
  };
}

async function loadBillingContext(
  db: BillingDbClient,
  creatorProfileId: bigint
): Promise<BillingContext | null> {
  return db.aiManagerAccount.findUnique({
    where: { creatorProfileId },
    select: AI_MANAGER_BILLING_SELECT,
  });
}

async function sumUsageCharges(args: {
  db: BillingDbClient;
  aiManagerAccountId: string;
  since: Date;
}): Promise<Prisma.Decimal> {
  const result = await args.db.aiManagerUsageRecord.aggregate({
    where: {
      aiManagerAccountId: args.aiManagerAccountId,
      billingState: {
        in: [...BILLABLE_USAGE_STATES],
      },
      createdAt: {
        gte: args.since,
      },
    },
    _sum: {
      chargeAmount: true,
    },
  });

  return result._sum.chargeAmount ?? new Prisma.Decimal(0);
}

function resolveBlockedDecision(args: {
  context: BillingContext;
  creatorProfileId: bigint;
  projectId: bigint | null;
  capability: AiManagerBillableCapability;
  errorCode: AiManagerTaskBillingErrorCode;
  failureReason: string;
}): BlockedAiManagerTaskBilling {
  return {
    kind: "blocked",
    aiManagerAccountId: args.context.id,
    creatorProfileId: args.creatorProfileId,
    projectId: args.projectId,
    errorCode: args.errorCode,
    failureReason: args.failureReason,
    ...buildQuote(args.context, args.capability),
  };
}

async function evaluateBillableDecision(args: {
  db: BillingDbClient;
  context: BillingContext;
  creatorProfileId: bigint;
  projectId: bigint | null;
  taskType: TaskType;
}): Promise<PreparedAiManagerTaskBilling | BlockedAiManagerTaskBilling> {
  const { context } = args;
  const capability = toCapability(args.taskType);
  if (!capability) {
    return { kind: "bypass" };
  }

  if (!context.billingPolicy || !context.budgetBalance) {
    return { kind: "bypass" };
  }

  if (context.status === "PAUSED" || context.billingPolicy.status === "PAUSED") {
    return resolveBlockedDecision({
      context,
      creatorProfileId: args.creatorProfileId,
      projectId: args.projectId,
      capability,
      errorCode: "AI_MANAGER_BILLING_PAUSED",
      failureReason:
        context.billingPolicy.pauseReason ??
        "AI Manager billing is paused for this creator.",
    });
  }

  const allowedCapabilities = context.billingPolicy.allowedBillableCapabilities.filter(
    isAiManagerBillableCapability
  );
  if (!allowedCapabilities.includes(capability)) {
    return resolveBlockedDecision({
      context,
      creatorProfileId: args.creatorProfileId,
      projectId: args.projectId,
      capability,
      errorCode: "AI_MANAGER_CAPABILITY_DISABLED",
      failureReason: `${capability} is not enabled for this AI manager.`,
    });
  }

  const quote = buildQuote(context, capability);

  if (
    context.billingPolicy.freeTierEnabled &&
    context.billingPolicy.freeTierScope === "BRIEFING_AND_LIGHT_DRAFTS" &&
    shouldWaiveUsage(args.taskType)
  ) {
    return {
      kind: "waived",
      aiManagerAccountId: context.id,
      ...quote,
    };
  }

  if (!context.billingPolicy.autoPayEnabled) {
    return resolveBlockedDecision({
      context,
      creatorProfileId: args.creatorProfileId,
      projectId: args.projectId,
      capability,
      errorCode: "AI_MANAGER_AUTO_PAY_DISABLED",
      failureReason: "Auto-pay is disabled for this AI manager.",
    });
  }

  const perActionCap = new Prisma.Decimal(context.billingPolicy.perActionJpycCap);
  if (quote.chargeAmount.gt(perActionCap)) {
    return resolveBlockedDecision({
      context,
      creatorProfileId: args.creatorProfileId,
      projectId: args.projectId,
      capability,
      errorCode: "AI_MANAGER_ACTION_CAP_EXCEEDED",
      failureReason: "Per-action cap exceeded.",
    });
  }

  const now = new Date();
  const [dailySpent, monthlySpent] = await Promise.all([
    sumUsageCharges({
      db: args.db,
      aiManagerAccountId: context.id,
      since: startOfJstDay(now),
    }),
    sumUsageCharges({
      db: args.db,
      aiManagerAccountId: context.id,
      since: startOfJstMonth(now),
    }),
  ]);

  const dailyCap = new Prisma.Decimal(context.billingPolicy.dailyJpycCap);
  if (dailySpent.plus(quote.chargeAmount).gt(dailyCap)) {
    return resolveBlockedDecision({
      context,
      creatorProfileId: args.creatorProfileId,
      projectId: args.projectId,
      capability,
      errorCode: "AI_MANAGER_DAILY_CAP_EXCEEDED",
      failureReason: "Daily AI manager budget cap exceeded.",
    });
  }

  const monthlyCap = new Prisma.Decimal(context.billingPolicy.monthlyJpycCap);
  if (monthlySpent.plus(quote.chargeAmount).gt(monthlyCap)) {
    return resolveBlockedDecision({
      context,
      creatorProfileId: args.creatorProfileId,
      projectId: args.projectId,
      capability,
      errorCode: "AI_MANAGER_MONTHLY_CAP_EXCEEDED",
      failureReason: "Monthly AI manager budget cap exceeded.",
    });
  }

  if (context.budgetBalance.availableAmount.lt(quote.chargeAmount)) {
    return resolveBlockedDecision({
      context,
      creatorProfileId: args.creatorProfileId,
      projectId: args.projectId,
      capability,
      errorCode: "AI_MANAGER_BUDGET_REQUIRED",
      failureReason: "AI manager budget balance is insufficient.",
    });
  }

  return {
    kind: "bill",
    aiManagerAccountId: context.id,
    ...quote,
  };
}

export async function prepareAiManagerTaskBilling(args: {
  creatorProfileId: bigint;
  projectId: bigint | null;
  taskType: TaskType;
}): Promise<PreparedAiManagerTaskBilling | BlockedAiManagerTaskBilling> {
  const context = await loadBillingContext(prisma, args.creatorProfileId);
  if (!context) {
    return { kind: "bypass" };
  }

  if (context.status !== "ACTIVE" && context.status !== "PAUSED") {
    return { kind: "bypass" };
  }

  return evaluateBillableDecision({
    db: prisma,
    context,
    creatorProfileId: args.creatorProfileId,
    projectId: args.projectId,
    taskType: args.taskType,
  });
}

export async function recordBlockedAiManagerTaskBilling(
  decision: BlockedAiManagerTaskBilling
): Promise<void> {
  await prisma.aiManagerUsageRecord.create({
    data: {
      aiManagerAccountId: decision.aiManagerAccountId,
      creatorProfileId: decision.creatorProfileId,
      projectId: decision.projectId,
      capability: decision.capability,
      provider: decision.provider,
      model: decision.model,
      currency: decision.currency,
      chargeAmount: decision.chargeAmount,
      providerCostUsd: decision.providerCostUsd,
      platformFeeUsd: decision.platformFeeUsd,
      totalChargeUsd: decision.totalChargeUsd,
      billingState: "FAILED",
      failureReason: decision.failureReason,
    },
  });
}

async function createUsageRecord(args: {
  db: Prisma.TransactionClient;
  billing: Exclude<PreparedAiManagerTaskBilling, { kind: "bypass" }>;
  creatorProfileId: bigint;
  projectId: bigint | null;
  agentTaskId: string;
  state: "WAIVED" | "FAILED" | "PAYMENT_PENDING" | "SETTLED";
  failureReason?: string;
}) {
  return args.db.aiManagerUsageRecord.create({
    data: {
      aiManagerAccountId: args.billing.aiManagerAccountId,
      creatorProfileId: args.creatorProfileId,
      projectId: args.projectId,
      agentTaskId: args.agentTaskId,
      capability: args.billing.capability,
      provider: args.billing.provider,
      model: args.billing.model,
      currency: args.billing.currency,
      chargeAmount: args.billing.chargeAmount,
      providerCostUsd: args.billing.providerCostUsd,
      platformFeeUsd: args.billing.platformFeeUsd,
      totalChargeUsd: args.billing.totalChargeUsd,
      billingState: args.state,
      failureReason: args.failureReason ?? null,
    },
    select: {
      id: true,
    },
  });
}

async function createBudgetTransaction(args: {
  db: Prisma.TransactionClient;
  aiManagerAccountId: string;
  creatorProfileId: bigint;
  usageRecordId: string | null;
  direction: "CREDIT" | "DEBIT";
  transactionType: "OWNER_TOP_UP" | "OWNER_DEDUCTION" | "USAGE_SETTLEMENT";
  currency: string;
  amount: Prisma.Decimal;
  resultingAvailableAmount: Prisma.Decimal;
  note: string | null;
  actorAddress: string | null;
}) {
  await args.db.aiManagerBudgetTransaction.create({
    data: {
      aiManagerAccountId: args.aiManagerAccountId,
      creatorProfileId: args.creatorProfileId,
      usageRecordId: args.usageRecordId,
      direction: args.direction,
      transactionType: args.transactionType,
      currency: args.currency,
      amount: args.amount,
      resultingAvailableAmount: args.resultingAvailableAmount,
      note: args.note,
      actorAddress: args.actorAddress,
    },
  });
}

export async function applyAiManagerTaskBilling(args: {
  db: Prisma.TransactionClient;
  billing: PreparedAiManagerTaskBilling;
  creatorProfileId: bigint;
  projectId: bigint | null;
  taskType: TaskType;
  agentTaskId: string;
}): Promise<void> {
  if (args.billing.kind === "bypass") {
    return;
  }

  if (args.billing.kind === "waived") {
    await createUsageRecord({
      db: args.db,
      billing: args.billing,
      creatorProfileId: args.creatorProfileId,
      projectId: args.projectId,
      agentTaskId: args.agentTaskId,
      state: "WAIVED",
      failureReason: "Covered by free-tier briefing/light draft scope.",
    });
    return;
  }

  const context = await loadBillingContext(args.db, args.creatorProfileId);
  if (!context || !context.billingPolicy || !context.budgetBalance) {
    throw new AiManagerTaskBillingError("AI_MANAGER_BILLING_PAUSED");
  }

  const revalidated = await evaluateBillableDecision({
    db: args.db,
    context,
    creatorProfileId: args.creatorProfileId,
    projectId: args.projectId,
    taskType: args.taskType,
  });

  if (revalidated.kind === "blocked") {
    const usage = await createUsageRecord({
      db: args.db,
      billing: args.billing,
      creatorProfileId: args.creatorProfileId,
      projectId: args.projectId,
      agentTaskId: args.agentTaskId,
      state: "FAILED",
      failureReason: revalidated.failureReason,
    });

    const failedAttempt = await args.db.aiManagerPaymentAttempt.create({
      data: {
        usageRecordId: usage.id,
        rail: args.billing.rail,
        payerWalletAddress: args.billing.payerWalletAddress,
        payeeWalletAddress: args.billing.payeeWalletAddress,
        currency: args.billing.currency,
        amount: args.billing.chargeAmount,
        status: "FAILED",
        failureReason: revalidated.failureReason,
      },
      select: {
        id: true,
        status: true,
        txHash: true,
      },
    });

    await recordAiManagerPaymentAttemptEvent({
      db: args.db,
      aiManagerAccountId: args.billing.aiManagerAccountId,
      paymentAttemptId: failedAttempt.id,
      source: "BILLING_SYSTEM",
      eventType: "SETTLEMENT_FAILED",
      status: failedAttempt.status,
      txHash: failedAttempt.txHash,
      detail: revalidated.failureReason,
    });

    throw new AiManagerTaskBillingError(revalidated.errorCode);
  }

  if (revalidated.kind !== "bill") {
    await createUsageRecord({
      db: args.db,
      billing: args.billing,
      creatorProfileId: args.creatorProfileId,
      projectId: args.projectId,
      agentTaskId: args.agentTaskId,
      state: "WAIVED",
      failureReason: "Covered by free-tier briefing/light draft scope.",
    });
    return;
  }

  const usage = await createUsageRecord({
    db: args.db,
    billing: revalidated,
    creatorProfileId: args.creatorProfileId,
    projectId: args.projectId,
    agentTaskId: args.agentTaskId,
    state: revalidated.rail === "X402" ? "PAYMENT_PENDING" : "SETTLED",
  });

  const paymentAttempt = await args.db.aiManagerPaymentAttempt.create({
    data: {
      usageRecordId: usage.id,
      rail: revalidated.rail,
      payerWalletAddress: revalidated.payerWalletAddress,
      payeeWalletAddress: revalidated.payeeWalletAddress,
      currency: revalidated.currency,
      amount: revalidated.chargeAmount,
      status: revalidated.rail === "X402" ? "PENDING" : "CONFIRMED",
      confirmedAt: revalidated.rail === "X402" ? null : new Date(),
    },
    select: {
      id: true,
      status: true,
      txHash: true,
    },
  });

  await recordAiManagerPaymentAttemptEvent({
    db: args.db,
    aiManagerAccountId: revalidated.aiManagerAccountId,
    paymentAttemptId: paymentAttempt.id,
    source: "BILLING_SYSTEM",
    eventType: "ATTEMPT_CREATED",
    status: paymentAttempt.status,
    txHash: paymentAttempt.txHash,
    detail:
      revalidated.rail === "X402"
        ? "x402 settlement pending callback."
        : "Internal ledger fallback settled immediately.",
  });

  const updatedBalance = await args.db.aiManagerBudgetBalance.update({
    where: {
      aiManagerAccountId: revalidated.aiManagerAccountId,
    },
    data: {
      availableAmount: {
        decrement: revalidated.chargeAmount,
      },
    },
    select: {
      availableAmount: true,
    },
  });

  await createBudgetTransaction({
    db: args.db,
    aiManagerAccountId: revalidated.aiManagerAccountId,
    creatorProfileId: args.creatorProfileId,
    usageRecordId: usage.id,
    direction: "DEBIT",
    transactionType: "USAGE_SETTLEMENT",
    currency: revalidated.currency,
    amount: revalidated.chargeAmount,
    resultingAvailableAmount: updatedBalance.availableAmount,
    note:
      revalidated.rail === "X402"
        ? `${revalidated.capability} usage metered; x402 confirmation pending`
        : `${revalidated.capability} usage settled`,
    actorAddress: revalidated.payerWalletAddress,
  });
}

export async function pauseAiManagerBillingAfterUnexpectedFailure(args: {
  billing: PreparedAiManagerTaskBilling;
  reason: string;
}): Promise<void> {
  if (args.billing.kind !== "bill") {
    return;
  }

  await prisma.aiManagerBillingPolicy.update({
    where: {
      aiManagerAccountId: args.billing.aiManagerAccountId,
    },
    data: {
      status: "PAUSED",
      pausedAt: new Date(),
      pauseReason: args.reason,
    },
  });
}
