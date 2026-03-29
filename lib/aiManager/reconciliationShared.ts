import type {
  AiManagerPaymentAttemptEventSource,
  AiManagerPaymentAttemptEventType,
} from "@/lib/aiManager/config";

export type AiManagerX402DeliveryStatus =
  | "NONE"
  | "ACTIVE"
  | "WATCH"
  | "STALE";

export type SerializedAiManagerReconciliationSummary = {
  pendingX402Count: number;
  pendingX402Amount: string;
  oldestPendingX402CreatedAt: string | null;
  pendingX402DeliveryStatus: AiManagerX402DeliveryStatus;
  pendingX402DeliveryHint: string | null;
  latestPendingX402EventAt: string | null;
  latestPendingX402EventSource: AiManagerPaymentAttemptEventSource | null;
  latestPendingX402EventType: AiManagerPaymentAttemptEventType | null;
  failedX402Count: number;
  failedX402Amount: string;
  unmatchedFundingEvidenceCount: number;
  unmatchedFundingEvidenceAmount: string;
  latestConfirmedX402At: string | null;
  recoveryCount: number;
  latestRecoveryLabel: string | null;
  latestRecoverySourceLabel: string | null;
  latestRecoveryCreatedAt: string | null;
  recoveryConnectorCount: number;
  recoveryOwnerReviewCount: number;
  recoveryBillingSystemCount: number;
  requiresAttention: boolean;
};

export function deriveAiManagerX402DeliveryStatus(args: {
  pendingX402Count: number;
  oldestPendingX402CreatedAt: string | null;
  latestPendingX402EventAt?: string | null;
  latestPendingX402EventSource?: AiManagerPaymentAttemptEventSource | null;
  latestPendingX402EventType?: AiManagerPaymentAttemptEventType | null;
  now?: Date;
}): {
  status: AiManagerX402DeliveryStatus;
  hint: string | null;
} {
  if (args.pendingX402Count <= 0 || !args.oldestPendingX402CreatedAt) {
    return {
      status: "NONE",
      hint: null,
    };
  }

  const oldest = new Date(args.oldestPendingX402CreatedAt);
  if (Number.isNaN(oldest.getTime())) {
    return {
      status: "WATCH",
      hint: "pending x402 の経過時間を確認できません。connector delivery を確認してください。",
    };
  }

  const now = args.now ?? new Date();
  const latestEvent =
    typeof args.latestPendingX402EventAt === "string"
      ? new Date(args.latestPendingX402EventAt)
      : null;
  const latestEventTime =
    latestEvent && !Number.isNaN(latestEvent.getTime())
      ? latestEvent.getTime()
      : null;
  const referenceTime =
    latestEventTime !== null && latestEventTime >= oldest.getTime()
      ? latestEventTime
      : oldest.getTime();
  const ageMinutes = Math.max(
    0,
    Math.floor((now.getTime() - referenceTime) / 60_000)
  );
  const hasRecentEvent = latestEventTime !== null;
  const sourceLabel =
    args.latestPendingX402EventSource === "X402_CONNECTOR"
      ? "x402 connector"
      : args.latestPendingX402EventSource === "OWNER_REVIEW"
        ? "owner review"
        : "billing system";

  if (ageMinutes < 15) {
    return {
      status: "ACTIVE",
      hint: hasRecentEvent
        ? `${sourceLabel} から最近 event が届いています。callback 継続待ちの範囲です。`
        : "connector callback 待ちの範囲です。",
    };
  }

  if (ageMinutes < 60) {
    return {
      status: "WATCH",
      hint: hasRecentEvent
        ? `最近の ${sourceLabel} event はありますが、まだ pending が続いています。connector delivery を確認してください。`
        : "やや長く pending が続いています。connector delivery を確認してください。",
    };
  }

  return {
    status: "STALE",
    hint: hasRecentEvent
      ? `最後の ${sourceLabel} event から長時間更新がありません。connector と owner review の両方を確認してください。`
      : "pending が長時間継続しています。connector と owner review の両方を確認してください。",
  };
}

export function buildEmptyAiManagerReconciliationSummary(): SerializedAiManagerReconciliationSummary {
  return {
    pendingX402Count: 0,
    pendingX402Amount: "0",
    oldestPendingX402CreatedAt: null,
    pendingX402DeliveryStatus: "NONE",
    pendingX402DeliveryHint: null,
    latestPendingX402EventAt: null,
    latestPendingX402EventSource: null,
    latestPendingX402EventType: null,
    failedX402Count: 0,
    failedX402Amount: "0",
    unmatchedFundingEvidenceCount: 0,
    unmatchedFundingEvidenceAmount: "0",
    latestConfirmedX402At: null,
    recoveryCount: 0,
    latestRecoveryLabel: null,
    latestRecoverySourceLabel: null,
    latestRecoveryCreatedAt: null,
    recoveryConnectorCount: 0,
    recoveryOwnerReviewCount: 0,
    recoveryBillingSystemCount: 0,
    requiresAttention: false,
  };
}
