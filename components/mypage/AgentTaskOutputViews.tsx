"use client";

import React from "react";
import { isRecord } from "@/lib/api/guards";

import {
  buildDistributionPlanDraftHandoff,
  buildSettlementDraftHref,
  DISTRIBUTION_PLAN_DRAFT_HANDOFF_STORAGE_KEY,
} from "@/components/mypage/distributionPlanDraftHandoff";
import {
  buildAnnouncementPostingComposeHandoff,
  buildAnnouncementPostingComposeText,
  buildPostingComposeHref,
  POSTING_COMPOSE_HANDOFF_STORAGE_KEY,
} from "@/components/mypage/postingComposeHandoff";
import {
  formatDistributionPlanDraftPayload,
  type DistributionPlanDraftPayload,
} from "@/lib/creator-ai/distributionPlanDraft";
import type { TaskType } from "@/lib/agentTaskParsers";

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asStringOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asNumberOrNull(v: unknown): number | null {
  if (typeof v !== "number") return null;
  if (!Number.isFinite(v)) return null;
  return v;
}

function stringifyOutput(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return "{}";
  }
}

type AnalyzeOutputView = {
  summary: string;
  keyInsights: string[];
  nextActions: string[];
  totals: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  } | null;
  topPlatform: string | null;
  topRateText: string | null;
  trendPoints: Array<{
    date: string;
    views: number;
    interactionRate: number;
  }>;
  viewsDeltaPct: number | null;
  rateDeltaPct: number | null;
};

function parseAnalyzeOutput(v: unknown): AnalyzeOutputView | null {
  if (!isRecord(v)) return null;
  const summary = asStringOrNull(v.summary);
  if (!summary) return null;

  const keyInsights = asArray(v.keyInsights)
    .map(asStringOrNull)
    .filter((x): x is string => !!x);
  const nextActions = asArray(v.nextActions)
    .map(asStringOrNull)
    .filter((x): x is string => !!x);

  const metrics = isRecord(v.metrics) ? v.metrics : null;
  const totalsRaw = metrics && isRecord(metrics.totals) ? metrics.totals : null;
  const totals = totalsRaw
    ? {
        views: asNumberOrNull(totalsRaw.views) ?? 0,
        likes: asNumberOrNull(totalsRaw.likes) ?? 0,
        comments: asNumberOrNull(totalsRaw.comments) ?? 0,
        shares: asNumberOrNull(totalsRaw.shares) ?? 0,
      }
    : null;

  const byPlatform = metrics ? asArray(metrics.byPlatform) : [];
  let topPlatform: string | null = null;
  let topRateText: string | null = null;
  const first = byPlatform[0];
  if (isRecord(first)) {
    topPlatform = asStringOrNull(first.platform);
    const rate = asNumberOrNull(first.interactionRate);
    if (typeof rate === "number") {
      topRateText = `${(rate * 100).toFixed(2)}%`;
    }
  }

  const trendRaw = metrics && isRecord(metrics.trend) ? metrics.trend : null;
  const trendPointsRaw = trendRaw ? asArray(trendRaw.points) : [];
  const trendPoints: Array<{
    date: string;
    views: number;
    interactionRate: number;
  }> = [];
  for (const point of trendPointsRaw) {
    if (!isRecord(point)) continue;
    const date = asStringOrNull(point.date);
    if (!date) continue;
    trendPoints.push({
      date,
      views: asNumberOrNull(point.views) ?? 0,
      interactionRate: asNumberOrNull(point.interactionRate) ?? 0,
    });
  }
  const viewsDeltaPct = trendRaw ? asNumberOrNull(trendRaw.viewsDeltaPct) : null;
  const rateDeltaPct = trendRaw ? asNumberOrNull(trendRaw.rateDeltaPct) : null;

  return {
    summary,
    keyInsights,
    nextActions,
    totals,
    topPlatform,
    topRateText,
    trendPoints,
    viewsDeltaPct,
    rateDeltaPct,
  };
}

