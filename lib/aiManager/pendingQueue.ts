import type { SerializedAiManagerAccount } from "@/lib/serializers/aiManager";
import { deriveAiManagerX402DeliveryEvents } from "@/lib/aiManager/x402DeliveryEvents";
import { getCapabilityLabel } from "@/lib/aiManager/labels";
import { deriveAiManagerX402DeliveryStatus } from "@/lib/aiManager/reconciliationShared";
import { getAgentTaskTypeCopy } from "@/lib/uxCopy";

export type SerializedAiManagerPendingX402QueueItem = {
  usageId: string;
  paymentAttemptId: string;
  capability: string;
  capabilityLabel: string;
  taskType: string | null;
  taskLabel: string | null;
  amount: string;
  currency: string;
  createdAt: string;
  payerWalletAddress: string | null;
  payeeWalletAddress: string | null;
  deliveryStatus: "NONE" | "ACTIVE" | "WATCH" | "STALE";
  deliveryHint: string | null;
  lastEventLabel: string | null;
  lastEventSourceLabel: string | null;
  lastEventAt: string | null;
  lastEventDetail: string | null;
};

export function deriveAiManagerPendingX402Queue(
  account: SerializedAiManagerAccount | null
): SerializedAiManagerPendingX402QueueItem[] {
  if (!account) return [];

  const deliveryEvents = deriveAiManagerX402DeliveryEvents(account);

  return account.recentUsageRecords
    .filter(
      (usage) =>
        usage.latestPaymentAttempt?.rail === "X402" &&
        usage.latestPaymentAttempt.status === "PENDING"
    )
    .flatMap((usage) => {
      const attempt = usage.latestPaymentAttempt;
      if (!attempt) {
        return [];
      }

      const latestRawEvent =
        account.recentPaymentAttemptEvents
          .filter((entry) => entry.paymentAttemptId === attempt.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
      const delivery = deriveAiManagerX402DeliveryStatus({
        pendingX402Count: 1,
        oldestPendingX402CreatedAt: attempt.createdAt,
        latestPendingX402EventAt: latestRawEvent?.createdAt ?? null,
        latestPendingX402EventSource: latestRawEvent?.source ?? null,
        latestPendingX402EventType: latestRawEvent?.eventType ?? null,
      });
      const lastEvent =
        deliveryEvents.find((entry) => entry.paymentAttemptId === attempt.id) ?? null;

      return [
        {
          usageId: usage.id,
          paymentAttemptId: attempt.id,
          capability: usage.capability,
          capabilityLabel: getCapabilityLabel(usage.capability),
          taskType: usage.taskType,
          taskLabel: usage.taskType
            ? getAgentTaskTypeCopy(usage.taskType).label
            : null,
          amount: usage.chargeAmount,
          currency: usage.currency,
          createdAt: attempt.createdAt,
          payerWalletAddress: attempt.payerWalletAddress,
          payeeWalletAddress: attempt.payeeWalletAddress,
          deliveryStatus: delivery.status,
          deliveryHint: delivery.hint,
          lastEventLabel: lastEvent?.eventLabel ?? null,
          lastEventSourceLabel: lastEvent?.sourceLabel ?? null,
          lastEventAt: lastEvent?.createdAt ?? null,
          lastEventDetail: lastEvent?.detail ?? null,
        } satisfies SerializedAiManagerPendingX402QueueItem,
      ];
    });
}
