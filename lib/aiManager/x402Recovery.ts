import type {
  SerializedAiManagerAccount,
  SerializedAiManagerPaymentAttemptEvent,
} from "@/lib/serializers/aiManager";
import { getCapabilityLabel, getSourceLabel } from "@/lib/aiManager/labels";
import { getAgentTaskTypeCopy } from "@/lib/uxCopy";

export type SerializedAiManagerX402RecoveryItem = {
  id: string;
  paymentAttemptId: string;
  usageId: string;
  taskLabel: string | null;
  capabilityLabel: string;
  recoveryLabel: string;
  sourceLabel: string;
  detail: string | null;
  createdAt: string;
};

function buildReplayRecoveryItem(
  entry: SerializedAiManagerPaymentAttemptEvent
): SerializedAiManagerX402RecoveryItem {
  return {
    id: `replay:${entry.id}`,
    paymentAttemptId: entry.paymentAttemptId,
    usageId: entry.usageId,
    taskLabel: entry.taskType ? getAgentTaskTypeCopy(entry.taskType).label : null,
    capabilityLabel: getCapabilityLabel(entry.capability),
    recoveryLabel: "duplicate replay accepted",
    sourceLabel: getSourceLabel(entry.source),
    detail: entry.detail,
    createdAt: entry.createdAt,
  };
}

function buildRecoveredAfterFailureItem(args: {
  confirmedEvent: SerializedAiManagerPaymentAttemptEvent;
}): SerializedAiManagerX402RecoveryItem {
  const entry = args.confirmedEvent;

  return {
    id: `recovered:${entry.paymentAttemptId}`,
    paymentAttemptId: entry.paymentAttemptId,
    usageId: entry.usageId,
    taskLabel: entry.taskType ? getAgentTaskTypeCopy(entry.taskType).label : null,
    capabilityLabel: getCapabilityLabel(entry.capability),
    recoveryLabel: "failed -> confirmed",
    sourceLabel: getSourceLabel(entry.source),
    detail: "failed と記録された settlement が、その後 confirmed まで戻っています。",
    createdAt: entry.createdAt,
  };
}

function buildAllRecoveryItems(
  account: Pick<SerializedAiManagerAccount, "recentPaymentAttemptEvents">
): SerializedAiManagerX402RecoveryItem[] {
  const x402Events = account.recentPaymentAttemptEvents
    .filter((entry) => entry.rail === "X402")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const replayItems = x402Events
    .filter((entry) => entry.eventType === "SETTLEMENT_REPLAYED")
    .map(buildReplayRecoveryItem);

  const eventsByAttempt = new Map<
    string,
    SerializedAiManagerPaymentAttemptEvent[]
  >();
  for (const entry of x402Events) {
    const current = eventsByAttempt.get(entry.paymentAttemptId) ?? [];
    current.push(entry);
    eventsByAttempt.set(entry.paymentAttemptId, current);
  }

  const recoveredItems: SerializedAiManagerX402RecoveryItem[] = [];
  for (const events of eventsByAttempt.values()) {
    const latestConfirmed = events.find(
      (entry) => entry.eventType === "SETTLEMENT_CONFIRMED"
    );
    const hadFailedBeforeConfirm =
      latestConfirmed != null &&
      events.some(
        (entry) =>
          entry.eventType === "SETTLEMENT_FAILED" &&
          entry.createdAt < latestConfirmed.createdAt
      );

    if (latestConfirmed && hadFailedBeforeConfirm) {
      recoveredItems.push(
        buildRecoveredAfterFailureItem({ confirmedEvent: latestConfirmed })
      );
    }
  }

  return [...replayItems, ...recoveredItems].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export function deriveAllAiManagerX402RecoveryItems(
  account: Pick<SerializedAiManagerAccount, "recentPaymentAttemptEvents"> | null
): SerializedAiManagerX402RecoveryItem[] {
  if (!account) return [];
  return buildAllRecoveryItems(account);
}

export function deriveAiManagerX402RecoveryItems(
  account: Pick<SerializedAiManagerAccount, "recentPaymentAttemptEvents"> | null
): SerializedAiManagerX402RecoveryItem[] {
  if (!account) {
    return [];
  }
  return buildAllRecoveryItems(account).slice(0, 4);
}
