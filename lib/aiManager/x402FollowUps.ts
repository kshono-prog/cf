import { deriveAiManagerPendingX402Queue } from "@/lib/aiManager/pendingQueue";
import { deriveAiManagerX402ActivityTimeline } from "@/lib/aiManager/x402Timeline";
import {
  FAILED_DEFAULT_DETAIL,
  STALE_PENDING_DEFAULT_DETAIL,
  UNMATCHED_EVIDENCE_ACTION_LABEL,
  UNMATCHED_EVIDENCE_ROUTE_LABEL,
  UNMATCHED_EVIDENCE_TITLE,
  WATCH_PENDING_DEFAULT_DETAIL,
  getFailedFollowUpRouteCopy,
  getFailedTitle,
  getPendingFollowUpRouteCopy,
  getStalePendingTitle,
  getUnmatchedEvidenceDetail,
  getWatchPendingTitle,
  SLA_HIGH_HOURS,
  SLA_MEDIUM_HOURS,
} from "@/lib/aiManager/followUpCopy";
import type { SerializedAiManagerAccount } from "@/lib/serializers/aiManager";

export type SerializedAiManagerX402FollowUpPriority = "HIGH" | "MEDIUM";

export type SerializedAiManagerX402FollowUpKind =
  | "STALE_PENDING_X402"
  | "WATCH_PENDING_X402"
  | "FAILED_X402"
  | "UNMATCHED_FUNDING_EVIDENCE";

export type SerializedAiManagerX402FollowUp = {
  id: string;
  kind: SerializedAiManagerX402FollowUpKind;
  priority: SerializedAiManagerX402FollowUpPriority;
  title: string;
  detail: string;
  actionLabel: string;
  routeLabel: string | null;
  createdAt: string | null;
  paymentAttemptId: string | null;
  usageId: string | null;
  fundingEvidenceId: string | null;
  /** SLA 超過かどうか（HIGH: 24h, MEDIUM: 72h）*/
  slaBreached: boolean;
  /** 経過時間（時間単位、null = 不明）*/
  slaAgeHours: number | null;
};

function buildTaskLabel(taskLabel: string | null, capabilityLabel: string): string {
  return taskLabel ?? capabilityLabel;
}

function mergeFollowUpDetail(primary: string | null, secondary: string | null): string {
  if (primary && secondary) {
    return `${primary} ${secondary}`;
  }

  return primary ?? secondary ?? "";
}