function AnalyzeOutputCard(props: { output: AnalyzeOutputView }) {
  const { output } = props;
  const points = output.trendPoints.slice(-5);
  const viewsDeltaText =
    output.viewsDeltaPct == null
      ? null
      : `${output.viewsDeltaPct >= 0 ? "+" : ""}${(
          output.viewsDeltaPct * 100
        ).toFixed(1)}%`;
  const rateDeltaText =
    output.rateDeltaPct == null
      ? null
      : `${output.rateDeltaPct >= 0 ? "+" : ""}${(
          output.rateDeltaPct * 100
        ).toFixed(1)}%`;

  return (
    <div className="mt-1 rounded bg-gray-50 p-2 text-[11px] space-y-2">
      <div className="font-medium text-gray-800">{output.summary}</div>
      {output.totals ? (
        <div className="grid grid-cols-2 gap-1">
          <div>views: {output.totals.views}</div>
          <div>likes: {output.totals.likes}</div>
          <div>comments: {output.totals.comments}</div>
          <div>shares: {output.totals.shares}</div>
        </div>
      ) : null}
      {output.topPlatform ? (
        <div>
          top: {output.topPlatform}
          {output.topRateText ? ` (${output.topRateText})` : ""}
        </div>
      ) : null}
      {viewsDeltaText || rateDeltaText ? (
        <div>
          delta
          {viewsDeltaText ? ` views:${viewsDeltaText}` : ""}
          {rateDeltaText ? ` rate:${rateDeltaText}` : ""}
        </div>
      ) : null}
      {points.length > 0 ? (
        <div className="rounded border bg-white p-1">
          {points.map((point) => (
            <div key={point.date} className="text-[10px] text-gray-700">
              {point.date} v:{point.views} r:{(point.interactionRate * 100).toFixed(1)}%
            </div>
          ))}
        </div>
      ) : null}
      {output.keyInsights.length > 0 ? (
        <ul className="list-disc pl-4">
          {output.keyInsights.slice(0, 2).map((insight, idx) => (
            <li key={`${insight}:${idx.toString()}`}>{insight}</li>
          ))}
        </ul>
      ) : null}
      {output.nextActions.length > 0 ? (
        <ul className="list-disc pl-4">
          {output.nextActions.slice(0, 2).map((action, idx) => (
            <li key={`${action}:${idx.toString()}`}>{action}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

type ProposeOutputView = {
  summary: string;
  proposals: string[];
  metricsHint: Array<{
    platform: string;
    posts: number;
    interactionRate: number;
    interactions: number;
    views: number;
  }>;
};

function parseProposeOutput(v: unknown): ProposeOutputView | null {
  if (!isRecord(v)) return null;
  const summary = asStringOrNull(v.summary);
  if (!summary) return null;
  const proposals = asArray(v.proposals)
    .map(asStringOrNull)
    .filter((x): x is string => !!x);
  if (proposals.length === 0) return null;
  const hintRows = asArray(v.metricsHint);
  const metricsHint: Array<{
    platform: string;
    posts: number;
    interactionRate: number;
    interactions: number;
    views: number;
  }> = [];
  for (const row of hintRows) {
    if (!isRecord(row)) continue;
    const platform = asStringOrNull(row.platform);
    if (!platform) continue;
    metricsHint.push({
      platform,
      posts: asNumberOrNull(row.posts) ?? 0,
      interactionRate: asNumberOrNull(row.interactionRate) ?? 0,
      interactions: asNumberOrNull(row.interactions) ?? 0,
      views: asNumberOrNull(row.views) ?? 0,
    });
  }
  return { summary, proposals, metricsHint };
}

function ProposeOutputCard(props: { output: ProposeOutputView }) {
  const { output } = props;
  return (
    <div className="mt-1 rounded bg-gray-50 p-2 text-[11px] space-y-2">
      <div className="font-medium text-gray-800">{output.summary}</div>
      {output.metricsHint.length > 0 ? (
        <div className="rounded border bg-white p-1">
          {output.metricsHint.slice(0, 3).map((item) => (
            <div key={item.platform} className="text-[10px] text-gray-700">
              {item.platform} posts:{item.posts} rate:
              {(item.interactionRate * 100).toFixed(1)}% ({item.interactions}/
              {item.views})
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid gap-1">
        {output.proposals.slice(0, 3).map((proposal, idx) => (
          <div
            key={`${proposal}:${idx.toString()}`}
            className="rounded border bg-white px-2 py-1 text-gray-800"
          >
            {idx + 1}. {proposal}
          </div>
        ))}
      </div>
    </div>
  );
}

type ManagerSuggestedActionView = {
  id: string;
  title: string;
  reason: string;
  priority: "high" | "medium" | "low";
  recommendedUiTarget:
    | "project"
    | "goal"
    | "summary"
    | "plan"
    | "distributionResult"
    | "bridge"
    | "achieve";
  requiresHumanApproval: boolean;
};

type ManagerNextActionsOutputView = {
  summary: string;
  suggestedActions: ManagerSuggestedActionView[];
  evidence: {
    projectStatus: string | null;
    confirmedAmount: number;
    targetAmount: number | null;
    progressPct: number;
    goalConfigured: boolean;
    goalAchieved: boolean;
    distributionPlanMissing: boolean;
    bridgeReflected: boolean;
    distributionResultSaved: boolean;
    bridgeRunCount: number;
    distributionRunCount: number;
  } | null;
  projectSnapshot: {
    projectId: string;
    title: string;
    currency: string | null;
    status: string;
    goalId: string | null;
    goalTargetAmount: number | null;
    achievedAt: string | null;
    deadline: string | null;
  } | null;
};

function isSuggestionPriority(
  value: unknown
): value is ManagerSuggestedActionView["priority"] {
  return value === "high" || value === "medium" || value === "low";
}

function isManagerTarget(
  value: unknown
): value is ManagerSuggestedActionView["recommendedUiTarget"] {
  return (
    value === "project" ||
    value === "goal" ||
    value === "summary" ||
    value === "plan" ||
    value === "distributionResult" ||
    value === "bridge" ||
    value === "achieve"
  );
}

function parseManagerNextActionsOutput(
  v: unknown
): ManagerNextActionsOutputView | null {
  if (!isRecord(v)) return null;
  const summary = asStringOrNull(v.summary);
  if (!summary) return null;

  const suggestedActionsRaw = asArray(v.suggestedActions);
  const suggestedActions: ManagerSuggestedActionView[] = [];
  for (const item of suggestedActionsRaw) {
    if (!isRecord(item)) continue;
    const id = asStringOrNull(item.id);
    const title = asStringOrNull(item.title);
    const reason = asStringOrNull(item.reason);
    const priority = item.priority;
    const recommendedUiTarget = item.recommendedUiTarget;
    if (
      !id ||
      !title ||
      !reason ||
      !isSuggestionPriority(priority) ||
      !isManagerTarget(recommendedUiTarget)
    ) {
      continue;
    }

    suggestedActions.push({
      id,
      title,
      reason,
      priority,
      recommendedUiTarget,
      requiresHumanApproval: item.requiresHumanApproval !== false,
    });
  }

  const evidenceRaw = isRecord(v.evidence) ? v.evidence : null;
  const evidence = evidenceRaw
    ? {
        projectStatus: asStringOrNull(evidenceRaw.projectStatus),
        confirmedAmount: asNumberOrNull(evidenceRaw.confirmedAmount) ?? 0,
        targetAmount: asNumberOrNull(evidenceRaw.targetAmount),
        progressPct: asNumberOrNull(evidenceRaw.progressPct) ?? 0,
        goalConfigured: evidenceRaw.goalConfigured === true,
        goalAchieved: evidenceRaw.goalAchieved === true,
        distributionPlanMissing: evidenceRaw.distributionPlanMissing === true,
        bridgeReflected: evidenceRaw.bridgeReflected === true,
        distributionResultSaved: evidenceRaw.distributionResultSaved === true,
        bridgeRunCount: asNumberOrNull(evidenceRaw.bridgeRunCount) ?? 0,
        distributionRunCount:
          asNumberOrNull(evidenceRaw.distributionRunCount) ?? 0,
      }
    : null;

  const snapshotRaw = isRecord(v.projectSnapshot) ? v.projectSnapshot : null;
  const projectSnapshot =
    snapshotRaw &&
    asStringOrNull(snapshotRaw.projectId) &&
    asStringOrNull(snapshotRaw.title) &&
    asStringOrNull(snapshotRaw.status)
      ? {
          projectId: asStringOrNull(snapshotRaw.projectId) ?? "",
          title: asStringOrNull(snapshotRaw.title) ?? "",
          currency: asStringOrNull(snapshotRaw.currency),
          status: asStringOrNull(snapshotRaw.status) ?? "",
          goalId: asStringOrNull(snapshotRaw.goalId),
          goalTargetAmount: asNumberOrNull(snapshotRaw.goalTargetAmount),
          achievedAt: asStringOrNull(snapshotRaw.achievedAt),
          deadline: asStringOrNull(snapshotRaw.deadline),
        }
      : null;

  return {
    summary,
    suggestedActions,
    evidence,
    projectSnapshot,
  };
}

function managerPriorityBadgeClass(
  priority: ManagerSuggestedActionView["priority"]
): string {
  if (priority === "high") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (priority === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-gray-200 bg-gray-100 text-gray-700";
}

function ManagerNextActionsOutputCard(props: {
  output: ManagerNextActionsOutputView;
}) {
  const { output } = props;
  return (
    <div className="mt-1 rounded bg-gray-50 p-2 text-[11px] space-y-2">
      <div className="font-medium text-gray-800">{output.summary}</div>
      {output.projectSnapshot ? (
        <div className="rounded border bg-white p-2 text-gray-700">
          <div className="font-medium text-gray-800">
            {output.projectSnapshot.title}
          </div>
          <div className="mt-1 text-[10px]">
            status: {output.projectSnapshot.status}
            {output.projectSnapshot.currency
              ? ` / currency: ${output.projectSnapshot.currency}`
              : ""}
            {output.projectSnapshot.goalTargetAmount != null
              ? ` / target: ${output.projectSnapshot.goalTargetAmount.toLocaleString()}`
              : ""}
          </div>
        </div>
      ) : null}
      {output.evidence ? (
        <div className="flex flex-wrap gap-1">
          <span className="rounded-full border bg-white px-2 py-1">
            progress: {Math.floor(output.evidence.progressPct)}%
          </span>
          <span className="rounded-full border bg-white px-2 py-1">
            goal: {output.evidence.goalConfigured ? "set" : "missing"}
          </span>
          <span className="rounded-full border bg-white px-2 py-1">
            achieved: {output.evidence.goalAchieved ? "yes" : "no"}
          </span>
          <span className="rounded-full border bg-white px-2 py-1">
            plan: {output.evidence.distributionPlanMissing ? "missing" : "ready"}
          </span>
          <span className="rounded-full border bg-white px-2 py-1">
            bridge: {output.evidence.bridgeReflected ? "reflected" : "pending"}
          </span>
          <span className="rounded-full border bg-white px-2 py-1">
            result:{" "}
            {output.evidence.distributionResultSaved ? "saved" : "pending"}
          </span>
        </div>
      ) : null}
      {output.suggestedActions.length > 0 ? (
        <div className="grid gap-1">
          {output.suggestedActions.slice(0, 3).map((action) => (
            <div
              key={action.id}
              className="rounded border bg-white px-2 py-2 text-gray-800"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium">{action.title}</div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] ${managerPriorityBadgeClass(
                    action.priority
                  )}`}
                >
                  {action.priority}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-gray-500">
                target: {action.recommendedUiTarget}
                {action.requiresHumanApproval ? " / approval required" : ""}
              </div>
              <div className="mt-1 text-[10px] whitespace-pre-wrap text-gray-700">
                {action.reason}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed bg-white px-2 py-2 text-gray-600">
          追加の next action はありません。
        </div>
      )}
    </div>
  );
}

type TranslateOutputView = {
  summary: string;
  translations: Array<{
    lang: string;
    text: string;
  }>;
};

function parseTranslateOutput(v: unknown): TranslateOutputView | null {
  if (!isRecord(v)) return null;
  const summary = asStringOrNull(v.summary);
  if (!summary) return null;

  const rows = asArray(v.translations);
  const translations: Array<{ lang: string; text: string }> = [];
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const lang = asStringOrNull(row.lang);
    const text = asStringOrNull(row.text);
    if (!lang || !text) continue;
    translations.push({ lang, text });
  }
  if (translations.length === 0) return null;
  return { summary, translations };
}

function TranslateOutputCard(props: { output: TranslateOutputView }) {
  const { output } = props;
  return (
    <div className="mt-1 rounded bg-gray-50 p-2 text-[11px] space-y-2">
      <div className="font-medium text-gray-800">{output.summary}</div>
      <div className="grid gap-1">
        {output.translations.slice(0, 4).map((item, idx) => (
          <div
            key={`${item.lang}:${idx.toString()}`}
            className="rounded border bg-white px-2 py-1 text-gray-800"
          >
            <div className="text-[10px] text-gray-500">{item.lang}</div>
            <div className="whitespace-pre-wrap">{item.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

type WeeklyReportOutputView = {
  summary: string;
  highlights: string[];
  actionItems: string[];
  reportingPeriod: {
    days: number;
    since: string;
    until: string;
  } | null;
  metricsSummary: {
    snapshotCount: number;
    totals: {
      views: number;
      likes: number;
      comments: number;
      shares: number;
    };
    interactionRate: number;
    topPlatform: {
      platform: string;
      interactionRate: number;
      views: number;
      interactions: number;
    } | null;
  } | null;
  supportSummary: {
    contributionCount: number;
    confirmedAmountTotal: number;
  } | null;
};

function parseWeeklyReportOutput(v: unknown): WeeklyReportOutputView | null {
  if (!isRecord(v)) return null;
  const summary = asStringOrNull(v.summary);
  if (!summary) return null;

  const highlights = asArray(v.highlights)
    .map(asStringOrNull)
    .filter((x): x is string => !!x);
  const actionItems = asArray(v.actionItems)
    .map(asStringOrNull)
    .filter((x): x is string => !!x);

  const reportingPeriodRaw = isRecord(v.reportingPeriod) ? v.reportingPeriod : null;
  const reportingPeriod = reportingPeriodRaw
    ? {
        days: asNumberOrNull(reportingPeriodRaw.days) ?? 0,
        since: asStringOrNull(reportingPeriodRaw.since) ?? "",
        until: asStringOrNull(reportingPeriodRaw.until) ?? "",
      }
    : null;

  const metricsRaw = isRecord(v.metricsSummary) ? v.metricsSummary : null;
  const totalsRaw = metricsRaw && isRecord(metricsRaw.totals) ? metricsRaw.totals : null;
  const topRaw = metricsRaw && isRecord(metricsRaw.topPlatform) ? metricsRaw.topPlatform : null;
  const metricsSummary =
    metricsRaw && totalsRaw
      ? {
          snapshotCount: asNumberOrNull(metricsRaw.snapshotCount) ?? 0,
          totals: {
            views: asNumberOrNull(totalsRaw.views) ?? 0,
            likes: asNumberOrNull(totalsRaw.likes) ?? 0,
            comments: asNumberOrNull(totalsRaw.comments) ?? 0,
            shares: asNumberOrNull(totalsRaw.shares) ?? 0,
          },
          interactionRate: asNumberOrNull(metricsRaw.interactionRate) ?? 0,
          topPlatform: topRaw
            ? {
                platform: asStringOrNull(topRaw.platform) ?? "",
                interactionRate: asNumberOrNull(topRaw.interactionRate) ?? 0,
                views: asNumberOrNull(topRaw.views) ?? 0,
                interactions: asNumberOrNull(topRaw.interactions) ?? 0,
              }
            : null,
        }
      : null;

  const supportRaw = isRecord(v.supportSummary) ? v.supportSummary : null;
  const supportSummary = supportRaw
    ? {
        contributionCount: asNumberOrNull(supportRaw.contributionCount) ?? 0,
        confirmedAmountTotal: asNumberOrNull(supportRaw.confirmedAmountTotal) ?? 0,
      }
    : null;

  return {
    summary,
    highlights,
    actionItems,
    reportingPeriod,
    metricsSummary,
    supportSummary,
  };
}

function WeeklyReportOutputCard(props: { output: WeeklyReportOutputView }) {
  const { output } = props;
  return (
    <div className="mt-1 rounded bg-gray-50 p-2 text-[11px] space-y-2">
      <div className="font-medium text-gray-800">{output.summary}</div>
      {output.reportingPeriod ? (
        <div>period: last {output.reportingPeriod.days} days</div>
      ) : null}
      {output.metricsSummary ? (
        <div className="rounded border bg-white p-1">
          views:{output.metricsSummary.totals.views} likes:
          {output.metricsSummary.totals.likes} comments:
          {output.metricsSummary.totals.comments} shares:
          {output.metricsSummary.totals.shares} rate:
          {(output.metricsSummary.interactionRate * 100).toFixed(2)}%
          {output.metricsSummary.topPlatform
            ? ` top:${output.metricsSummary.topPlatform.platform}`
            : ""}
        </div>
      ) : null}
      {output.supportSummary ? (
        <div className="rounded border bg-white p-1">
          support: {output.supportSummary.contributionCount} contributions / total{" "}
          {output.supportSummary.confirmedAmountTotal.toLocaleString()}
        </div>
      ) : null}
      {output.highlights.length > 0 ? (
        <ul className="list-disc pl-4">
          {output.highlights.slice(0, 3).map((item, idx) => (
            <li key={`${item}:${idx.toString()}`}>{item}</li>
          ))}
        </ul>
      ) : null}
      {output.actionItems.length > 0 ? (
        <ul className="list-disc pl-4">
          {output.actionItems.slice(0, 3).map((item, idx) => (
            <li key={`${item}:${idx.toString()}`}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

type DistributionPlanDraftTaskOutputView = {
  summary: string;
  draftPayload: DistributionPlanDraftPayload | null;
  projectSnapshot: {
    title: string;
    currency: "JPYC" | "USDC";
    status: string;
    settlementStatus: string | null;
  } | null;
};

function parseDistributionPlanDraftTaskOutput(
  value: unknown
): DistributionPlanDraftTaskOutputView | null {
  if (!isRecord(value)) return null;

  const summary = asStringOrNull(value.summary);
  if (!summary) return null;

  const draftPayloadRaw = isRecord(value.draftPayload) ? value.draftPayload : null;
  const projectId = draftPayloadRaw ? asStringOrNull(draftPayloadRaw.projectId) : null;
  const projectTitle = draftPayloadRaw
    ? asStringOrNull(draftPayloadRaw.projectTitle)
    : null;
  const projectStatus = draftPayloadRaw
    ? asStringOrNull(draftPayloadRaw.projectStatus)
    : null;
  const currency: "JPYC" | "USDC" | null =
    draftPayloadRaw?.currency === "JPYC" || draftPayloadRaw?.currency === "USDC"
      ? draftPayloadRaw.currency
      : null;
  const draftSummaryRaw =
    draftPayloadRaw && isRecord(draftPayloadRaw.summary)
      ? draftPayloadRaw.summary
      : null;
  const draftPayload =
    draftPayloadRaw && projectId && projectTitle && projectStatus && currency
      ? ({
          version: draftPayloadRaw.version === 1 ? 1 : 1,
          projectId,
          projectTitle,
          projectStatus,
          currency,
          generatedAt:
            asStringOrNull(draftPayloadRaw.generatedAt) ?? new Date(0).toISOString(),
          source:
            draftPayloadRaw.source === "existing_distribution_entries" ||
            draftPayloadRaw.source === "saved_distribution_plan" ||
            draftPayloadRaw.source === "bridged_total_template" ||
            draftPayloadRaw.source === "blank_template"
              ? draftPayloadRaw.source
              : "blank_template",
          summary: {
            goalAchieved: draftSummaryRaw?.goalAchieved === true,
            progressPct: draftSummaryRaw
              ? asNumberOrNull(draftSummaryRaw.progressPct)
              : null,
            settlementStatus: draftSummaryRaw
              ? asStringOrNull(draftSummaryRaw.settlementStatus)
              : null,
            bridgedTotalAtomic:
              (draftSummaryRaw
                ? asStringOrNull(draftSummaryRaw.bridgedTotalAtomic)
                : null) ?? "0",
          },
          rows: asArray(draftPayloadRaw.rows)
            .map((row) => {
              if (!isRecord(row)) return null;
              const recipientAddress = asStringOrNull(row.recipientAddress) ?? "";
              const amountAtomic = asStringOrNull(row.amountAtomic) ?? "";
              const memo = asStringOrNull(row.memo) ?? "";
              const token =
                row.token === "JPYC" || row.token === "USDC"
                  ? row.token
                  : currency;
              const id = asStringOrNull(row.id) ?? undefined;

              return {
                ...(id ? { id } : {}),
                recipientAddress,
                amountAtomic,
                memo,
                token,
              };
            })
            .filter(
              (
                row
              ): row is DistributionPlanDraftPayload["rows"][number] => row !== null
            ),
          notes: asArray(draftPayloadRaw.notes)
            .map(asStringOrNull)
            .filter((note): note is string => note !== null),
        } satisfies DistributionPlanDraftPayload)
      : null;

  const projectSnapshotRaw = isRecord(value.projectSnapshot)
    ? value.projectSnapshot
    : null;
  const projectSnapshotTitle = projectSnapshotRaw
    ? asStringOrNull(projectSnapshotRaw.title)
    : null;
  const projectSnapshotStatus = projectSnapshotRaw
    ? asStringOrNull(projectSnapshotRaw.status)
    : null;
  const projectSnapshotCurrency: "JPYC" | "USDC" | null =
    projectSnapshotRaw?.currency === "JPYC" ||
    projectSnapshotRaw?.currency === "USDC"
      ? projectSnapshotRaw.currency
      : null;
  const projectSnapshot =
    projectSnapshotRaw &&
    projectSnapshotTitle &&
    projectSnapshotStatus &&
    projectSnapshotCurrency
      ? {
          title: projectSnapshotTitle,
          currency: projectSnapshotCurrency,
          status: projectSnapshotStatus,
          settlementStatus: asStringOrNull(projectSnapshotRaw.settlementStatus),
        }
      : null;

  return {
    summary,
    draftPayload,
    projectSnapshot,
  };
}

function DistributionPlanDraftTaskOutputCard(props: {
  output: DistributionPlanDraftTaskOutputView;
}) {
  const { output } = props;
  const [copied, setCopied] = React.useState(false);
  const payloadText = output.draftPayload
    ? formatDistributionPlanDraftPayload(output.draftPayload)
    : null;

  React.useEffect(() => {
    if (!copied) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopied(false);
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  const openSettlementDraft = React.useCallback(() => {
    if (!output.draftPayload || typeof window === "undefined") {
      return;
    }

    const handoff = buildDistributionPlanDraftHandoff(output.draftPayload);

    try {
      window.localStorage.setItem(
        DISTRIBUTION_PLAN_DRAFT_HANDOFF_STORAGE_KEY,
        JSON.stringify(handoff)
      );
    } catch {
      return;
    }

    window.location.assign(
      buildSettlementDraftHref({
        pathname: window.location.pathname,
        currency: output.draftPayload.currency,
      })
    );
  }, [output.draftPayload]);

  const copyDraftJson = React.useCallback(async () => {
    if (
      !payloadText ||
      typeof window === "undefined" ||
      typeof window.navigator.clipboard?.writeText !== "function"
    ) {
      return;
    }

    try {
      await window.navigator.clipboard.writeText(payloadText);
      setCopied(true);
    } catch {
      return;
    }
  }, [payloadText]);

  return (
    <div className="mt-1 rounded bg-gray-50 p-2 text-[11px] space-y-2">
      <div className="font-medium text-gray-800">{output.summary}</div>
      {output.projectSnapshot ? (
        <div className="flex flex-wrap gap-2 text-[10px] text-gray-600">
          <span className="rounded-full border border-gray-200 bg-white px-2 py-1">
            {output.projectSnapshot.title}
          </span>
          <span className="rounded-full border border-gray-200 bg-white px-2 py-1">
            {output.projectSnapshot.currency}
          </span>
          <span className="rounded-full border border-gray-200 bg-white px-2 py-1">
            status: {output.projectSnapshot.status}
          </span>
          {output.projectSnapshot.settlementStatus ? (
            <span className="rounded-full border border-gray-200 bg-white px-2 py-1">
              settlement: {output.projectSnapshot.settlementStatus}
            </span>
          ) : null}
        </div>
      ) : null}
      {output.draftPayload ? (
        <>
          <div className="flex flex-wrap gap-2 text-[10px] text-gray-600">
            <span className="rounded-full border border-gray-200 bg-white px-2 py-1">
              source: {output.draftPayload.source}
            </span>
            <span className="rounded-full border border-gray-200 bg-white px-2 py-1">
              rows: {output.draftPayload.rows.length}
            </span>
            <span className="rounded-full border border-gray-200 bg-white px-2 py-1">
              currency: {output.draftPayload.currency}
            </span>
          </div>
          <div className="rounded border bg-white p-2">
            {output.draftPayload.rows.slice(0, 3).map((row, index) => (
              <div
                key={`${row.id ?? "row"}:${index.toString()}`}
                className="text-[10px] text-gray-700"
              >
                {index + 1}. {row.amountAtomic || "0"} /{" "}
                {row.recipientAddress || "recipientAddress 未設定"}
                {row.memo ? ` / ${row.memo}` : ""}
              </div>
            ))}
          </div>
          {output.draftPayload.notes.length > 0 ? (
            <ul className="list-disc pl-4">
              {output.draftPayload.notes.slice(0, 3).map((note, index) => (
                <li key={`${note}:${index.toString()}`}>{note}</li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-800"
              onClick={openSettlementDraft}
            >
              settlement Draft を開く
            </button>
            <button
              type="button"
              className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-800"
              onClick={() => {
                void copyDraftJson();
              }}
            >
              {copied ? "JSON をコピー済み" : "JSON をコピー"}
            </button>
          </div>
        </>
      ) : (
        <div className="rounded border bg-white px-2 py-1 text-gray-700">
          project 情報が不足しているため、Draft step に渡せる payload はまだありません。
        </div>
      )}
    </div>
  );
}

type AnnouncementDraftOutputView = {
  summary: string;
  headline: string;
  channel: string;
  body: string;
  callToAction: string | null;
  supportingPoints: string[];
};

function parseAnnouncementDraftOutput(v: unknown): AnnouncementDraftOutputView | null {
  if (!isRecord(v)) return null;
  const summary = asStringOrNull(v.summary);
  const headline = asStringOrNull(v.headline);
  const channel = asStringOrNull(v.channel);
  const body = asStringOrNull(v.body);
  if (!summary || !headline || !channel || !body) return null;

  const callToAction = asStringOrNull(v.callToAction);
  const supportingPoints = asArray(v.supportingPoints)
    .map(asStringOrNull)
    .filter((x): x is string => !!x);

  return {
    summary,
    headline,
    channel,
    body,
    callToAction,
    supportingPoints,
  };
}

function AnnouncementDraftOutputCard(props: {
  output: AnnouncementDraftOutputView;
  projectId: string | null;
}) {
  const { output, projectId } = props;
  const [copied, setCopied] = React.useState(false);
  const payloadText = buildAnnouncementPostingComposeText({
    headline: output.headline,
    body: output.body,
    callToAction: output.callToAction,
  });

  React.useEffect(() => {
    if (!copied) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopied(false);
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  const openPostingCompose = React.useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handoff = buildAnnouncementPostingComposeHandoff({
      projectId,
      channel: output.channel,
      summary: output.summary,
      headline: output.headline,
      body: output.body,
      callToAction: output.callToAction,
    });

    try {
      window.localStorage.setItem(
        POSTING_COMPOSE_HANDOFF_STORAGE_KEY,
        JSON.stringify(handoff)
      );
    } catch {
      return;
    }

    window.location.assign(
      buildPostingComposeHref({ pathname: window.location.pathname })
    );
  }, [
    output.body,
    output.callToAction,
    output.channel,
    output.headline,
    output.summary,
    projectId,
  ]);

  const copyDraftText = React.useCallback(async () => {
    if (
      typeof window === "undefined" ||
      typeof window.navigator.clipboard?.writeText !== "function"
    ) {
      return;
    }

    try {
      await window.navigator.clipboard.writeText(payloadText);
      setCopied(true);
    } catch {
      return;
    }
  }, [payloadText]);

  return (
    <div className="mt-1 rounded bg-gray-50 p-2 text-[11px] space-y-2">
      <div className="font-medium text-gray-800">{output.summary}</div>
      <div className="rounded border bg-white px-2 py-1">
        <div className="text-[10px] text-gray-500">{output.channel}</div>
        <div className="font-medium text-gray-800">{output.headline}</div>
        <div className="mt-1 whitespace-pre-wrap text-gray-700">{output.body}</div>
      </div>
      {output.supportingPoints.length > 0 ? (
        <ul className="list-disc pl-4">
          {output.supportingPoints.slice(0, 3).map((item, idx) => (
            <li key={`${item}:${idx.toString()}`}>{item}</li>
          ))}
        </ul>
      ) : null}
      {output.callToAction ? (
        <div className="rounded border bg-white px-2 py-1 text-gray-700">
          CTA: {output.callToAction}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-800"
          onClick={openPostingCompose}
        >
          posting compose を開く
        </button>
        <button
          type="button"
          className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-800"
          onClick={() => {
            void copyDraftText();
          }}
        >
          {copied ? "本文をコピー済み" : "本文をコピー"}
        </button>
      </div>
    </div>
  );
}

type OutputRenderer = {
  render: (output: unknown, projectId: string | null) => React.ReactNode | null;
};

const TASK_OUTPUT_RENDERERS: Partial<Record<TaskType, OutputRenderer>> = {
  MANAGER_NEXT_ACTIONS: {
    render: (output) => {
      const parsed = parseManagerNextActionsOutput(output);
      return parsed ? <ManagerNextActionsOutputCard output={parsed} /> : null;
    },
  },
  DISTRIBUTION_PLAN_DRAFT: {
    render: (output) => {
      const parsed = parseDistributionPlanDraftTaskOutput(output);
      return parsed ? <DistributionPlanDraftTaskOutputCard output={parsed} /> : null;
    },
  },
  ANALYZE: {
    render: (output) => {
      const parsed = parseAnalyzeOutput(output);
      return parsed ? <AnalyzeOutputCard output={parsed} /> : null;
    },
  },
  PROPOSE: {
    render: (output) => {
      const parsed = parseProposeOutput(output);
      return parsed ? <ProposeOutputCard output={parsed} /> : null;
    },
  },
  TRANSLATE: {
    render: (output) => {
      const parsed = parseTranslateOutput(output);
      return parsed ? <TranslateOutputCard output={parsed} /> : null;
    },
  },
  WEEKLY_REPORT: {
    render: (output) => {
      const parsed = parseWeeklyReportOutput(output);
      return parsed ? <WeeklyReportOutputCard output={parsed} /> : null;
    },
  },
  ANNOUNCEMENT_DRAFT: {
    render: (output, projectId) => {
      const parsed = parseAnnouncementDraftOutput(output);
      return parsed ? (
        <AnnouncementDraftOutputCard output={parsed} projectId={projectId} />
      ) : null;
    },
  },
  SUPPORTER_MESSAGE_DRAFT: {
    render: (output) => {
      const parsed = parseSupporterMessageDraftOutput(output);
      return parsed ? <SupporterMessageDraftOutputCard output={parsed} /> : null;
    },
  },
};

export function AgentTaskOutput(props: {
  taskType: string;
  output: unknown;
  projectId: string | null;
}) {
  const { taskType, output, projectId } = props;
  const renderer = TASK_OUTPUT_RENDERERS[taskType as TaskType];
  const rendered = renderer?.render(output, projectId) ?? null;

  if (rendered) return rendered;

  return (
    <pre className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-2 text-[11px]">
      {stringifyOutput(output)}
    </pre>
  );
}

type SupporterMessageDraftOutputView = {
  summary: string;
  audience: string;
  purpose: string;
  subject: string;
  body: string;
  closing: string;
  supportingPoints: string[];
};

function parseSupporterMessageDraftOutput(
  v: unknown
): SupporterMessageDraftOutputView | null {
  if (!isRecord(v)) return null;
  const summary = asStringOrNull(v.summary);
  const audience = asStringOrNull(v.audience);
  const purpose = asStringOrNull(v.purpose);
  const subject = asStringOrNull(v.subject);
  const body = asStringOrNull(v.body);
  const closing = asStringOrNull(v.closing);
  if (!summary || !audience || !purpose || !subject || !body || !closing) return null;

  const supportingPoints = asArray(v.supportingPoints)
    .map(asStringOrNull)
    .filter((x): x is string => !!x);

  return { summary, audience, purpose, subject, body, closing, supportingPoints };
}

function SupporterMessageDraftOutputCard(props: {
  output: SupporterMessageDraftOutputView;
}) {
  const { output } = props;
  const [copied, setCopied] = React.useState(false);
  const payloadText = [output.subject, output.body].join("\n\n");

  React.useEffect(() => {
    if (!copied) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopied(false);
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  const copyDraftText = React.useCallback(async () => {
    if (
      typeof window === "undefined" ||
      typeof window.navigator.clipboard?.writeText !== "function"
    ) {
      return;
    }

    try {
      await window.navigator.clipboard.writeText(payloadText);
      setCopied(true);
    } catch {
      return;
    }
  }, [payloadText]);

  return (
    <div className="mt-1 rounded bg-gray-50 p-2 text-[11px] space-y-2">
      <div className="font-medium text-gray-800">{output.summary}</div>
      <div className="rounded border bg-white px-2 py-1">
        <div className="text-[10px] text-gray-500">
          {output.audience} / {output.purpose}
        </div>
        <div className="font-medium text-gray-800">{output.subject}</div>
        <div className="mt-1 whitespace-pre-wrap text-gray-700">{output.body}</div>
      </div>
      {output.supportingPoints.length > 0 ? (
        <ul className="list-disc pl-4">
          {output.supportingPoints.slice(0, 3).map((item, idx) => (
            <li key={`${item}:${idx.toString()}`}>{item}</li>
          ))}
        </ul>
      ) : null}
      <div className="rounded border bg-white px-2 py-1 text-gray-700">
        この下書きは支援者向けのため、public posting compose には直接渡しません。
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-800"
          onClick={() => {
            void copyDraftText();
          }}
        >
          {copied ? "本文をコピー済み" : "本文をコピー"}
        </button>
      </div>
    </div>
  );
}
