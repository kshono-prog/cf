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
  buildTranslatePostingComposeHandoff,
  buildSupportStoryPostingComposeHandoff,
  buildProposePostingComposeHandoff,
  buildPostingComposeHref,
  POSTING_COMPOSE_HANDOFF_STORAGE_KEY,
} from "@/components/mypage/postingComposeHandoff";
import {
  formatDistributionPlanDraftPayload,
  type DistributionPlanDraftPayload,
} from "@/lib/creator-ai/distributionPlanDraft";
import type { TaskType } from "@/lib/agentTaskParsers";
import { AGENT_TASK_AUDIT_ACTION } from "@/lib/agentTaskAudit";
import { recordAgentTaskFollowThrough } from "@/lib/agentTaskFollowThroughClient";

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

type OutputActionContext = {
  projectId: string | null;
  taskId: string;
  walletAddress: string | null;
};

function recordPostingComposeOpened(context: {
  taskId: string;
  walletAddress: string | null;
}): void {
  recordAgentTaskFollowThrough({
    address: context.walletAddress,
    taskId: context.taskId,
    action: AGENT_TASK_AUDIT_ACTION.POSTING_COMPOSE_OPENED,
    keepalive: true,
  });
}

function recordOutputCopied(context: {
  taskId: string;
  walletAddress: string | null;
}): void {
  recordAgentTaskFollowThrough({
    address: context.walletAddress,
    taskId: context.taskId,
    action: AGENT_TASK_AUDIT_ACTION.OUTPUT_COPIED,
  });
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
    <div className="mt-1 rounded-xl bg-[var(--surface-subtle)] p-3 text-[11px] space-y-2">
      <div className="font-medium text-[var(--text)]">{output.summary}</div>
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
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1">
          {points.map((point) => (
            <div key={point.date} className="text-[10px] text-[var(--text)]">
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

function ProposeOutputCard(props: {
  output: ProposeOutputView;
  projectId: string | null;
  taskId: string;
  walletAddress: string | null;
}) {
  const { output, projectId, taskId, walletAddress } = props;
  const [sentIdx, setSentIdx] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (sentIdx === null) return;
    const id = window.setTimeout(() => setSentIdx(null), 2000);
    return () => window.clearTimeout(id);
  }, [sentIdx]);

  const openComposeWith = React.useCallback(
    (proposalText: string, idx: number) => {
      if (typeof window === "undefined") return;
      const handoff = buildProposePostingComposeHandoff({ projectId, proposalText });
      try {
        window.localStorage.setItem(
          POSTING_COMPOSE_HANDOFF_STORAGE_KEY,
          JSON.stringify(handoff)
        );
      } catch {
        return;
      }
      setSentIdx(idx);
      recordPostingComposeOpened({ taskId, walletAddress });
      window.location.assign(
        buildPostingComposeHref({ pathname: window.location.pathname })
      );
    },
    [projectId, taskId, walletAddress]
  );

  return (
    <div className="mt-1 rounded-xl bg-[var(--surface-subtle)] p-3 text-[11px] space-y-2">
      <div className="font-medium text-[var(--text)]">{output.summary}</div>
      {output.metricsHint.length > 0 ? (
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1">
          {output.metricsHint.slice(0, 3).map((item) => (
            <div key={item.platform} className="text-[10px] text-[var(--text)]">
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
            className="rounded border bg-white px-2 py-1 text-[var(--text)]"
          >
            <div>{idx + 1}. {proposal}</div>
            <button
              type="button"
              className="mt-1 rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-[var(--text)]"
              onClick={() => {
                openComposeWith(proposal, idx);
              }}
            >
              {sentIdx === idx ? "送信済み" : "compose に送る"}
            </button>
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
  return "border-gray-200 bg-gray-100 text-[var(--text)]";
}

function ManagerNextActionsOutputCard(props: {
  output: ManagerNextActionsOutputView;
}) {
  const { output } = props;
  return (
    <div className="mt-1 rounded-xl bg-[var(--surface-subtle)] p-3 text-[11px] space-y-2">
      <div className="font-medium text-[var(--text)]">{output.summary}</div>
      {output.projectSnapshot ? (
        <div className="rounded border bg-white p-2 text-[var(--text)]">
          <div className="font-medium text-[var(--text)]">
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
          <span className="status-badge status-badge-neutral">
            progress: {Math.floor(output.evidence.progressPct)}%
          </span>
          <span className="status-badge status-badge-neutral">
            goal: {output.evidence.goalConfigured ? "set" : "missing"}
          </span>
          <span className="status-badge status-badge-neutral">
            achieved: {output.evidence.goalAchieved ? "yes" : "no"}
          </span>
          <span className="status-badge status-badge-neutral">
            plan: {output.evidence.distributionPlanMissing ? "missing" : "ready"}
          </span>
          <span className="status-badge status-badge-neutral">
            bridge: {output.evidence.bridgeReflected ? "reflected" : "pending"}
          </span>
          <span className="status-badge status-badge-neutral">
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
              className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-[var(--text)]"
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
              <div className="mt-1 text-[10px] text-[var(--text-subtle)]">
                target: {action.recommendedUiTarget}
                {action.requiresHumanApproval ? " / approval required" : ""}
              </div>
              <div className="mt-1 text-[10px] whitespace-pre-wrap text-[var(--text)]">
                {action.reason}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-[var(--text-subtle)]">
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

function TranslateOutputCard(props: {
  output: TranslateOutputView;
  projectId: string | null;
  taskId: string;
  walletAddress: string | null;
}) {
  const { output, projectId, taskId, walletAddress } = props;
  const [sentLang, setSentLang] = React.useState<string | null>(null);

  const openComposeWith = React.useCallback(
    (lang: string, text: string) => {
      if (typeof window === "undefined") return;

      const handoff = buildTranslatePostingComposeHandoff({
        projectId,
        lang,
        translatedText: text,
      });

      try {
        window.localStorage.setItem(
          POSTING_COMPOSE_HANDOFF_STORAGE_KEY,
          JSON.stringify(handoff)
        );
      } catch {
        return;
      }

      setSentLang(lang);
      recordPostingComposeOpened({ taskId, walletAddress });
      window.location.assign(
        buildPostingComposeHref({ pathname: window.location.pathname })
      );
    },
    [projectId, taskId, walletAddress]
  );

  return (
    <div className="mt-1 rounded-xl bg-[var(--surface-subtle)] p-3 text-[11px] space-y-2">
      <div className="font-medium text-[var(--text)]">{output.summary}</div>
      <div className="grid gap-1">
        {output.translations.slice(0, 4).map((item, idx) => (
          <div
            key={`${item.lang}:${idx.toString()}`}
            className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-[var(--text)]"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] text-[var(--text-subtle)]">{item.lang}</div>
              <button
                type="button"
                className="shrink-0 rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--text)]"
                onClick={() => openComposeWith(item.lang, item.text)}
              >
                {sentLang === item.lang ? "送信済み" : "compose に送る"}
              </button>
            </div>
            <div className="mt-1 whitespace-pre-wrap">{item.text}</div>
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
    <div className="mt-1 rounded-xl bg-[var(--surface-subtle)] p-3 text-[11px] space-y-2">
      <div className="font-medium text-[var(--text)]">{output.summary}</div>
      {output.reportingPeriod ? (
        <div>period: last {output.reportingPeriod.days} days</div>
      ) : null}
      {output.metricsSummary ? (
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1">
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
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1">
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
  taskId: string;
}) {
  const { output, taskId } = props;
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

    const handoff = buildDistributionPlanDraftHandoff(output.draftPayload, {
      sourceTaskId: taskId,
    });

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
  }, [output.draftPayload, taskId]);

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
    <div className="mt-1 rounded-xl bg-[var(--surface-subtle)] p-3 text-[11px] space-y-2">
      <div className="font-medium text-[var(--text)]">{output.summary}</div>
      {output.projectSnapshot ? (
        <div className="flex flex-wrap gap-2 text-[10px] text-[var(--text-subtle)]">
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
          <div className="flex flex-wrap gap-2 text-[10px] text-[var(--text-subtle)]">
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
          <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-2">
            {output.draftPayload.rows.slice(0, 3).map((row, index) => (
              <div
                key={`${row.id ?? "row"}:${index.toString()}`}
                className="text-[10px] text-[var(--text)]"
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
              className="btn-secondary text-[11px]"
              onClick={openSettlementDraft}
            >
              settlement Draft を開く
            </button>
            <button
              type="button"
              className="btn-secondary text-[11px]"
              onClick={() => {
                void copyDraftJson();
              }}
            >
              {copied ? "JSON をコピー済み" : "JSON をコピー"}
            </button>
          </div>
        </>
      ) : (
        <div className="rounded border bg-white px-2 py-1 text-[var(--text)]">
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
  taskId: string;
  walletAddress: string | null;
}) {
  const { output, projectId, taskId, walletAddress } = props;
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

    recordPostingComposeOpened({ taskId, walletAddress });
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
    taskId,
    walletAddress,
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
    <div className="mt-1 rounded-xl bg-[var(--surface-subtle)] p-3 text-[11px] space-y-2">
      <div className="font-medium text-[var(--text)]">{output.summary}</div>
      <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1">
        <div className="text-[10px] text-[var(--text-subtle)]">{output.channel}</div>
        <div className="font-medium text-[var(--text)]">{output.headline}</div>
        <div className="mt-1 whitespace-pre-wrap text-[var(--text)]">{output.body}</div>
      </div>
      {output.supportingPoints.length > 0 ? (
        <ul className="list-disc pl-4">
          {output.supportingPoints.slice(0, 3).map((item, idx) => (
            <li key={`${item}:${idx.toString()}`}>{item}</li>
          ))}
        </ul>
      ) : null}
      {output.callToAction ? (
        <div className="rounded border bg-white px-2 py-1 text-[var(--text)]">
          CTA: {output.callToAction}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary text-[11px]"
          onClick={openPostingCompose}
        >
          posting compose を開く
        </button>
        <button
          type="button"
          className="btn-secondary text-[11px]"
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

type ProfileProposalView = {
  field: string;
  priority: "high" | "medium" | "low";
  reason: string;
  suggestionNote: string;
};

type ProfileUpdateProposalOutputView = {
  summary: string;
  profileSnapshot: {
    displayName: string;
    hasProfileText: boolean;
    hasAvatar: boolean;
    hasExternalUrl: boolean;
    hasCreatorType: boolean;
    socialLinkCount: number;
  };
  proposals: ProfileProposalView[];
  nextActions: string[];
};

function isProfilePriority(v: unknown): v is ProfileProposalView["priority"] {
  return v === "high" || v === "medium" || v === "low";
}

function parseProfileUpdateProposalOutput(
  v: unknown
): ProfileUpdateProposalOutputView | null {
  if (!isRecord(v)) return null;
  const summary = asStringOrNull(v.summary);
  if (!summary) return null;

  const snapshotRaw = isRecord(v.profileSnapshot) ? v.profileSnapshot : null;
  if (!snapshotRaw) return null;
  const profileSnapshot = {
    displayName: asStringOrNull(snapshotRaw.displayName) ?? "",
    hasProfileText: snapshotRaw.hasProfileText === true,
    hasAvatar: snapshotRaw.hasAvatar === true,
    hasExternalUrl: snapshotRaw.hasExternalUrl === true,
    hasCreatorType: snapshotRaw.hasCreatorType === true,
    socialLinkCount: asNumberOrNull(snapshotRaw.socialLinkCount) ?? 0,
  };

  const proposals: ProfileProposalView[] = [];
  for (const item of asArray(v.proposals)) {
    if (!isRecord(item)) continue;
    const field = asStringOrNull(item.field);
    const priority = item.priority;
    const reason = asStringOrNull(item.reason);
    const suggestionNote = asStringOrNull(item.suggestionNote);
    if (!field || !isProfilePriority(priority) || !reason || !suggestionNote) continue;
    proposals.push({ field, priority, reason, suggestionNote });
  }

  const nextActions = asArray(v.nextActions)
    .map(asStringOrNull)
    .filter((x): x is string => !!x);

  return { summary, profileSnapshot, proposals, nextActions };
}

function profilePriorityBadgeClass(
  priority: ProfileProposalView["priority"]
): string {
  if (priority === "high") return "border-rose-200 bg-rose-50 text-rose-700";
  if (priority === "medium") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-gray-200 bg-gray-100 text-[var(--text)]";
}

function ProfileUpdateProposalOutputCard(props: {
  output: ProfileUpdateProposalOutputView;
}) {
  const { output } = props;
  const snap = output.profileSnapshot;

  const chips = [
    { label: "紹介文", ok: snap.hasProfileText },
    { label: "アイコン", ok: snap.hasAvatar },
    { label: "SNSリンク", ok: snap.socialLinkCount > 0 },
    { label: "外部URL", ok: snap.hasExternalUrl },
    { label: "タイプ", ok: snap.hasCreatorType },
  ];

  return (
    <div className="mt-1 rounded-xl bg-[var(--surface-subtle)] p-3 text-[11px] space-y-2">
      <div className="font-medium text-[var(--text)]">{output.summary}</div>
      <div className="flex flex-wrap gap-1">
        {chips.map((chip) => (
          <span
            key={chip.label}
            className={`rounded-full border px-2 py-0.5 text-[10px] ${
              chip.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-gray-200 bg-white text-[var(--text-subtle)]"
            }`}
          >
            {chip.ok ? "✓" : "–"} {chip.label}
          </span>
        ))}
        <span className="status-badge status-badge-neutral">
          SNS {snap.socialLinkCount.toString()}件
        </span>
      </div>
      {output.proposals.length > 0 ? (
        <div className="grid gap-1">
          {output.proposals.slice(0, 5).map((proposal) => (
            <div
              key={proposal.field}
              className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-[var(--text)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium">{proposal.suggestionNote}</div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${profilePriorityBadgeClass(proposal.priority)}`}
                >
                  {proposal.priority}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-[var(--text-subtle)]">
                {proposal.reason}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-[var(--text-subtle)]">
          現時点で改善提案はありません。
        </div>
      )}
      {output.nextActions.length > 0 ? (
        <ul className="list-disc pl-4">
          {output.nextActions.map((action, idx) => (
            <li key={`${action}:${idx.toString()}`}>{action}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// ── DAILY_ACTION_PLAN ──────────────────────────────────────────────────────

type DailyAction = {
  id: string;
  title: string;
  reason: string;
  priority: "high" | "medium" | "low";
  category: string;
};

type DailyActionPlanOutputView = {
  summary: string;
  actions: DailyAction[];
  generatedAt: string;
  context: {
    daysSinceLastPost: number | null;
    pendingApprovals: number;
    recentContributionCount: number;
  };
};

function isDailyPriority(v: unknown): v is DailyAction["priority"] {
  return v === "high" || v === "medium" || v === "low";
}

function parseDailyActionPlanOutput(
  v: unknown
): DailyActionPlanOutputView | null {
  if (!isRecord(v)) return null;
  const summary = asStringOrNull(v.summary);
  if (!summary) return null;

  const actions: DailyAction[] = [];
  for (const item of asArray(v.actions)) {
    if (!isRecord(item)) continue;
    const id = asStringOrNull(item.id);
    const title = asStringOrNull(item.title);
    const reason = asStringOrNull(item.reason);
    const priority = item.priority;
    const category = asStringOrNull(item.category) ?? "general";
    if (!id || !title || !reason || !isDailyPriority(priority)) continue;
    actions.push({ id, title, reason, priority, category });
  }

  const ctxRaw = isRecord(v.context) ? v.context : null;
  const context = {
    daysSinceLastPost: ctxRaw ? asNumberOrNull(ctxRaw.daysSinceLastPost) : null,
    pendingApprovals: ctxRaw ? (asNumberOrNull(ctxRaw.pendingApprovals) ?? 0) : 0,
    recentContributionCount: ctxRaw
      ? (asNumberOrNull(ctxRaw.recentContributionCount) ?? 0)
      : 0,
  };

  return { summary, actions, generatedAt: asStringOrNull(v.generatedAt) ?? "", context };
}

function dailyPriorityBadgeClass(priority: DailyAction["priority"]): string {
  if (priority === "high") return "border-rose-200 bg-rose-50 text-rose-700";
  if (priority === "medium") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-[var(--line)] bg-[var(--surface-subtle)] text-[var(--text-subtle)]";
}

function DailyActionPlanOutputCard(props: {
  output: DailyActionPlanOutputView;
}) {
  const { output } = props;
  return (
    <div className="mt-1 rounded-xl bg-[var(--surface-subtle)] p-3 text-[11px] space-y-2">
      <div className="font-medium text-[var(--text)]">{output.summary}</div>
      <div className="grid gap-1">
        {output.actions.map((action) => (
          <div
            key={action.id}
            className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-[var(--text)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium">{action.title}</div>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${dailyPriorityBadgeClass(action.priority)}`}
              >
                {action.priority}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-[var(--text-subtle)]">{action.reason}</div>
          </div>
        ))}
      </div>
      {output.context.daysSinceLastPost !== null && output.context.daysSinceLastPost >= 3 ? (
        <div className="text-[10px] text-[var(--text-subtle)]">
          最終投稿から {output.context.daysSinceLastPost.toString()}日 / 承認待ち{" "}
          {output.context.pendingApprovals.toString()}件
        </div>
      ) : null}
    </div>
  );
}

// ── ACTIVITY_RESTART_PROPOSAL ──────────────────────────────────────────────

type RestartStep = {
  step: number;
  title: string;
  description: string;
  effort: "low" | "medium" | "high";
};

type ActivityRestartProposalOutputView = {
  summary: string;
  inactivityContext: {
    daysSinceLastPost: number | null;
    inactivityNote: string;
  };
  successPatterns: string[];
  restartSteps: RestartStep[];
};

function isRestartEffort(v: unknown): v is RestartStep["effort"] {
  return v === "low" || v === "medium" || v === "high";
}

function parseActivityRestartProposalOutput(
  v: unknown
): ActivityRestartProposalOutputView | null {
  if (!isRecord(v)) return null;
  const summary = asStringOrNull(v.summary);
  if (!summary) return null;

  const inactCtxRaw = isRecord(v.inactivityContext) ? v.inactivityContext : null;
  const inactivityContext = {
    daysSinceLastPost: inactCtxRaw
      ? asNumberOrNull(inactCtxRaw.daysSinceLastPost)
      : null,
    inactivityNote: inactCtxRaw
      ? (asStringOrNull(inactCtxRaw.inactivityNote) ?? "")
      : "",
  };

  const successPatterns = asArray(v.successPatterns)
    .map(asStringOrNull)
    .filter((x): x is string => !!x);

  const restartSteps: RestartStep[] = [];
  for (const item of asArray(v.restartSteps)) {
    if (!isRecord(item)) continue;
    const step = asNumberOrNull(item.step) ?? 0;
    const title = asStringOrNull(item.title);
    const description = asStringOrNull(item.description);
    const effort = item.effort;
    if (!title || !description || !isRestartEffort(effort)) continue;
    restartSteps.push({ step, title, description, effort });
  }

  return { summary, inactivityContext, successPatterns, restartSteps };
}

function ActivityRestartProposalOutputCard(props: {
  output: ActivityRestartProposalOutputView;
}) {
  const { output } = props;
  return (
    <div className="mt-1 rounded-xl bg-[var(--surface-subtle)] p-3 text-[11px] space-y-2">
      <div className="font-medium text-[var(--text)]">{output.summary}</div>
      {output.inactivityContext.inactivityNote ? (
        <div className="text-[10px] text-[var(--text-subtle)]">
          {output.inactivityContext.inactivityNote}
        </div>
      ) : null}
      {output.successPatterns.length > 0 ? (
        <div className="space-y-1">
          <div className="text-[10px] font-medium text-[var(--text)]">
            過去の成功パターン
          </div>
          {output.successPatterns.slice(0, 3).map((pattern, idx) => (
            <div
              key={`${pattern}:${idx.toString()}`}
              className="rounded border bg-white px-2 py-1 text-[10px] text-[var(--text)]"
            >
              {pattern}
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid gap-1">
        {output.restartSteps.map((step) => (
          <div
            key={step.step}
            className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-[var(--text)]"
          >
            <div className="font-medium">
              {step.step}. {step.title}
            </div>
            <div className="mt-1 text-[10px] text-[var(--text-subtle)]">{step.description}</div>
            <div className="mt-1 text-[10px] text-[var(--text-subtle)]">
              手間: {step.effort}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SUPPORT_STORY_DRAFT ────────────────────────────────────────────────────

type SupportStoryDraftOutputView = {
  summary: string;
  storyText: string;
  sections: {
    why: string;
    what: string;
    progress: string;
  };
};

function parseSupportStoryDraftOutput(
  v: unknown
): SupportStoryDraftOutputView | null {
  if (!isRecord(v)) return null;
  const summary = asStringOrNull(v.summary);
  const storyText = asStringOrNull(v.storyText);
  if (!summary || !storyText) return null;

  const sectRaw = isRecord(v.sections) ? v.sections : null;
  const sections = {
    why: sectRaw ? (asStringOrNull(sectRaw.why) ?? "") : "",
    what: sectRaw ? (asStringOrNull(sectRaw.what) ?? "") : "",
    progress: sectRaw ? (asStringOrNull(sectRaw.progress) ?? "") : "",
  };

  return { summary, storyText, sections };
}

function SupportStoryDraftOutputCard(props: {
  output: SupportStoryDraftOutputView;
  projectId: string | null;
  taskId: string;
  walletAddress: string | null;
}) {
  const { output, projectId, taskId, walletAddress } = props;
  const [copied, setCopied] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  React.useEffect(() => {
    if (!sent) return;
    const id = window.setTimeout(() => setSent(false), 2000);
    return () => window.clearTimeout(id);
  }, [sent]);

  const copyStory = React.useCallback(async () => {
    if (
      typeof window === "undefined" ||
      typeof window.navigator.clipboard?.writeText !== "function"
    ) {
      return;
    }
    try {
      await window.navigator.clipboard.writeText(output.storyText);
      setCopied(true);
    } catch {
      return;
    }
  }, [output.storyText]);

  const openPostingCompose = React.useCallback(() => {
    if (typeof window === "undefined") return;
    const handoff = buildSupportStoryPostingComposeHandoff({
      projectId,
      storyText: output.storyText,
    });
    try {
      window.localStorage.setItem(
        POSTING_COMPOSE_HANDOFF_STORAGE_KEY,
        JSON.stringify(handoff)
      );
    } catch {
      return;
    }
    setSent(true);
    recordPostingComposeOpened({ taskId, walletAddress });
    window.location.assign(
      buildPostingComposeHref({ pathname: window.location.pathname })
    );
  }, [projectId, output.storyText, taskId, walletAddress]);

  return (
    <div className="mt-1 rounded-xl bg-[var(--surface-subtle)] p-3 text-[11px] space-y-2">
      <div className="font-medium text-[var(--text)]">{output.summary}</div>
      <div className="rounded border bg-white px-2 py-2 space-y-2">
        {output.sections.why ? (
          <div>
            <div className="text-[10px] font-medium text-[var(--text-subtle)]">
              なぜ支援が必要か
            </div>
            <div className="mt-0.5 text-[var(--text)]">{output.sections.why}</div>
          </div>
        ) : null}
        {output.sections.what ? (
          <div>
            <div className="text-[10px] font-medium text-[var(--text-subtle)]">
              何が実現するか
            </div>
            <div className="mt-0.5 text-[var(--text)]">{output.sections.what}</div>
          </div>
        ) : null}
        {output.sections.progress ? (
          <div>
            <div className="text-[10px] font-medium text-[var(--text-subtle)]">
              いまの進捗
            </div>
            <div className="mt-0.5 text-[var(--text)]">{output.sections.progress}</div>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary text-[11px]"
          onClick={openPostingCompose}
        >
          {sent ? "送信済み" : "compose に送る"}
        </button>
        <button
          type="button"
          className="btn-secondary text-[11px]"
          onClick={() => {
            void copyStory();
          }}
        >
          {copied ? "ストーリーをコピー済み" : "ストーリーをコピー"}
        </button>
      </div>
    </div>
  );
}

// ── SUPPORTER_RESULT_REPORT ────────────────────────────────────────────────

type PurposeBreakdownItem = {
  purposeLabel: string;
  confirmedAmount: number;
  contributionCount: number;
};

type SupporterResultReportOutputView = {
  summary: string;
  goalLabel: string;
  achievedAt: string | null;
  currency: string;
  purposeBreakdown: PurposeBreakdownItem[];
  totalAmount: number;
  distributionNote: string;
  activityAfterNote: string;
};

function parseSupporterResultReportOutput(
  v: unknown
): SupporterResultReportOutputView | null {
  if (!isRecord(v)) return null;
  const summary = asStringOrNull(v.summary);
  const goalLabel = asStringOrNull(v.goalLabel);
  if (!summary || !goalLabel) return null;

  const currency = asStringOrNull(v.currency) ?? "JPYC";
  const achievedAt = asStringOrNull(v.achievedAt);
  const totalAmount = asNumberOrNull(v.totalAmount) ?? 0;
  const distributionNote = asStringOrNull(v.distributionNote) ?? "";
  const activityAfterNote = asStringOrNull(v.activityAfterNote) ?? "";

  const purposeBreakdown: PurposeBreakdownItem[] = [];
  for (const item of asArray(v.purposeBreakdown)) {
    if (!isRecord(item)) continue;
    const purposeLabel = asStringOrNull(item.purposeLabel);
    if (!purposeLabel) continue;
    purposeBreakdown.push({
      purposeLabel,
      confirmedAmount: asNumberOrNull(item.confirmedAmount) ?? 0,
      contributionCount: asNumberOrNull(item.contributionCount) ?? 0,
    });
  }

  return {
    summary,
    goalLabel,
    achievedAt,
    currency,
    purposeBreakdown,
    totalAmount,
    distributionNote,
    activityAfterNote,
  };
}

function SupporterResultReportOutputCard(props: {
  output: SupporterResultReportOutputView;
}) {
  const { output } = props;
  const maxAmount = Math.max(
    ...output.purposeBreakdown.map((p) => p.confirmedAmount),
    1
  );

  return (
    <div className="mt-1 rounded-xl bg-[var(--surface-subtle)] p-3 text-[11px] space-y-2">
      <div className="font-medium text-[var(--text)]">{output.summary}</div>
      <div className="flex flex-wrap gap-1 text-[10px] text-[var(--text-subtle)]">
        <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5">
          {output.goalLabel}
        </span>
        <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5">
          {output.currency}
        </span>
        {output.achievedAt ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">
            達成済み
          </span>
        ) : (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
            達成前
          </span>
        )}
      </div>
      {output.purposeBreakdown.length > 0 ? (
        <div className="space-y-1">
          <div className="text-[10px] font-medium text-[var(--text-subtle)]">用途別内訳</div>
          {output.purposeBreakdown.slice(0, 6).map((item) => (
            <div key={item.purposeLabel} className="space-y-0.5">
              <div className="flex items-center justify-between text-[10px] text-[var(--text)]">
                <span>{item.purposeLabel}</span>
                <span>
                  {item.confirmedAmount.toLocaleString()} {output.currency}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-[var(--line)]">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{
                    width: `${Math.round((item.confirmedAmount / maxAmount) * 100).toString()}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 space-y-1 text-[10px] text-[var(--text)]">
        <div>合計: {output.totalAmount.toLocaleString()} {output.currency}</div>
        <div>{output.distributionNote}</div>
        <div>{output.activityAfterNote}</div>
      </div>
    </div>
  );
}

// ── GROWTH_OPPORTUNITY_ALERT ────────────────────────────────────────────────

type GrowthOpportunityItem = {
  type: string;
  title: string;
  insight: string;
  action: string;
  priority: "high" | "medium" | "low";
};

type GrowthOpportunityAlertOutputView = {
  summary: string;
  opportunities: GrowthOpportunityItem[];
  metricsContext: {
    totalViews: number;
    totalInteractions: number;
    engagementRate: number;
    topPlatform: string | null;
    snapshotCount: number;
  } | null;
};

function parseGrowthOpportunityAlertOutput(
  v: unknown
): GrowthOpportunityAlertOutputView | null {
  if (!isRecord(v)) return null;
  const summary = asStringOrNull(v.summary);
  if (!summary) return null;
  const opportunities = asArray(v.opportunities)
    .filter(isRecord)
    .map((item) => ({
      type: asStringOrNull(item.type) ?? "content_gap",
      title: asStringOrNull(item.title) ?? "",
      insight: asStringOrNull(item.insight) ?? "",
      action: asStringOrNull(item.action) ?? "",
      priority: (["high", "medium", "low"] as const).includes(
        item.priority as "high" | "medium" | "low"
      )
        ? (item.priority as "high" | "medium" | "low")
        : "low",
    }))
    .filter((o) => o.title);
  const mc = isRecord(v.metricsContext) ? v.metricsContext : null;
  const metricsContext = mc
    ? {
        totalViews: asNumberOrNull(mc.totalViews) ?? 0,
        totalInteractions: asNumberOrNull(mc.totalInteractions) ?? 0,
        engagementRate: asNumberOrNull(mc.engagementRate) ?? 0,
        topPlatform: asStringOrNull(mc.topPlatform),
        snapshotCount: asNumberOrNull(mc.snapshotCount) ?? 0,
      }
    : null;
  return { summary, opportunities, metricsContext };
}

const PRIORITY_BADGE: Record<"high" | "medium" | "low", string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-[var(--line)] text-[var(--muted)]",
};
const PRIORITY_LABEL: Record<"high" | "medium" | "low", string> = {
  high: "高",
  medium: "中",
  low: "低",
};

function GrowthOpportunityAlertOutputCard({
  output,
}: {
  output: GrowthOpportunityAlertOutputView;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--text)]">{output.summary}</p>

      {output.metricsContext && output.metricsContext.snapshotCount > 0 && (
        <div className="flex flex-wrap gap-2 text-[11px] text-[var(--muted)]">
          <span>
            再生/表示 {output.metricsContext.totalViews.toLocaleString()}
          </span>
          <span>
            反応 {output.metricsContext.totalInteractions.toLocaleString()}
          </span>
          <span>
            反応率{" "}
            {(output.metricsContext.engagementRate * 100).toFixed(2)}%
          </span>
          {output.metricsContext.topPlatform && (
            <span>TOP: {output.metricsContext.topPlatform}</span>
          )}
        </div>
      )}

      {output.opportunities.length === 0 && (
        <p className="text-xs text-[var(--muted)]">
          指標データを記録すると成長機会の分析が可能になります。
        </p>
      )}

      <div className="space-y-2">
        {output.opportunities.map((opp, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3 space-y-1"
          >
            <div className="flex items-start gap-2">
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_BADGE[opp.priority]}`}
              >
                優先度{PRIORITY_LABEL[opp.priority]}
              </span>
              <span className="text-[13px] font-medium text-[var(--text)]">
                {opp.title}
              </span>
            </div>
            <p className="text-[11px] text-[var(--muted)]">{opp.insight}</p>
            <p className="text-[11px] font-medium text-[var(--text)]">
              → {opp.action}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CAREER_PLAN_DRAFT ──────────────────────────────────────────────────────

type CareerPlanDraftOutputView = {
  summary: string;
  currentPhase: string;
  milestones3mo: string[];
  milestones6mo: string[];
  focusAreas: string[];
  weeklyPace: string;
};

function parseCareerPlanDraftOutput(
  v: unknown
): CareerPlanDraftOutputView | null {
  if (!isRecord(v)) return null;
  const summary = asStringOrNull(v.summary);
  const currentPhase = asStringOrNull(v.currentPhase);
  if (!summary || !currentPhase) return null;

  const milestones3mo = asArray(v.milestones_3mo)
    .map(asStringOrNull)
    .filter((x): x is string => !!x);
  const milestones6mo = asArray(v.milestones_6mo)
    .map(asStringOrNull)
    .filter((x): x is string => !!x);
  const focusAreas = asArray(v.focusAreas)
    .map(asStringOrNull)
    .filter((x): x is string => !!x);
  const weeklyPace = asStringOrNull(v.weeklyPace) ?? "";

  return { summary, currentPhase, milestones3mo, milestones6mo, focusAreas, weeklyPace };
}

function CareerPlanDraftOutputCard(props: {
  output: CareerPlanDraftOutputView;
}) {
  const { output } = props;
  return (
    <div className="mt-1 rounded-xl bg-[var(--surface-subtle)] p-3 text-[11px] space-y-2">
      <div className="font-medium text-[var(--text)]">{output.summary}</div>
      <div className="flex flex-wrap gap-1">
        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-700">
          現在: {output.currentPhase}
        </span>
      </div>
      {output.weeklyPace ? (
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-[10px] text-[var(--text)]">
          {output.weeklyPace}
        </div>
      ) : null}
      {output.milestones3mo.length > 0 ? (
        <div className="space-y-1">
          <div className="text-[10px] font-medium text-[var(--text-subtle)]">3ヶ月マイルストーン</div>
          {output.milestones3mo.map((m, idx) => (
            <div
              key={`3mo:${idx.toString()}`}
              className="flex items-start gap-1.5 rounded border bg-white px-2 py-1.5"
            >
              <span className="shrink-0 text-[10px] font-semibold text-indigo-500">
                {(idx + 1).toString()}
              </span>
              <span className="text-gray-800">{m}</span>
            </div>
          ))}
        </div>
      ) : null}
      {output.milestones6mo.length > 0 ? (
        <div className="space-y-1">
          <div className="text-[10px] font-medium text-[var(--text-subtle)]">6ヶ月マイルストーン</div>
          {output.milestones6mo.map((m, idx) => (
            <div
              key={`6mo:${idx.toString()}`}
              className="flex items-start gap-1.5 rounded border border-dashed bg-white px-2 py-1.5"
            >
              <span className="shrink-0 text-[10px] font-semibold text-[var(--text-subtle)]">
                {(idx + 1).toString()}
              </span>
              <span className="text-gray-700">{m}</span>
            </div>
          ))}
        </div>
      ) : null}
      {output.focusAreas.length > 0 ? (
        <div className="space-y-0.5">
          <div className="text-[10px] font-medium text-[var(--text-subtle)]">注力領域</div>
          {output.focusAreas.map((area, idx) => (
            <div
              key={`focus:${idx.toString()}`}
              className="text-[10px] text-[var(--text)]"
            >
              • {area}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type OutputRenderer = {
  render: (output: unknown, context: OutputActionContext) => React.ReactNode | null;
};

const TASK_OUTPUT_RENDERERS: Partial<Record<TaskType, OutputRenderer>> = {
  MANAGER_NEXT_ACTIONS: {
    render: (output) => {
      const parsed = parseManagerNextActionsOutput(output);
      return parsed ? <ManagerNextActionsOutputCard output={parsed} /> : null;
    },
  },
  DISTRIBUTION_PLAN_DRAFT: {
    render: (output, context) => {
      const parsed = parseDistributionPlanDraftTaskOutput(output);
      return parsed ? (
        <DistributionPlanDraftTaskOutputCard
          output={parsed}
          taskId={context.taskId}
        />
      ) : null;
    },
  },
  ANALYZE: {
    render: (output) => {
      const parsed = parseAnalyzeOutput(output);
      return parsed ? <AnalyzeOutputCard output={parsed} /> : null;
    },
  },
  PROPOSE: {
    render: (output, context) => {
      const parsed = parseProposeOutput(output);
      return parsed ? (
        <ProposeOutputCard
          output={parsed}
          projectId={context.projectId}
          taskId={context.taskId}
          walletAddress={context.walletAddress}
        />
      ) : null;
    },
  },
  TRANSLATE: {
    render: (output, context) => {
      const parsed = parseTranslateOutput(output);
      return parsed ? (
        <TranslateOutputCard
          output={parsed}
          projectId={context.projectId}
          taskId={context.taskId}
          walletAddress={context.walletAddress}
        />
      ) : null;
    },
  },
  WEEKLY_REPORT: {
    render: (output) => {
      const parsed = parseWeeklyReportOutput(output);
      return parsed ? <WeeklyReportOutputCard output={parsed} /> : null;
    },
  },
  ANNOUNCEMENT_DRAFT: {
    render: (output, context) => {
      const parsed = parseAnnouncementDraftOutput(output);
      return parsed ? (
        <AnnouncementDraftOutputCard
          output={parsed}
          projectId={context.projectId}
          taskId={context.taskId}
          walletAddress={context.walletAddress}
        />
      ) : null;
    },
  },
  SUPPORTER_MESSAGE_DRAFT: {
    render: (output, context) => {
      const parsed = parseSupporterMessageDraftOutput(output);
      return parsed ? (
        <SupporterMessageDraftOutputCard
          output={parsed}
          taskId={context.taskId}
          walletAddress={context.walletAddress}
        />
      ) : null;
    },
  },
  PROFILE_UPDATE_PROPOSAL: {
    render: (output) => {
      const parsed = parseProfileUpdateProposalOutput(output);
      return parsed ? <ProfileUpdateProposalOutputCard output={parsed} /> : null;
    },
  },
  DAILY_ACTION_PLAN: {
    render: (output) => {
      const parsed = parseDailyActionPlanOutput(output);
      return parsed ? <DailyActionPlanOutputCard output={parsed} /> : null;
    },
  },
  ACTIVITY_RESTART_PROPOSAL: {
    render: (output) => {
      const parsed = parseActivityRestartProposalOutput(output);
      return parsed ? (
        <ActivityRestartProposalOutputCard output={parsed} />
      ) : null;
    },
  },
  SUPPORT_STORY_DRAFT: {
    render: (output, context) => {
      const parsed = parseSupportStoryDraftOutput(output);
      return parsed ? (
        <SupportStoryDraftOutputCard
          output={parsed}
          projectId={context.projectId}
          taskId={context.taskId}
          walletAddress={context.walletAddress}
        />
      ) : null;
    },
  },
  SUPPORTER_RESULT_REPORT: {
    render: (output) => {
      const parsed = parseSupporterResultReportOutput(output);
      return parsed ? <SupporterResultReportOutputCard output={parsed} /> : null;
    },
  },
  CAREER_PLAN_DRAFT: {
    render: (output) => {
      const parsed = parseCareerPlanDraftOutput(output);
      return parsed ? <CareerPlanDraftOutputCard output={parsed} /> : null;
    },
  },
  GROWTH_OPPORTUNITY_ALERT: {
    render: (output) => {
      const parsed = parseGrowthOpportunityAlertOutput(output);
      return parsed ? <GrowthOpportunityAlertOutputCard output={parsed} /> : null;
    },
  },
};

export function AgentTaskOutput(props: {
  taskType: string;
  output: unknown;
  projectId: string | null;
  taskId: string;
  walletAddress: string | null;
}) {
  const { taskType, output, projectId, taskId, walletAddress } = props;
  const renderer = TASK_OUTPUT_RENDERERS[taskType as TaskType];
  const rendered =
    renderer?.render(output, {
      projectId,
      taskId,
      walletAddress,
    }) ?? null;

  if (rendered) return rendered;

  return (
    <pre className="mt-1 whitespace-pre-wrap rounded-xl bg-[var(--surface-subtle)] p-3 text-[11px]">
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
  taskId: string;
  walletAddress: string | null;
}) {
  const { output, taskId, walletAddress } = props;
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
      recordOutputCopied({ taskId, walletAddress });
    } catch {
      return;
    }
  }, [payloadText, taskId, walletAddress]);

  return (
    <div className="mt-1 rounded-xl bg-[var(--surface-subtle)] p-3 text-[11px] space-y-2">
      <div className="font-medium text-[var(--text)]">{output.summary}</div>
      <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1">
        <div className="text-[10px] text-[var(--text-subtle)]">
          {output.audience} / {output.purpose}
        </div>
        <div className="font-medium text-[var(--text)]">{output.subject}</div>
        <div className="mt-1 whitespace-pre-wrap text-[var(--text)]">{output.body}</div>
      </div>
      {output.supportingPoints.length > 0 ? (
        <ul className="list-disc pl-4">
          {output.supportingPoints.slice(0, 3).map((item, idx) => (
            <li key={`${item}:${idx.toString()}`}>{item}</li>
          ))}
        </ul>
      ) : null}
      <div className="rounded border bg-white px-2 py-1 text-[var(--text)]">
        この下書きは支援者向けのため、public posting compose には直接渡しません。
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary text-[11px]"
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
