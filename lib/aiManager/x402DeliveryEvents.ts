import type {
  SerializedAiManagerAccount,
  SerializedAiManagerPaymentAttemptEvent,
} from "@/lib/serializers/aiManager";
import { getCapabilityLabel, getSourceLabel } from "@/lib/aiManager/labels";
import { getAgentTaskTypeCopy } from "@/lib/uxCopy";

export type SerializedAiManagerX402DeliveryEventItem = {
  id: string;
  paymentAttemptId: string;
  usageId: string;
  taskLabel: string | null;
  capabilityLabel: string;
  sourceLabel: string;
  eventLabel: string;
  detail: string | null;
  txHash: string | null;
  createdAt: string;
  /** PENDING_OBSERVED の場合、同じ paymentAttemptId で何回 check-in されたか */
  pendingObservedCount: number | null;
};

function getEventLabel(args: {
  eventType: SerializedAiManagerPaymentAttemptEvent["eventType"];
  status: SerializedAiManagerPaymentAttemptEvent["status"];
}): string {
  if (args.eventType === "ATTEMPT_CREATED") {
    return args.status === "PENDING" ? "settlement started" : "settled immediately";
  }

  if (args.eventType === "PENDING_OBSERVED") {
    return "pending observed";
  }

  if (args.eventType === "SETTLEMENT_CONFIRMED") {
    return "settlement confirmed";
  }

  if (args.eventType === "SETTLEMENT_FAILED") {
    return "settlement failed";
  }

  return "duplicate replay accepted";
}

export function deriveAiManagerX402DeliveryEvents(
  account: SerializedAiManagerAccount | null
): SerializedAiManagerX402DeliveryEventItem[] {
  if (!account) return [];

  const x402Events = account.recentPaymentAttemptEvents.filter(
    (entry) => entry.rail === "X402"
  );

  // paymentAttemptId ごとの PENDING_OBSERVED 回数を集計
  const pendingObservedCountByAttempt = new Map<string, number>();
  for (const entry of x402Events) {
    if (entry.eventType === "PENDING_OBSERVED") {
      pendingObservedCountByAttempt.set(
        entry.paymentAttemptId,
        (pendingObservedCountByAttempt.get(entry.paymentAttemptId) ?? 0) + 1
      );
    }
  }

  return x402Events
    .map((entry) => ({
      id: entry.id,
      paymentAttemptId: entry.paymentAttemptId,
      usageId: entry.usageId,
      taskLabel: entry.taskType ? getAgentTaskTypeCopy(entry.taskType).label : null,
      capabilityLabel: getCapabilityLabel(entry.capability),
      sourceLabel: getSourceLabel(entry.source),
      eventLabel: getEventLabel({
        eventType: entry.eventType,
        status: entry.status,
      }),
      detail: entry.detail,
      txHash: entry.txHash,
      createdAt: entry.createdAt,
      pendingObservedCount:
        entry.eventType === "PENDING_OBSERVED"
          ? (pendingObservedCountByAttempt.get(entry.paymentAttemptId) ?? 1)
          : null,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
