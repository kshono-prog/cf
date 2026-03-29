import { deriveAiManagerPendingX402Queue } from "@/lib/aiManager/pendingQueue";
import { deriveAiManagerX402ActivityTimeline } from "@/lib/aiManager/x402Timeline";
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

function buildPendingFollowUpRoute(args: {
  lastEventSourceLabel: string | null;
  deliveryStatus: "NONE" | "ACTIVE" | "WATCH" | "STALE";
}): {
  routeLabel: string;
  actionLabel: string;
  detail: string | null;
} {
  if (args.lastEventSourceLabel === "x402 connector") {
    return {
      routeLabel: "x402 connector",
      actionLabel:
        args.deliveryStatus === "STALE"
          ? "connector callback と tx を確認"
          : "connector callback の継続を確認",
      detail:
        args.deliveryStatus === "STALE"
          ? "connector 側の event はありますが、その後の更新が止まっています。connector callback と settlement 状態を見直してください。"
          : "connector 側の event は見えています。callback 更新が続くかを確認してください。",
    };
  }

  if (args.lastEventSourceLabel === "owner review") {
    return {
      routeLabel: "owner review",
      actionLabel:
        args.deliveryStatus === "STALE"
          ? "owner review を完了"
          : "owner review の要否を確認",
      detail:
        args.deliveryStatus === "STALE"
          ? "owner review 側の確認待ちで止まっている可能性があります。confirm か fail の判断を進めてください。"
          : "owner review 側の確認が必要かを見直してください。",
    };
  }

  return {
    routeLabel: "billing system",
    actionLabel:
      args.deliveryStatus === "STALE"
        ? "connector 受信状況を確認"
        : "callback の到着を確認",
    detail:
      args.deliveryStatus === "STALE"
        ? "billing system では開始済みですが、その後の connector activity が見えていません。delivery 経路を確認してください。"
        : "billing system では開始済みです。connector callback の到着を確認してください。",
  };
}

function buildFailedFollowUpRoute(args: {
  latestEventSource: SerializedAiManagerAccount["recentPaymentAttemptEvents"][number]["source"] | null;
}): {
  routeLabel: string;
  actionLabel: string;
  detail: string | null;
} {
  if (args.latestEventSource === "X402_CONNECTOR") {
    return {
      routeLabel: "x402 connector",
      actionLabel: "connector failure と pause を確認",
      detail:
        "connector から failed が返っています。connector failure と billing pause の両方を確認してください。",
    };
  }

  if (args.latestEventSource === "OWNER_REVIEW") {
    return {
      routeLabel: "owner review",
      actionLabel: "owner review と pause を確認",
      detail:
        "owner review で failed として記録されています。failure の妥当性と billing pause を確認してください。",
    };
  }

  return {
    routeLabel: "billing system",
    actionLabel: "billing state と pause を確認",
    detail:
      "billing system 側で failed が記録されています。failure reason と billing pause を確認してください。",
  };
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
    const route = buildPendingFollowUpRoute({
      lastEventSourceLabel: entry.lastEventSourceLabel,
      deliveryStatus: entry.deliveryStatus,
    });
    followUps.push({
      id: `stale:${entry.paymentAttemptId}`,
      kind: "STALE_PENDING_X402",
      priority: "HIGH",
      title: `${label} の x402 が長時間滞留しています`,
      detail: mergeFollowUpDetail(
        route.detail,
        entry.deliveryHint ?? "connector callback と owner 確認の両方を見直してください。"
      ),
      actionLabel: route.actionLabel,
      routeLabel: route.routeLabel,
      createdAt: entry.createdAt,
      paymentAttemptId: entry.paymentAttemptId,
      usageId: entry.usageId,
      fundingEvidenceId: null,
    });
  }

  for (const entry of timeline.filter((item) => item.status === "FAILED")) {
    const label = buildTaskLabel(entry.taskLabel, entry.capabilityLabel);
    const latestEvent = findLatestPaymentAttemptEvent({
      account,
      paymentAttemptId: entry.paymentAttemptId,
    });
    const route = buildFailedFollowUpRoute({
      latestEventSource: latestEvent?.source ?? null,
    });
    followUps.push({
      id: `failed:${entry.paymentAttemptId}`,
      kind: "FAILED_X402",
      priority: "HIGH",
      title: `${label} の x402 が失敗として記録されています`,
      detail: mergeFollowUpDetail(
        route.detail,
        entry.failureReason ??
          "pause reason と settlement 状態を確認して、再開条件を整えてください。"
      ),
      actionLabel: route.actionLabel,
      routeLabel: route.routeLabel,
      createdAt: entry.eventAt,
      paymentAttemptId: entry.paymentAttemptId,
      usageId: entry.usageId,
      fundingEvidenceId: null,
    });
  }

  for (const entry of account.recentFundingEvidences.filter(
    (item) =>
      item.matchedBudgetTransactionId == null && item.status !== "REJECTED"
  )) {
    followUps.push({
      id: `evidence:${entry.id}`,
      kind: "UNMATCHED_FUNDING_EVIDENCE",
      priority: "MEDIUM",
      title: "top-up evidence が ledger に未照合です",
      detail:
        account.reconciliation.unmatchedFundingEvidenceCount > 1
          ? `${account.reconciliation.unmatchedFundingEvidenceCount}件の evidence が未照合です。owner-operated top-up と紐づけてください。`
          : "owner-operated top-up と紐づけて、budget 残高の監査線をそろえてください。",
      actionLabel: "ledger top-up と照合",
      routeLabel: "funding evidence",
      createdAt: entry.createdAt,
      paymentAttemptId: null,
      usageId: null,
      fundingEvidenceId: entry.id,
    });
  }

  if (
    !followUps.some((item) => item.kind === "STALE_PENDING_X402") &&
    account.reconciliation.pendingX402DeliveryStatus === "WATCH"
  ) {
    for (const entry of pendingQueue.filter((item) => item.deliveryStatus === "WATCH")) {
      const label = buildTaskLabel(entry.taskLabel, entry.capabilityLabel);
      const route = buildPendingFollowUpRoute({
        lastEventSourceLabel: entry.lastEventSourceLabel,
        deliveryStatus: entry.deliveryStatus,
      });
      followUps.push({
        id: `watch:${entry.paymentAttemptId}`,
        kind: "WATCH_PENDING_X402",
        priority: "MEDIUM",
        title: `${label} の x402 がやや滞留しています`,
        detail: mergeFollowUpDetail(
          route.detail,
          entry.deliveryHint ?? "callback 到着まで待つか、connector delivery を確認してください。"
        ),
        actionLabel: route.actionLabel,
        routeLabel: route.routeLabel,
        createdAt: entry.createdAt,
        paymentAttemptId: entry.paymentAttemptId,
        usageId: entry.usageId,
        fundingEvidenceId: null,
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
