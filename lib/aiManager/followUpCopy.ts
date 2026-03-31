/**
 * AM-33: Follow-up Copy Normalization
 *
 * 一元化された follow-up 文言辞書。
 * Home / Settings / AI Office の 3 画面で同じ条件なら同じ文言を使う。
 */

// ── Pending follow-up コピー ──────────────────────────────────────────

type PendingRouteCopy = {
  routeLabel: string;
  staleActionLabel: string;
  watchActionLabel: string;
  staleDetail: string;
  watchDetail: string;
};

const PENDING_ROUTE_COPY: Record<
  "x402_connector" | "owner_review" | "billing_system",
  PendingRouteCopy
> = {
  x402_connector: {
    routeLabel: "x402 connector",
    staleActionLabel: "connector callback と tx を確認",
    watchActionLabel: "connector callback の継続を確認",
    staleDetail:
      "connector 側の event はありますが、その後の更新が止まっています。connector callback と settlement 状態を見直してください。",
    watchDetail:
      "connector 側の event は見えています。callback 更新が続くかを確認してください。",
  },
  owner_review: {
    routeLabel: "owner review",
    staleActionLabel: "owner review を完了",
    watchActionLabel: "owner review の要否を確認",
    staleDetail:
      "owner review 側の確認待ちで止まっている可能性があります。confirm か fail の判断を進めてください。",
    watchDetail: "owner review 側の確認が必要かを見直してください。",
  },
  billing_system: {
    routeLabel: "billing system",
    staleActionLabel: "connector 受信状況を確認",
    watchActionLabel: "callback の到着を確認",
    staleDetail:
      "billing system では開始済みですが、その後の connector activity が見えていません。delivery 経路を確認してください。",
    watchDetail:
      "billing system では開始済みです。connector callback の到着を確認してください。",
  },
};

export type PendingFollowUpRouteCopy = {
  routeLabel: string;
  actionLabel: string;
  detail: string;
};

export function getPendingFollowUpRouteCopy(args: {
  lastEventSourceLabel: string | null;
  isStale: boolean;
}): PendingFollowUpRouteCopy {
  const key =
    args.lastEventSourceLabel === "x402 connector"
      ? "x402_connector"
      : args.lastEventSourceLabel === "owner review"
        ? "owner_review"
        : "billing_system";

  const copy = PENDING_ROUTE_COPY[key];
  return {
    routeLabel: copy.routeLabel,
    actionLabel: args.isStale ? copy.staleActionLabel : copy.watchActionLabel,
    detail: args.isStale ? copy.staleDetail : copy.watchDetail,
  };
}

// ── Failed follow-up コピー ───────────────────────────────────────────

type FailedRouteCopy = {
  routeLabel: string;
  actionLabel: string;
  detail: string;
};

const FAILED_ROUTE_COPY: Record<
  "X402_CONNECTOR" | "OWNER_REVIEW" | "BILLING_SYSTEM",
  FailedRouteCopy
> = {
  X402_CONNECTOR: {
    routeLabel: "x402 connector",
    actionLabel: "connector failure と pause を確認",
    detail:
      "connector から failed が返っています。connector failure と billing pause の両方を確認してください。",
  },
  OWNER_REVIEW: {
    routeLabel: "owner review",
    actionLabel: "owner review と pause を確認",
    detail:
      "owner review で failed として記録されています。failure の妥当性と billing pause を確認してください。",
  },
  BILLING_SYSTEM: {
    routeLabel: "billing system",
    actionLabel: "billing state と pause を確認",
    detail:
      "billing system 側で failed が記録されています。failure reason と billing pause を確認してください。",
  },
};

export function getFailedFollowUpRouteCopy(args: {
  latestEventSource: string | null;
}): FailedRouteCopy {
  if (args.latestEventSource === "X402_CONNECTOR") {
    return FAILED_ROUTE_COPY.X402_CONNECTOR;
  }
  if (args.latestEventSource === "OWNER_REVIEW") {
    return FAILED_ROUTE_COPY.OWNER_REVIEW;
  }
  return FAILED_ROUTE_COPY.BILLING_SYSTEM;
}

// ── Stale follow-up タイトル ──────────────────────────────────────────

export function getStalePendingTitle(taskLabel: string): string {
  return `${taskLabel} の x402 が長時間滞留しています`;
}

export function getWatchPendingTitle(taskLabel: string): string {
  return `${taskLabel} の x402 がやや滞留しています`;
}

export function getFailedTitle(taskLabel: string): string {
  return `${taskLabel} の x402 が失敗として記録されています`;
}

// ── Stale/Watch デフォルト detail ─────────────────────────────────────

export const STALE_PENDING_DEFAULT_DETAIL =
  "connector callback と owner 確認の両方を見直してください。";

export const WATCH_PENDING_DEFAULT_DETAIL =
  "callback 到着まで待つか、connector delivery を確認してください。";

export const FAILED_DEFAULT_DETAIL =
  "pause reason と settlement 状態を確認して、再開条件を整えてください。";

// ── Unmatched funding evidence ─────────────────────────────────────────

export const UNMATCHED_EVIDENCE_TITLE = "top-up evidence が ledger に未照合です";

export function getUnmatchedEvidenceDetail(unmatchedCount: number): string {
  if (unmatchedCount > 1) {
    return `${unmatchedCount.toString()}件の evidence が未照合です。owner-operated top-up と紐づけてください。`;
  }
  return "owner-operated top-up と紐づけて、budget 残高の監査線をそろえてください。";
}

export const UNMATCHED_EVIDENCE_ACTION_LABEL = "ledger top-up と照合";
export const UNMATCHED_EVIDENCE_ROUTE_LABEL = "funding evidence";

// ── SLA ラベル（AM-36 連携） ───────────────────────────────────────────

export const SLA_BREACHED_LABEL = "SLA 超過";
export const SLA_HIGH_HOURS = 24;
export const SLA_MEDIUM_HOURS = 72;
