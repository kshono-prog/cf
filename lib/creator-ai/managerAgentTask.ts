import { isRecord, toNonEmptyString } from "@/lib/api/guards";
import {
  getNextActionSuggestions,
  hasSavedDistributionResult,
  isDistributionPlanMissing,
  type SuggestedUiTarget,
  type SuggestionPriority,
} from "@/lib/creator-ai/nextActionSuggestions";
import type { SummaryViewData } from "@/lib/mypage/accountPageTypes";
import {
  MATURITY_AXIS_LABELS,
  type CreatorMaturityAxes,
  type CreatorStageResult,
} from "@/lib/creatorStage";

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
};

export type ManagerAgentMaturitySignal = {
  stage: string;
  stageLabel: string;
  nextMilestone: string | null;
  weakestAxis: keyof CreatorMaturityAxes | null;
  weakestAxisLabel: string | null;
  weakestScore: number | null;
};

export type ManagerAgentProjectSnapshot = {
  projectId: string;
  title: string;
  currency: string | null;
  status: string;
  goalId: string | null;
  goalTargetAmount: number | null;
  achievedAt: string | null;
  deadline: string | null;
};

export type TaskTypeApprovalStat = {
  taskType: string;
  approvedCount: number;
  rejectedCount: number;
};

export type ManagerAgentTaskOutput = {
  summary: string;
  suggestedActions: ManagerAgentSuggestedAction[];
  evidence: ManagerAgentTaskEvidence;
  maturitySignal: ManagerAgentMaturitySignal | null;
  approvalInsight: string | null;
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
    confirmedAmount:
      summary?.progress.confirmedAmount ??
      summary?.progress.confirmedTotal ??
      0,
    targetAmount: summary?.progress.targetAmount ?? null,
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
    goalTargetAmount: summary.goal?.targetAmount ?? null,
    achievedAt: summary.goal?.achievedAt ?? null,
    deadline: summary.goal?.deadline ?? null,
  };
}

function buildMaturitySignal(
  stageResult: CreatorStageResult | null
): ManagerAgentMaturitySignal | null {
  if (!stageResult) return null;

  const entries = Object.entries(stageResult.maturity) as [
    keyof CreatorMaturityAxes,
    number,
  ][];
  const weakest = entries.sort((a, b) => a[1] - b[1])[0] ?? null;

  return {
    stage: stageResult.stage,
    stageLabel: stageResult.stageLabel,
    nextMilestone: stageResult.nextMilestone,
    weakestAxis: weakest?.[0] ?? null,
    weakestAxisLabel: weakest ? (MATURITY_AXIS_LABELS[weakest[0]] ?? null) : null,
    weakestScore: weakest?.[1] ?? null,
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

function buildApprovalInsight(
  history: readonly TaskTypeApprovalStat[]
): string | null {
  if (history.length === 0) return null;

  const approvedTypes = history
    .filter((h) => h.approvedCount > 0)
    .sort((a, b) => b.approvedCount - a.approvedCount)
    .slice(0, 3);
  const highRejected = history.filter(
    (h) => h.rejectedCount > 0 && h.approvedCount === 0
  );

  const parts: string[] = [];
  if (approvedTypes.length > 0) {
    const labels = approvedTypes
      .map((h) => `${h.taskType}（承認${h.approvedCount.toString()}回）`)
      .join("、");
    parts.push(`これまでに承認されたタスク: ${labels}`);
  }
  if (highRejected.length > 0) {
    const labels = highRejected.map((h) => h.taskType).join("、");
    parts.push(`却下されたタスク: ${labels}`);
  }
  return parts.length > 0 ? parts.join("。") + "。" : null;
}

function buildOutputSummary(
  summary: SummaryViewData | null,
  suggestedActions: readonly ManagerAgentSuggestedAction[],
  maturitySignal: ManagerAgentMaturitySignal | null
): string {
  if (!summary) {
    return "Project summary がまだ取得できないため、Manager Agent は次の一手を確定できませんでした。";
  }

  if (suggestedActions.length === 0) {
    return "現在の project 状態では、Manager Agent から追加の next action はありません。";
  }

  const topAction = suggestedActions[0];
  const progressText = `${Math.floor(summary.progress.progressPct)}%`;

  const axisNote =
    maturitySignal?.weakestAxisLabel && maturitySignal.weakestScore !== null
      ? ` 成熟度では「${maturitySignal.weakestAxisLabel}」（${maturitySignal.weakestScore.toString()}点）が最も伸びしろがあります。`
      : "";

  return `現在の project 状態から ${suggestedActions.length.toString()} 件の next action を整理しました。最優先は「${topAction.title}」で、進捗は ${progressText} です。${axisNote}`;
}

export function buildManagerAgentTaskOutput(args: {
  summary: SummaryViewData | null;
  input: ManagerAgentTaskInput;
  isOwner: boolean;
  stageResult?: CreatorStageResult | null;
  approvalHistory?: readonly TaskTypeApprovalStat[];
}): ManagerAgentTaskOutput {
  const suggestedActions = toStoredSuggestedActions(args.summary, args.isOwner);
  const maturitySignal = buildMaturitySignal(args.stageResult ?? null);
  const approvalInsight = buildApprovalInsight(args.approvalHistory ?? []);

  return {
    summary: buildOutputSummary(args.summary, suggestedActions, maturitySignal),
    suggestedActions,
    evidence: buildManagerEvidence(args.summary),
    maturitySignal,
    approvalInsight,
    basedOn: args.input,
    ...(args.summary
      ? { projectSnapshot: buildProjectSnapshot(args.summary) }
      : {}),
  };
}
