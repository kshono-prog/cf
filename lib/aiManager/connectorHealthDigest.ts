import type { SerializedAiManagerAccount } from "@/lib/serializers/aiManager";
import { deriveAiManagerX402DeliveryStatus } from "@/lib/aiManager/reconciliationShared";

export type SerializedConnectorHealthDigest = {
  /** callback 待ち (< 15min) の pending 件数 */
  pendingActive: number;
  /** やや滞留 (15–60min) の pending 件数 */
  pendingWatch: number;
  /** 長時間滞留 (> 60min) の pending 件数 */
  pendingStale: number;
  /** SETTLEMENT_REPLAYED イベント件数（重複 replay 受理） */
  duplicateReplayCount: number;
  /** X402_CONNECTOR からの最新 PENDING_OBSERVED createdAt */
  latestConnectorCheckInAt: string | null;
  /** 最新 check-in からの経過分数（null = check-in なし） */
  minutesSinceLastCheckIn: number | null;
  /** 今回の recentPaymentAttemptEvents 内の PENDING_OBSERVED 合計件数 */
  pendingObservedTotalCount: number;
};

export function deriveConnectorHealthDigest(
  account: SerializedAiManagerAccount | null
): SerializedConnectorHealthDigest {
  const empty: SerializedConnectorHealthDigest = {
    pendingActive: 0,
    pendingWatch: 0,
    pendingStale: 0,
    duplicateReplayCount: 0,
    latestConnectorCheckInAt: null,
    minutesSinceLastCheckIn: null,
    pendingObservedTotalCount: 0,
  };
  if (!account) return empty;

  // pending 件数を delivery status 別に集計
  let pendingActive = 0;
  let pendingWatch = 0;
  let pendingStale = 0;

  for (const usage of account.recentUsageRecords) {
    const attempt = usage.latestPaymentAttempt;
    if (!attempt || attempt.rail !== "X402" || attempt.status !== "PENDING") continue;

    const attemptEvents = account.recentPaymentAttemptEvents.filter(
      (ev) => ev.paymentAttemptId === attempt.id
    );
    const latestEvent =
      [...attemptEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;

    const delivery = deriveAiManagerX402DeliveryStatus({
      pendingX402Count: 1,
      oldestPendingX402CreatedAt: attempt.createdAt,
      latestPendingX402EventAt: latestEvent?.createdAt ?? null,
      latestPendingX402EventSource: latestEvent?.source ?? null,
      latestPendingX402EventType: latestEvent?.eventType ?? null,
    });

    if (delivery.status === "ACTIVE") pendingActive++;
    else if (delivery.status === "WATCH") pendingWatch++;
    else if (delivery.status === "STALE") pendingStale++;
  }

  // 重複 replay 受理件数
  const duplicateReplayCount = account.recentPaymentAttemptEvents.filter(
    (ev) => ev.eventType === "SETTLEMENT_REPLAYED"
  ).length;

  // X402_CONNECTOR からの最新 PENDING_OBSERVED
  const connectorObservations = account.recentPaymentAttemptEvents
    .filter(
      (ev) => ev.eventType === "PENDING_OBSERVED" && ev.source === "X402_CONNECTOR"
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const latestConnectorCheckInAt = connectorObservations[0]?.createdAt ?? null;

  const minutesSinceLastCheckIn = latestConnectorCheckInAt
    ? Math.floor((Date.now() - new Date(latestConnectorCheckInAt).getTime()) / 60_000)
    : null;

  // PENDING_OBSERVED 総件数
  const pendingObservedTotalCount = account.recentPaymentAttemptEvents.filter(
    (ev) => ev.eventType === "PENDING_OBSERVED"
  ).length;

  return {
    pendingActive,
    pendingWatch,
    pendingStale,
    duplicateReplayCount,
    latestConnectorCheckInAt,
    minutesSinceLastCheckIn,
    pendingObservedTotalCount,
  };
}
