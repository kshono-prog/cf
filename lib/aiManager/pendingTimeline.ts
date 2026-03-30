import type { SerializedAiManagerAccount } from "@/lib/serializers/aiManager";
import { getCapabilityLabel, getSourceLabel } from "@/lib/aiManager/labels";
import { deriveAiManagerX402DeliveryStatus } from "@/lib/aiManager/reconciliationShared";
import { getAgentTaskTypeCopy } from "@/lib/uxCopy";

export type SerializedAiManagerPendingTimelineEvent = {
  id: string;
  sourceLabel: string;
  eventLabel: string;
  createdAt: string;
  detail: string | null;
  /** PENDING_OBSERVED の場合、同じ paymentAttemptId で何回 check-in されたか */
  pendingObservedCount: number | null;
};

export type SerializedAiManagerPendingTimelineItem = {
  usageId: string;
  paymentAttemptId: string;
  capabilityLabel: string;
  taskLabel: string | null;
  amount: string;
  currency: string;
  /** payment attempt createdAt — "pending since" の基準 */
  createdAt: string;
  deliveryStatus: "NONE" | "ACTIVE" | "WATCH" | "STALE";
  deliveryHint: string | null;
  /** イベント履歴。createdAt 昇順（古い順）*/
  events: SerializedAiManagerPendingTimelineEvent[];
};

function getEventLabel(eventType: string, status: string): string {
  if (eventType === "ATTEMPT_CREATED") {
    return status === "PENDING" ? "settlement started" : "settled immediately";
  }
  if (eventType === "PENDING_OBSERVED") return "pending observed";
  if (eventType === "SETTLEMENT_CONFIRMED") return "settlement confirmed";
  if (eventType === "SETTLEMENT_FAILED") return "settlement failed";
  return "duplicate replay accepted";
}

export function deriveAiManagerPendingTimeline(
  account: SerializedAiManagerAccount | null
): SerializedAiManagerPendingTimelineItem[] {
  if (!account) return [];

  // paymentAttemptId ごとの PENDING_OBSERVED 回数を集計
  const pendingObservedCountByAttempt = new Map<string, number>();
  for (const ev of account.recentPaymentAttemptEvents) {
    if (ev.eventType === "PENDING_OBSERVED") {
      pendingObservedCountByAttempt.set(
        ev.paymentAttemptId,
        (pendingObservedCountByAttempt.get(ev.paymentAttemptId) ?? 0) + 1
      );
    }
  }

  return account.recentUsageRecords
    .filter(
      (usage) =>
        usage.latestPaymentAttempt?.rail === "X402" &&
        usage.latestPaymentAttempt.status === "PENDING"
    )
    .flatMap((usage) => {
      const attempt = usage.latestPaymentAttempt;
      if (!attempt) return [];

      // このattemptに紐づくイベントを古い順に並べる
      const attemptEvents = account.recentPaymentAttemptEvents
        .filter((ev) => ev.paymentAttemptId === attempt.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

      const latestRawEvent =
        [...attemptEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;

      const delivery = deriveAiManagerX402DeliveryStatus({
        pendingX402Count: 1,
        oldestPendingX402CreatedAt: attempt.createdAt,
        latestPendingX402EventAt: latestRawEvent?.createdAt ?? null,
        latestPendingX402EventSource: latestRawEvent?.source ?? null,
        latestPendingX402EventType: latestRawEvent?.eventType ?? null,
      });

      const events: SerializedAiManagerPendingTimelineEvent[] = attemptEvents.map((ev) => ({
        id: ev.id,
        sourceLabel: getSourceLabel(ev.source),
        eventLabel: getEventLabel(ev.eventType, ev.status),
        createdAt: ev.createdAt,
        detail: ev.detail,
        pendingObservedCount:
          ev.eventType === "PENDING_OBSERVED"
            ? (pendingObservedCountByAttempt.get(ev.paymentAttemptId) ?? 1)
            : null,
      }));

      return [
        {
          usageId: usage.id,
          paymentAttemptId: attempt.id,
          capabilityLabel: getCapabilityLabel(usage.capability),
          taskLabel: usage.taskType ? getAgentTaskTypeCopy(usage.taskType).label : null,
          amount: usage.chargeAmount,
          currency: usage.currency,
          createdAt: attempt.createdAt,
          deliveryStatus: delivery.status,
          deliveryHint: delivery.hint,
          events,
        } satisfies SerializedAiManagerPendingTimelineItem,
      ];
    });
}
