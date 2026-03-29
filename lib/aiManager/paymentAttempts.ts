import "server-only";

import { Prisma } from "@prisma/client";
import type {
  AiManagerPaymentAttemptEventSource,
  AiManagerPaymentAttemptEventType,
  AiManagerPaymentAttemptStatus,
} from "@/lib/aiManager/config";

type PaymentAttemptDbClient = Prisma.TransactionClient;

export type AiManagerX402SettlementRequestStatus = "CONFIRMED" | "FAILED";

type PendingX402PaymentAttempt = {
  id: string;
  usageRecord: {
    id: string;
    aiManagerAccountId: string;
  };
};

type X402PaymentAttemptSnapshot = {
  id: string;
  rail: string;
  status: string;
  txHash: string | null;
  failureReason: string | null;
  confirmedAt: Date | null;
  usageRecord: {
    id: string;
    aiManagerAccountId: string;
  };
};

export type ResolvedAiManagerX402Replay = {
  paymentAttemptId: string;
  status: AiManagerPaymentAttemptStatus;
  txHash: string | null;
  failureReason: string | null;
  confirmedAt: Date | null;
};

type PendingObservationEventSnapshot = {
  source: AiManagerPaymentAttemptEventSource;
  eventType: AiManagerPaymentAttemptEventType;
  status: AiManagerPaymentAttemptStatus;
  createdAt: Date;
};

const AI_MANAGER_PENDING_OBSERVATION_SUPPRESSION_WINDOW_MS = 5 * 60 * 1000;

export async function recordAiManagerPaymentAttemptEvent(args: {
  db: PaymentAttemptDbClient;
  aiManagerAccountId: string;
  paymentAttemptId: string;
  source: AiManagerPaymentAttemptEventSource;
  eventType: AiManagerPaymentAttemptEventType;
  status: AiManagerPaymentAttemptStatus;
  txHash: string | null;
  detail: string | null;
  createdAt?: Date;
}): Promise<void> {
  await args.db.aiManagerPaymentAttemptEvent.create({
    data: {
      aiManagerAccountId: args.aiManagerAccountId,
      paymentAttemptId: args.paymentAttemptId,
      source: args.source,
      eventType: args.eventType,
      status: args.status,
      txHash: args.txHash,
      detail: args.detail,
      createdAt: args.createdAt,
    },
  });
}

export function shouldSuppressAiManagerPendingObservation(args: {
  latestEvent: PendingObservationEventSnapshot | null;
  observedAt: Date;
}): boolean {
  const { latestEvent, observedAt } = args;
  if (!latestEvent) {
    return false;
  }

  if (
    latestEvent.source !== "X402_CONNECTOR" ||
    latestEvent.eventType !== "PENDING_OBSERVED" ||
    latestEvent.status !== "PENDING"
  ) {
    return false;
  }

  return (
    observedAt.getTime() - latestEvent.createdAt.getTime() <
    AI_MANAGER_PENDING_OBSERVATION_SUPPRESSION_WINDOW_MS
  );
}

export function getAiManagerX402ReplayDisposition(args: {
  rail: string;
  currentStatus: string;
  requestedStatus: AiManagerX402SettlementRequestStatus;
  currentTxHash: string | null;
  requestedTxHash: string | null;
}): "PENDING" | "REPLAY_CONFIRMED" | "REPLAY_FAILED" | "INVALID" {
  if (args.rail !== "X402") {
    return "INVALID";
  }

  if (args.currentStatus === "PENDING") {
    return "PENDING";
  }

  if (
    args.requestedStatus === "CONFIRMED" &&
    args.currentStatus === "CONFIRMED" &&
    args.requestedTxHash &&
    args.currentTxHash === args.requestedTxHash
  ) {
    return "REPLAY_CONFIRMED";
  }

  if (
    args.requestedStatus === "FAILED" &&
    args.currentStatus === "FAILED"
  ) {
    return "REPLAY_FAILED";
  }

  return "INVALID";
}

async function getX402PaymentAttemptSnapshot(args: {
  db: PaymentAttemptDbClient;
  paymentAttemptId: string;
}): Promise<X402PaymentAttemptSnapshot | null> {
  return args.db.aiManagerPaymentAttempt.findUnique({
    where: {
      id: args.paymentAttemptId,
    },
    select: {
      id: true,
      createdAt: true,
      rail: true,
      status: true,
      txHash: true,
      failureReason: true,
      confirmedAt: true,
      usageRecord: {
        select: {
          id: true,
          aiManagerAccountId: true,
        },
      },
    },
  });
}

export async function resolveAiManagerX402PaymentAttemptReplay(args: {
  db: PaymentAttemptDbClient;
  paymentAttemptId: string;
  aiManagerAccountId: string;
  requestedStatus: AiManagerX402SettlementRequestStatus;
  requestedTxHash: string | null;
}): Promise<ResolvedAiManagerX402Replay | null> {
  const paymentAttempt = await getX402PaymentAttemptSnapshot(args);

  if (
    !paymentAttempt ||
    paymentAttempt.usageRecord.aiManagerAccountId !== args.aiManagerAccountId
  ) {
    throw new Error("AI_MANAGER_PAYMENT_ATTEMPT_NOT_FOUND");
  }

  if (paymentAttempt.rail !== "X402") {
    throw new Error("AI_MANAGER_PAYMENT_ATTEMPT_RAIL_INVALID");
  }

  const disposition = getAiManagerX402ReplayDisposition({
    rail: paymentAttempt.rail,
    currentStatus: paymentAttempt.status,
    requestedStatus: args.requestedStatus,
    currentTxHash: paymentAttempt.txHash,
    requestedTxHash: args.requestedTxHash,
  });

  if (disposition === "PENDING") {
    return null;
  }

  if (disposition === "INVALID") {
    throw new Error("AI_MANAGER_PAYMENT_ATTEMPT_STATE_INVALID");
  }

  return {
    paymentAttemptId: paymentAttempt.id,
    status: paymentAttempt.status as AiManagerPaymentAttemptStatus,
    txHash: paymentAttempt.txHash,
    failureReason: paymentAttempt.failureReason,
    confirmedAt: paymentAttempt.confirmedAt,
  };
}

