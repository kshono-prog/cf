import { isRecord, toNonEmptyString } from "@/lib/api/guards";
import {
  getNextActionSuggestions,
  hasSavedDistributionResult,
  isDistributionPlanMissing,
  type SuggestedUiTarget,
  type SuggestionPriority,
} from "@/lib/creator-ai/nextActionSuggestions";
import type { SummaryViewData } from "@/lib/mypage/accountPageTypes";

export type ManagerAgentTaskInput = {
  source: string;
  requestedAt: string;
};

export type ManagerAgentSuggestedAction = {
  id: string;
  title: string;
  reason: string;
  priority: SuggestionPriority;
  recommendedUiTarget: SuggestedUiTarget;
  requiresHumanApproval: boolean;
};

export type ManagerAgentTaskEvidence = {
  projectStatus: string | null;
  confirmedJpyc: number;
  targetJpyc: number | null;
  progressPct: number;
  goalConfigured: boolean;
  goalAchieved: boolean;
  distributionPlanMissing: boolean;
  bridgeReflected: boolean;
  distributionResultSaved: boolean;
  bridgeRunCount: number;
  distributionRunCount: number;
};

export type ManagerAgentProjectSnapshot = {
  projectId: string;
  title: string;
  currency: string | null;
  status: string;
  goalId: string | null;
  goalTargetJpyc: number | null;
  achievedAt: string | null;
  deadline: string | null;
};

export type ManagerAgentTaskOutput = {
  summary: string;
  suggestedActions: ManagerAgentSuggestedAction[];
  evidence: ManagerAgentTaskEvidence;
  basedOn: ManagerAgentTaskInput;
  projectSnapshot?: ManagerAgentProjectSnapshot;
};

function defaultRequestedAt(nowIso: string): string {
  return nowIso;
}

export function normalizeManagerAgentTaskInput(
  input: unknown,
  nowIso: string = new Date().toISOString()
): ManagerAgentTaskInput | null {
  if (input == null) {
    return {
      source: "mypage",
      requestedAt: defaultRequestedAt(nowIso),
    };
  }

  if (Array.isArray(input) || !isRecord(input)) {
    return null;
  }

  return {
    source: toNonEmptyString(input.source) ?? "mypage",
    requestedAt:
      toNonEmptyString(input.requestedAt) ?? defaultRequestedAt(nowIso),
  };
}

function buildManagerEvidence(
  summary: SummaryViewData | null
): ManagerAgentTaskEvidence {
  return {
    projectStatus: summary?.project.status ?? null,
    confirmedJpyc: summary?.progress.confirmedJpyc ?? 0,
    targetJpyc: summary?.progress.targetJpyc ?? null,
    progressPct: summary?.progress.progressPct ?? 0,
    goalConfigured: summary ? summary.goal !== null : false,
    goalAchieved: summary?.goal?.achievedAt != null,
    distributionPlanMissing: summary ? isDistributionPlanMissing(summary) : false,
    bridgeReflected: summary?.project.bridgedAt != null,
    distributionResultSaved: summary
      ? hasSavedDistributionResult(summary)
      : false,
    bridgeRunCount: summary?.lastBridgeRuns.length ?? 0,
    distributionRunCount: summary?.lastDistributionRuns.length ?? 0,
  };
}

function buildProjectSnapshot(
  summary: SummaryViewData
): ManagerAgentProjectSnapshot {
  return {
    projectId: summary.project.id,
    title: summary.project.title,
    currency: summary.project.currency ?? null,
    status: summary.project.status,
    goalId: summary.goal?.id ?? null,
    goalTargetJpyc: summary.goal?.targetAmountJpyc ?? null,
    achievedAt: summary.goal?.achievedAt ?? null,
    deadline: summary.goal?.deadline ?? null,
  };
}

function toStoredSuggestedActions(
  summary: SummaryViewData | null,
  isOwner: boolean
): ManagerAgentSuggestedAction[] {
  return getNextActionSuggestions({
    summary,
    isOwner,
  }).map((suggestion) => ({
    id: suggestion.id,
    title: suggestion.title,
    reason: suggestion.reason,
    priority: suggestion.priority,
    recommendedUiTarget: suggestion.recommendedUiTarget,
    requiresHumanApproval: suggestion.requiresHumanApproval,
  }));
}

function buildOutputSummary(
  summary: SummaryViewData | null,
  suggestedActions: readonly ManagerAgentSuggestedAction[]
): string {
  if (!summary) {
    return "Project summary がまだ取得できないため、Manager Agent は次の一手を確定できませんでした。";
  }

  if (suggestedActions.length === 0) {
    return "現在の project 状態では、Manager Agent から追加の next action はありません。";
  }

  const topAction = suggestedActions[0];
  const progressText = `${Math.floor(summary.progress.progressPct)}%`;

  return `現在の project 状態から ${suggestedActions.length} 件の next action を整理しました。最優先は「${topAction.title}」で、進捗は ${progressText} です。`;
}

export function buildManagerAgentTaskOutput(args: {
  summary: SummaryViewData | null;
  input: ManagerAgentTaskInput;
  isOwner: boolean;
}): ManagerAgentTaskOutput {
  const suggestedActions = toStoredSuggestedActions(args.summary, args.isOwner);

  return {
    summary: buildOutputSummary(args.summary, suggestedActions),
    suggestedActions,
    evidence: buildManagerEvidence(args.summary),
    basedOn: args.input,
    ...(args.summary
      ? { projectSnapshot: buildProjectSnapshot(args.summary) }
      : {}),
  };
}
