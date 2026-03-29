import type { SerializedAiManagerAccount } from "@/lib/serializers/aiManager";
import { getCapabilityLabel } from "@/lib/aiManager/labels";
import { getAgentTaskTypeCopy } from "@/lib/uxCopy";

export type SerializedAiManagerX402ActivityItem = {
  usageId: string;
  paymentAttemptId: string;
  taskLabel: string | null;
  capabilityLabel: string;
  amount: string;
  currency: string;
  status: "PENDING" | "CONFIRMED" | "FAILED";
  eventAt: string;
  txHash: string | null;
  failureReason: string | null;
};

export function deriveAiManagerX402ActivityTimeline(
  account: SerializedAiManagerAccount | null
): SerializedAiManagerX402ActivityItem[] {
  if (!account) return [];

  return account.recentUsageRecords
    .flatMap((usage) => {
      const attempt = usage.latestPaymentAttempt;
      if (!attempt || attempt.rail !== "X402") {
        return [];
      }

      return [
        {
          usageId: usage.id,
          paymentAttemptId: attempt.id,
          taskLabel: usage.taskType
            ? getAgentTaskTypeCopy(usage.taskType).label
            : null,
          capabilityLabel: getCapabilityLabel(usage.capability),
          amount: usage.chargeAmount,
          currency: usage.currency,
          status: attempt.status,
          eventAt: attempt.confirmedAt ?? attempt.createdAt,
          txHash: attempt.txHash,
          failureReason: attempt.failureReason ?? usage.failureReason,
        } satisfies SerializedAiManagerX402ActivityItem,
      ];
    })
    .sort((a, b) => b.eventAt.localeCompare(a.eventAt));
}