export async function recordAiManagerX402PendingObservation(args: {
  db: PaymentAttemptDbClient;
  paymentAttemptId: string;
  aiManagerAccountId: string;
  observedAt: Date;
  detail: string | null;
}): Promise<{ recorded: boolean }> {
  const paymentAttempt = await requirePendingX402PaymentAttempt(args);

  const latestEvent = await args.db.aiManagerPaymentAttemptEvent.findFirst({
    where: {
      paymentAttemptId: paymentAttempt.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      source: true,
      eventType: true,
      status: true,
      createdAt: true,
    },
  });

  if (
    shouldSuppressAiManagerPendingObservation({
      latestEvent,
      observedAt: args.observedAt,
    })
  ) {
    return { recorded: false };
  }

  await recordAiManagerPaymentAttemptEvent({
    db: args.db,
    aiManagerAccountId: args.aiManagerAccountId,
    paymentAttemptId: paymentAttempt.id,
    source: "X402_CONNECTOR",
    eventType: "PENDING_OBSERVED",
    status: "PENDING",
    txHash: null,
    detail:
      args.detail ??
      "Connector polling observed this settlement is still pending.",
    createdAt: args.observedAt,
  });

  return { recorded: true };
}

async function requirePendingX402PaymentAttempt(args: {
  db: PaymentAttemptDbClient;
  paymentAttemptId: string;
  aiManagerAccountId: string;
}): Promise<PendingX402PaymentAttempt> {
  const paymentAttempt = await getX402PaymentAttemptSnapshot(args);

  if (
    !paymentAttempt ||
    paymentAttempt.usageRecord.aiManagerAccountId !== args.aiManagerAccountId
  ) {
    throw new Error("AI_MANAGER_PAYMENT_ATTEMPT_NOT_FOUND");
  }

  if (paymentAttempt.rail !== "X402") {
    throw new Error("AI_MANAGER_PAYMENT_ATTEMPT_RAIL_INVALID");
  }

  if (paymentAttempt.status !== "PENDING") {
    throw new Error("AI_MANAGER_PAYMENT_ATTEMPT_STATE_INVALID");
  }

  return paymentAttempt;
}

export async function confirmAiManagerX402PaymentAttempt(args: {
  db: PaymentAttemptDbClient;
  paymentAttemptId: string;
  aiManagerAccountId: string;
  txHash: string;
  confirmedAt: Date;
  source: AiManagerPaymentAttemptEventSource;
}): Promise<void> {
  const paymentAttempt = await requirePendingX402PaymentAttempt(args);

  const duplicateTxHash = await args.db.aiManagerPaymentAttempt.findFirst({
    where: {
      txHash: args.txHash,
      NOT: {
        id: paymentAttempt.id,
      },
    },
    select: {
      id: true,
    },
  });
  if (duplicateTxHash) {
    throw new Error("AI_MANAGER_PAYMENT_ATTEMPT_TX_HASH_DUPLICATE");
  }

  await args.db.aiManagerPaymentAttempt.update({
    where: {
      id: paymentAttempt.id,
    },
    data: {
      status: "CONFIRMED",
      txHash: args.txHash,
      failureReason: null,
      confirmedAt: args.confirmedAt,
    },
  });

  await args.db.aiManagerUsageRecord.update({
    where: {
      id: paymentAttempt.usageRecord.id,
    },
    data: {
      billingState: "SETTLED",
      failureReason: null,
    },
  });

  await recordAiManagerPaymentAttemptEvent({
    db: args.db,
    aiManagerAccountId: args.aiManagerAccountId,
    paymentAttemptId: paymentAttempt.id,
    source: args.source,
    eventType: "SETTLEMENT_CONFIRMED",
    status: "CONFIRMED",
    txHash: args.txHash,
    detail: null,
    createdAt: args.confirmedAt,
  });
}

export async function failAiManagerX402PaymentAttempt(args: {
  db: PaymentAttemptDbClient;
  paymentAttemptId: string;
  aiManagerAccountId: string;
  failureReason: string;
  failedAt: Date;
  source: AiManagerPaymentAttemptEventSource;
}): Promise<void> {
  const paymentAttempt = await requirePendingX402PaymentAttempt(args);

  await args.db.aiManagerPaymentAttempt.update({
    where: {
      id: paymentAttempt.id,
    },
    data: {
      status: "FAILED",
      failureReason: args.failureReason,
      confirmedAt: null,
    },
  });

  await args.db.aiManagerUsageRecord.update({
    where: {
      id: paymentAttempt.usageRecord.id,
    },
    data: {
      billingState: "FAILED",
      failureReason: args.failureReason,
    },
  });

  await args.db.aiManagerBillingPolicy.update({
    where: {
      aiManagerAccountId: args.aiManagerAccountId,
    },
    data: {
      status: "PAUSED",
      pausedAt: args.failedAt,
      pauseReason: `x402 settlement failed: ${args.failureReason}`,
    },
  });

  await recordAiManagerPaymentAttemptEvent({
    db: args.db,
    aiManagerAccountId: args.aiManagerAccountId,
    paymentAttemptId: paymentAttempt.id,
    source: args.source,
    eventType: "SETTLEMENT_FAILED",
    status: "FAILED",
    txHash: null,
    detail: args.failureReason,
    createdAt: args.failedAt,
  });
}
