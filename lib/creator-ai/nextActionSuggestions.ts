import { isRecord } from "@/lib/mypage/helpers";

export type SuggestionPriority = "high" | "medium" | "low";

export type SuggestedUiTarget =
  | "project"
  | "goal"
  | "summary"
  | "plan"
  | "distributionResult"
  | "bridge"
  | "achieve";

export type NextActionSuggestion = {
  id: string;
  title: string;
  reason: string;
  priority: SuggestionPriority;
  recommendedUiTarget: SuggestedUiTarget;
  requiresHumanApproval: boolean;
  draftPayload?: unknown;
};

export type SummaryInput = {
  project: {
    id: string;
    status: string;
    ownerAddress: string | null;
    bridgedAt: string | null;
    distributedAt: string | null;
  };
  goal: {
    id: string;
    targetAmount: number;
    achievedAt: string | null;
    deadline: string | null;
  } | null;
  progress: {
    confirmedAmount: number;
    targetAmount: number | null;
    progressPct: number;
  };
  distributionPlan: unknown;
  lastBridgeRuns: Array<{
    id: string;
    createdAt: string;
  }>;
  lastDistributionRuns: Array<{
    id: string;
    createdAt: string;
    txHashes: unknown;
  }>;
};

export type SuggestionContext = {
  summary: SummaryInput | null;
  isOwner: boolean;
};

const PRIORITY_ORDER: Record<SuggestionPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function buildSuggestion(
  suggestion: NextActionSuggestion
): NextActionSuggestion {
  return suggestion;
}

export function isNonEmptyObject(
  value: unknown
): value is Record<string, unknown> {
  return isRecord(value) && Object.keys(value).length > 0;
}

function hasNonEmptyTxHashes(txHashes: unknown): boolean {
  if (!Array.isArray(txHashes)) {
    return false;
  }

  return txHashes.some(
    (item) => typeof item === "string" && item.trim().length > 0
  );
}

function hasSavedPlanRun(summary: SummaryInput): boolean {
  return summary.lastDistributionRuns.some((run) => {
    const mode = Reflect.get(run, "mode");
    return mode === "PLAN_ONLY";
  });
}

export function isDistributionPlanMissing(summary: SummaryInput): boolean {
  const { distributionPlan } = summary;

  if (Array.isArray(distributionPlan)) {
    return distributionPlan.length === 0 && !hasSavedPlanRun(summary);
  }

  if (isNonEmptyObject(distributionPlan)) {
    return false;
  }

  return !hasSavedPlanRun(summary);
}

export function hasSavedDistributionResult(summary: SummaryInput): boolean {
  if (summary.project.distributedAt) {
    return true;
  }

  return summary.lastDistributionRuns.some((run) =>
    hasNonEmptyTxHashes(run.txHashes)
  );
}

function hasBridgeReflected(summary: SummaryInput): boolean {
  return summary.project.bridgedAt !== null;
}

function ownerQualifiedReason(base: string, isOwner: boolean): string {
  if (isOwner) {
    return base;
  }

  return `${base} オーナーウォレットでの確認が必要です。`;
}

export function sortSuggestionsByPriority(
  suggestions: NextActionSuggestion[]
): NextActionSuggestion[] {
  return [...suggestions].sort((left, right) => {
    return PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority];
  });
}

export function getNextActionSuggestions(
  context: SuggestionContext
): NextActionSuggestion[] {
  const { summary, isOwner } = context;

  if (!summary) {
    return [];
  }

  const suggestions: NextActionSuggestion[] = [];
  const target = summary.progress.targetAmount;
  const confirmed = summary.progress.confirmedAmount;
  const goalAchieved = summary.goal?.achievedAt !== null;
  const planMissing = isDistributionPlanMissing(summary);
  const bridgeReflected = hasBridgeReflected(summary);
  const distributionSaved = hasSavedDistributionResult(summary);

  if (!summary.goal) {
    suggestions.push(
      buildSuggestion({
        id: "save-goal",
        title: "Goal を保存してください",
        reason: ownerQualifiedReason(
          "project は作成済みですが goal が未設定です。まず target amount と必要なら deadline を保存してください。",
          isOwner
        ),
        priority: "high",
        recommendedUiTarget: "goal",
        requiresHumanApproval: true,
      })
    );

    return sortSuggestionsByPriority(suggestions).slice(0, 3);
  }

  if (target === null || confirmed < target) {
    suggestions.push(
      buildSuggestion({
        id: "review-progress",
        title: "進捗確認または告知強化を進めてください",
        reason: `現在の進捗は ${Math.floor(
          summary.progress.progressPct
        )}% です。到達前の段階なので、進捗確認や告知強化で次の打ち手を整えるのが自然です。`,
        priority: "medium",
        recommendedUiTarget: "summary",
        requiresHumanApproval: true,
      })
    );

    return sortSuggestionsByPriority(suggestions).slice(0, 3);
  }

  if (!goalAchieved) {
    suggestions.push(
      buildSuggestion({
        id: "confirm-achievement",
        title: "目標達成を確定してください",
        reason: ownerQualifiedReason(
          "confirmed progress が target に到達しています。次の精算フローへ進む前に達成確定が必要です。",
          isOwner
        ),
        priority: "high",
        recommendedUiTarget: "achieve",
        requiresHumanApproval: true,
      })
    );

    return sortSuggestionsByPriority(suggestions).slice(0, 3);
  }

  if (planMissing) {
    suggestions.push(
      buildSuggestion({
        id: "save-plan",
        title: "Distribution plan を保存してください",
        reason: ownerQualifiedReason(
          "goal は達成済みですが、配分先の plan がまだ見つかりません。bridge や配分実行の前に plan を保存してください。",
          isOwner
        ),
        priority: "high",
        recommendedUiTarget: "plan",
        requiresHumanApproval: true,
      })
    );

    return sortSuggestionsByPriority(suggestions).slice(0, 3);
  }

  if (!bridgeReflected && !distributionSaved) {
    const bridgeReason =
      summary.lastBridgeRuns.length > 0
        ? "直近の bridge run はありますが、project にはまだ bridge 状態が反映されていません。"
        : "plan はありますが、bridge 状態がまだ反映されていません。";

    suggestions.push(
      buildSuggestion({
        id: "confirm-bridge",
        title: "Bridge 準備 / 実行確認を進めてください",
        reason: ownerQualifiedReason(
          `${bridgeReason} 精算と詳細設定で準備または実行確認を進めてください。`,
          isOwner
        ),
        priority: "medium",
        recommendedUiTarget: "bridge",
        requiresHumanApproval: true,
      })
    );

    return sortSuggestionsByPriority(suggestions).slice(0, 3);
  }

  if (bridgeReflected && !distributionSaved) {
    suggestions.push(
      buildSuggestion({
        id: "save-distribution-result",
        title: "Distribution result を保存してください",
        reason: ownerQualifiedReason(
          "bridge は反映済みですが distribution result の保存がまだありません。tx hashes を確認して記録を保存してください。",
          isOwner
        ),
        priority: "high",
        recommendedUiTarget: "distributionResult",
        requiresHumanApproval: true,
      })
    );

    return sortSuggestionsByPriority(suggestions).slice(0, 3);
  }

  return sortSuggestionsByPriority(suggestions).slice(0, 3);
}