function findLatestPaymentAttemptEvent(args: {
  account: SerializedAiManagerAccount;
  paymentAttemptId: string;
}): SerializedAiManagerAccount["recentPaymentAttemptEvents"][number] | null {
  return (
    args.account.recentPaymentAttemptEvents
      .filter((entry) => entry.paymentAttemptId === args.paymentAttemptId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  );
}

function computeSlaAgeHours(createdAt: string | null): number | null {
  if (!createdAt) return null;
  const ms = Date.now() - new Date(createdAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.floor(ms / (60 * 60 * 1000));
}

function isSlaBreached(priority: SerializedAiManagerX402FollowUpPriority, ageHours: number | null): boolean {
  if (ageHours === null) return false;
  const threshold = priority === "HIGH" ? SLA_HIGH_HOURS : SLA_MEDIUM_HOURS;
  return ageHours >= threshold;
}

export function deriveAiManagerX402FollowUps(
  account: SerializedAiManagerAccount | null
): SerializedAiManagerX402FollowUp[] {
  if (!account) {
    return [];
  }

  const pendingQueue = deriveAiManagerPendingX402Queue(account);
  const timeline = deriveAiManagerX402ActivityTimeline(account);
  const followUps: SerializedAiManagerX402FollowUp[] = [];

  for (const entry of pendingQueue.filter((item) => item.deliveryStatus === "STALE")) {
    const label = buildTaskLabel(entry.taskLabel, entry.capabilityLabel);
    const route = getPendingFollowUpRouteCopy({
      lastEventSourceLabel: entry.lastEventSourceLabel,
      isStale: true,
    });
    const ageHours = computeSlaAgeHours(entry.createdAt);
    const priority: SerializedAiManagerX402FollowUpPriority = "HIGH";
    followUps.push({
      id: `stale:${entry.paymentAttemptId}`,
      kind: "STALE_PENDING_X402",
      priority,
      title: getStalePendingTitle(label),
      detail: mergeFollowUpDetail(
        route.detail,
        entry.deliveryHint ?? STALE_PENDING_DEFAULT_DETAIL
      ),
      actionLabel: route.actionLabel,
      routeLabel: route.routeLabel,
      createdAt: entry.createdAt,
      paymentAttemptId: entry.paymentAttemptId,
      usageId: entry.usageId,
      fundingEvidenceId: null,
      slaBreached: isSlaBreached(priority, ageHours),
      slaAgeHours: ageHours,
    });
  }

  for (const entry of timeline.filter((item) => item.status === "FAILED")) {
    const label = buildTaskLabel(entry.taskLabel, entry.capabilityLabel);
    const latestEvent = findLatestPaymentAttemptEvent({
      account,
      paymentAttemptId: entry.paymentAttemptId,
    });
    const route = getFailedFollowUpRouteCopy({
      latestEventSource: latestEvent?.source ?? null,
    });
    const ageHours = computeSlaAgeHours(entry.eventAt);
    const priority: SerializedAiManagerX402FollowUpPriority = "HIGH";
    followUps.push({
      id: `failed:${entry.paymentAttemptId}`,
      kind: "FAILED_X402",
      priority,
      title: getFailedTitle(label),
      detail: mergeFollowUpDetail(
        route.detail,
        entry.failureReason ?? FAILED_DEFAULT_DETAIL
      ),
      actionLabel: route.actionLabel,
      routeLabel: route.routeLabel,
      createdAt: entry.eventAt,
      paymentAttemptId: entry.paymentAttemptId,
      usageId: entry.usageId,
      fundingEvidenceId: null,
      slaBreached: isSlaBreached(priority, ageHours),
      slaAgeHours: ageHours,
    });
  }

  for (const entry of account.recentFundingEvidences.filter(
    (item) =>
      item.matchedBudgetTransactionId == null && item.status !== "REJECTED"
  )) {
    const ageHours = computeSlaAgeHours(entry.createdAt);
    const priority: SerializedAiManagerX402FollowUpPriority = "MEDIUM";
    followUps.push({
      id: `evidence:${entry.id}`,
      kind: "UNMATCHED_FUNDING_EVIDENCE",
      priority,
      title: UNMATCHED_EVIDENCE_TITLE,
      detail: getUnmatchedEvidenceDetail(account.reconciliation.unmatchedFundingEvidenceCount),
      actionLabel: UNMATCHED_EVIDENCE_ACTION_LABEL,
      routeLabel: UNMATCHED_EVIDENCE_ROUTE_LABEL,
      createdAt: entry.createdAt,
      paymentAttemptId: null,
      usageId: null,
      fundingEvidenceId: entry.id,
      slaBreached: isSlaBreached(priority, ageHours),
      slaAgeHours: ageHours,
    });
  }

  if (
    !followUps.some((item) => item.kind === "STALE_PENDING_X402") &&
    account.reconciliation.pendingX402DeliveryStatus === "WATCH"
  ) {
    for (const entry of pendingQueue.filter((item) => item.deliveryStatus === "WATCH")) {
      const label = buildTaskLabel(entry.taskLabel, entry.capabilityLabel);
      const route = getPendingFollowUpRouteCopy({
        lastEventSourceLabel: entry.lastEventSourceLabel,
        isStale: false,
      });
      const ageHours = computeSlaAgeHours(entry.createdAt);
      const priority: SerializedAiManagerX402FollowUpPriority = "MEDIUM";
      followUps.push({
        id: `watch:${entry.paymentAttemptId}`,
        kind: "WATCH_PENDING_X402",
        priority,
        title: getWatchPendingTitle(label),
        detail: mergeFollowUpDetail(
          route.detail,
          entry.deliveryHint ?? WATCH_PENDING_DEFAULT_DETAIL
        ),
        actionLabel: route.actionLabel,
        routeLabel: route.routeLabel,
        createdAt: entry.createdAt,
        paymentAttemptId: entry.paymentAttemptId,
        usageId: entry.usageId,
        fundingEvidenceId: null,
        slaBreached: isSlaBreached(priority, ageHours),
        slaAgeHours: ageHours,
      });
    }
  }

  return followUps
    .sort((left, right) => {
      const priorityWeight = left.priority === right.priority ? 0 : left.priority === "HIGH" ? -1 : 1;
      if (priorityWeight !== 0) {
        return priorityWeight;
      }

      if (left.createdAt && right.createdAt) {
        return left.createdAt.localeCompare(right.createdAt);
      }

      if (left.createdAt) return -1;
      if (right.createdAt) return 1;
      return left.id.localeCompare(right.id);
    })
    .slice(0, 4);
}
