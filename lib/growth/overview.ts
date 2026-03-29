import { isRecord, toOptionalString } from "@/lib/api/guards";
import type { GrowthEventName } from "@/lib/growth/types";

export const GROWTH_OVERVIEW_MILESTONE_EVENTS = [
  "wallet_connected",
  "user_registered",
  "creator_applied",
  "project_created",
  "goal_saved",
  "public_page_viewed_by_owner",
  "share_drafts_generated",
  "share_post_logged",
  "first_tip_received",
] as const;

export type GrowthOverviewMilestoneEvent =
  (typeof GROWTH_OVERVIEW_MILESTONE_EVENTS)[number];

export const GROWTH_EVENT_LABELS: Record<GrowthEventName, string> = {
  wallet_connected: "ウォレット接続",
  user_registered: "ユーザー登録",
  creator_applied: "クリエイター申請",
  profile_ai_generated: "AIプロフィール下書き生成",
  profile_saved: "プロフィール保存",
  project_created: "Project 作成",
  goal_saved: "Goal 保存",
  public_page_viewed_by_owner: "公開ページ確認",
  share_drafts_generated: "拡散文面生成",
  share_copied: "拡散文面コピー",
  share_post_logged: "シェア投稿記録",
  first_tip_received: "初回支援受領",
};

export type GrowthOverviewMilestone = {
  event: GrowthOverviewMilestoneEvent;
  label: string;
  completed: boolean;
  count: number;
  lastAt: string | null;
};

export type GrowthOverviewRecentEvent = {
  event: GrowthEventName;
  label: string;
  createdAt: string;
  projectId: string | null;
};

export type GrowthOverviewMetrics = {
  ownerPublicPageViewCount: number;
  shareDraftGeneratedCount: number;
  shareCopiedCount: number;
  sharePostLoggedCount: number;
  confirmedContributionCount: number;
};

export type GrowthOverviewData = {
  username: string | null;
  walletAddress: string | null;
  milestoneCompletionCount: number;
  milestoneTotalCount: number;
  firstTipReceivedAt: string | null;
  latestConfirmedContributionAt: string | null;
  metrics: GrowthOverviewMetrics;
  milestones: GrowthOverviewMilestone[];
  recentEvents: GrowthOverviewRecentEvent[];
};

function toOptionalIsoString(value: unknown): string | null | undefined {
  if (value === null) return null;
  const next = toOptionalString(value);
  if (!next) return undefined;
  return next;
}

function parseNonNegativeNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return value;
}

function parseMilestone(value: unknown): GrowthOverviewMilestone | null {
  if (!isRecord(value)) {
    return null;
  }

  const event = value.event;
  if (
    typeof event !== "string" ||
    !GROWTH_OVERVIEW_MILESTONE_EVENTS.includes(
      event as GrowthOverviewMilestoneEvent
    )
  ) {
    return null;
  }

  const label = toOptionalString(value.label);
  const count = parseNonNegativeNumber(value.count);
  const completed = value.completed === true;
  const lastAt = toOptionalIsoString(value.lastAt);

  if (!label || count === null || typeof lastAt === "undefined") {
    return null;
  }

  return {
    event: event as GrowthOverviewMilestoneEvent,
    label,
    completed,
    count,
    lastAt,
  };
}

function parseRecentEvent(value: unknown): GrowthOverviewRecentEvent | null {
  if (!isRecord(value)) {
    return null;
  }

  const event = value.event;
  const label = toOptionalString(value.label);
  const createdAt = toOptionalString(value.createdAt);
  const projectId = toOptionalIsoString(value.projectId);

  if (
    typeof event !== "string" ||
    !(event in GROWTH_EVENT_LABELS) ||
    !label ||
    !createdAt ||
    typeof projectId === "undefined"
  ) {
    return null;
  }

  return {
    event: event as GrowthEventName,
    label,
    createdAt,
    projectId,
  };
}

function parseMetrics(value: unknown): GrowthOverviewMetrics | null {
  if (!isRecord(value)) {
    return null;
  }

  const ownerPublicPageViewCount = parseNonNegativeNumber(
    value.ownerPublicPageViewCount
  );
  const shareDraftGeneratedCount = parseNonNegativeNumber(
    value.shareDraftGeneratedCount
  );
  const shareCopiedCount = parseNonNegativeNumber(value.shareCopiedCount);
  const sharePostLoggedCount = parseNonNegativeNumber(value.sharePostLoggedCount);
  const confirmedContributionCount = parseNonNegativeNumber(
    value.confirmedContributionCount
  );

  if (
    ownerPublicPageViewCount === null ||
    shareDraftGeneratedCount === null ||
    shareCopiedCount === null ||
    sharePostLoggedCount === null ||
    confirmedContributionCount === null
  ) {
    return null;
  }

  return {
    ownerPublicPageViewCount,
    shareDraftGeneratedCount,
    shareCopiedCount,
    sharePostLoggedCount,
    confirmedContributionCount,
  };
}

export function parseGrowthOverviewData(value: unknown): GrowthOverviewData | null {
  if (!isRecord(value)) {
    return null;
  }

  const username = toOptionalIsoString(value.username);
  const walletAddress = toOptionalIsoString(value.walletAddress);
  const firstTipReceivedAt = toOptionalIsoString(value.firstTipReceivedAt);
  const latestConfirmedContributionAt = toOptionalIsoString(
    value.latestConfirmedContributionAt
  );
  const milestoneCompletionCount = parseNonNegativeNumber(
    value.milestoneCompletionCount
  );
  const milestoneTotalCount = parseNonNegativeNumber(value.milestoneTotalCount);
  const metrics = parseMetrics(value.metrics);

  if (
    typeof username === "undefined" ||
    typeof walletAddress === "undefined" ||
    typeof firstTipReceivedAt === "undefined" ||
    typeof latestConfirmedContributionAt === "undefined" ||
    milestoneCompletionCount === null ||
    milestoneTotalCount === null ||
    !metrics ||
    !Array.isArray(value.milestones) ||
    !Array.isArray(value.recentEvents)
  ) {
    return null;
  }

  const milestones = value.milestones
    .map((entry) => parseMilestone(entry))
    .filter((entry): entry is GrowthOverviewMilestone => Boolean(entry));
  const recentEvents = value.recentEvents
    .map((entry) => parseRecentEvent(entry))
    .filter((entry): entry is GrowthOverviewRecentEvent => Boolean(entry));

  if (
    milestones.length !== value.milestones.length ||
    recentEvents.length !== value.recentEvents.length
  ) {
    return null;
  }

  return {
    username,
    walletAddress,
    milestoneCompletionCount,
    milestoneTotalCount,
    firstTipReceivedAt,
    latestConfirmedContributionAt,
    metrics,
    milestones,
    recentEvents,
  };
}
