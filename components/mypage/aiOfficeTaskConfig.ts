import type {
  AnnouncementChannel,
  AgentTaskView,
  AiOfficeRoleUsefulnessView,
  DraftTone,
  SupporterMessagePurpose,
  TranslationLang,
} from "@/components/mypage/aiOfficeTypes";
import type { TaskType } from "@/lib/agentTaskParsers";
import {
  AGENT_TASK_AUDIT_ACTION,
  getTaskFollowThroughAuditAction,
} from "@/lib/agentTaskAudit";
import {
  CREATOR_AI_AGENT_ROLE_DEFINITIONS,
  type CreatorAiAgentRole,
  type CreatorAiExecutionBoundary,
} from "@/lib/creator-ai/agentRoleRegistry";
import {
  PRODUCT_TIER_ORDER,
  type ProductTier,
} from "@/lib/productTiers";

export type AiOfficeTaskChoice = {
  taskType: TaskType;
  eyebrow: string;
  whenToUse: string;
  tier: ProductTier;
};

export type AiOfficeRoleChoice = {
  roleId: CreatorAiAgentRole;
  label: string;
  description: string;
  roleHelper: string;
  executionBoundary: CreatorAiExecutionBoundary;
  tier: ProductTier;
  featuredTaskType: TaskType | null;
  taskChoices: AiOfficeTaskChoice[];
};

export type AiOfficeRoleGuidance = {
  roleId: CreatorAiAgentRole | null;
  tone: "neutral" | "recommended" | "attention";
  title: string;
  description: string;
};

export type AiOfficeTaskUsefulness = {
  taskType: TaskType;
  actionableCount: number;
  autoCompletedCount: number;
  trackedReadyCount: number;
  usedCount: number;
  waitingApprovalCount: number;
  approvedCount: number;
  rejectedCount: number;
  followThroughRate: number;
  usedRate: number;
};

export type AiOfficeTaskDraft = {
  taskType: TaskType;
  translationInput: string;
  translationLang: TranslationLang;
  reportingWindowDays: number;
  draftTone: DraftTone;
  announcementChannel: AnnouncementChannel;
  includeMetricsSummary: boolean;
  includeSupportSummary: boolean;
  supporterMessagePurpose: SupporterMessagePurpose;
};

export const AI_OFFICE_TASK_CHOICES: readonly AiOfficeTaskChoice[] = [
  {
    taskType: "MANAGER_NEXT_ACTIONS",
    eyebrow: "Manager",
    whenToUse: "いまの project 状態から次の一手を整理したいとき",
    tier: "MVP",
  },
  {
    taskType: "DISTRIBUTION_PLAN_DRAFT",
    eyebrow: "Finance",
    whenToUse: "配分の draft を AIアシスタントから settlement に渡したいとき",
    tier: "BETA",
  },
  {
    taskType: "PROPOSE",
    eyebrow: "次の一手",
    whenToUse: "次に何を投稿・告知・改善するか迷っているとき",
    tier: "MVP",
  },
  {
    taskType: "ANALYZE",
    eyebrow: "振り返り",
    whenToUse: "最近の反応や変化を整理したいとき",
    tier: "MVP",
  },
  {
    taskType: "TRANSLATE",
    eyebrow: "翻訳",
    whenToUse: "既存の文章を別の言語向けに言い換えたいとき",
    tier: "MVP",
  },
  {
    taskType: "WEEKLY_REPORT",
    eyebrow: "週次共有",
    whenToUse: "今週の活動や進捗をまとめたいとき",
    tier: "BETA",
  },
  {
    taskType: "ANNOUNCEMENT_DRAFT",
    eyebrow: "告知",
    whenToUse: "支援者やフォロワー向けの告知文を作りたいとき",
    tier: "BETA",
  },
  {
    taskType: "SUPPORTER_MESSAGE_DRAFT",
    eyebrow: "下書きと承認",
    whenToUse: "お礼や再案内のメッセージを作りたいとき",
    tier: "BETA",
  },
  {
    taskType: "PROFILE_UPDATE_PROPOSAL",
    eyebrow: "プロフィール整備",
    whenToUse: "公開ページを整えるためにプロフィールの改善案を確認したいとき",
    tier: "MVP",
  },
  {
    taskType: "DAILY_ACTION_PLAN",
    eyebrow: "今日やること",
    whenToUse: "今日の優先行動を AI に整理してもらいたいとき",
    tier: "MVP",
  },
  {
    taskType: "ACTIVITY_RESTART_PROPOSAL",
    eyebrow: "再起動を助ける",
    whenToUse: "活動が止まりかけたとき、再び始めるための小さな一歩を提案してもらいたいとき",
    tier: "MVP",
  },
  {
    taskType: "SUPPORT_STORY_DRAFT",
    eyebrow: "支援ストーリー",
    whenToUse: "なぜ支援が必要で何が実現するかを伝わる文章にまとめたいとき",
    tier: "MVP",
  },
  {
    taskType: "SUPPORTER_RESULT_REPORT",
    eyebrow: "支援結果レポート",
    whenToUse: "支援がどう活用されたかをファンに伝える結果レポートを作りたいとき",
    tier: "MVP",
  },
  {
    taskType: "CAREER_PLAN_DRAFT",
    eyebrow: "活動戦略を立てる",
    whenToUse: "3ヶ月・6ヶ月の成長戦略をAIに整理してもらいたいとき",
    tier: "MVP",
  },
  {
    taskType: "GROWTH_OPPORTUNITY_ALERT",
    eyebrow: "成長機会を見つける",
    whenToUse: "直近の指標から今すぐ動ける成長チャンスを確認したいとき",
    tier: "MVP",
  },
  {
    taskType: "MEETING_AGENDA_DRAFT",
    eyebrow: "会議アジェンダを作る",
    whenToUse: "次の会議の事前アジェンダ・確認事項・決定すべき事項を整理したいとき",
    tier: "MVP",
  },
  {
    taskType: "CONTACT_OUTREACH_DRAFT",
    eyebrow: "対外連絡文を作る",
    whenToUse: "会場・スポンサー・メディアなど外部への初回連絡や営業メッセージを下書きしたいとき",
    tier: "MVP",
  },
  {
    taskType: "STAGE_GROWTH_PLAN",
    eyebrow: "ステージ成長プラン",
    whenToUse: "現在のステージと成熟度から、次のレベルに向けた具体的な成長ステップを確認したいとき",
    tier: "MVP",
  },
  {
    taskType: "CONTACT_INTELLIGENCE_ALERT",
    eyebrow: "接点リスク分析",
    whenToUse: "Contact Pipeline の停滞・期限超過・温度感を AI が分析し、優先対応すべき接点を洗い出したいとき",
    tier: "MVP",
  },
  {
    taskType: "MONTHLY_CASHFLOW_REPORT",
    eyebrow: "月次収支レポート",
    whenToUse: "今月の収入・支出を集計してAIに収支サマリーとアドバイスを作ってもらいたいとき",
    tier: "MVP",
  },
] as const;

export const AI_OFFICE_TASK_TIER_HELPER: Record<ProductTier, string> = {
  MVP: "日々の運営で使う core task",
  BETA: "metrics や拡張下書きを使う実験枠",
};

const AI_OFFICE_ROLE_HELPERS: Record<CreatorAiAgentRole, string> = {
  MANAGER:
    "Project / Goal / Summary を見て、いま優先すべき next action を整理します。",
  PROMOTION:
    "公開ページ、投稿、告知文の下書きを作り、外に伝える内容を整えます。",
  FINANCE:
    "進捗や配分準備を整理し、AIアシスタントから settlement の Draft step へ配分案を渡せます。",
  FAN_RELATION:
    "支援者向けのお礼や再案内を整え、継続的なコミュニケーションを助けます。",
};

function rolePhaseToTier(phase: "MVP" | "PHASE_2" | "FUTURE"): ProductTier {
  return phase === "MVP" ? "MVP" : "BETA";
}

export const AI_OFFICE_ROLE_CHOICES: readonly AiOfficeRoleChoice[] =
  CREATOR_AI_AGENT_ROLE_DEFINITIONS.map((definition) => {
    const taskChoices = definition.candidateTaskTypes
      .map((taskType) => getAiOfficeTaskChoice(taskType))
      .filter((choice): choice is AiOfficeTaskChoice => choice !== undefined);

    return {
      roleId: definition.id,
      label: definition.label,
      description: definition.description,
      roleHelper: AI_OFFICE_ROLE_HELPERS[definition.id],
      executionBoundary: definition.executionBoundary,
      tier: rolePhaseToTier(definition.phase),
      featuredTaskType: taskChoices[0]?.taskType ?? null,
      taskChoices,
    };
  }).filter((choice) => choice.taskChoices.length > 0);

export function getAiOfficeTaskChoice(
  taskType: TaskType
): AiOfficeTaskChoice | undefined {
  return AI_OFFICE_TASK_CHOICES.find((choice) => choice.taskType === taskType);
}

export function getAiOfficeTaskChoiceGroups(): Array<{
  tier: ProductTier;
  choices: AiOfficeTaskChoice[];
}> {
  return PRODUCT_TIER_ORDER.map((tier) => ({
    tier,
    choices: AI_OFFICE_TASK_CHOICES.filter((choice) => choice.tier === tier),
  })).filter((group) => group.choices.length > 0);
}

export function getAiOfficeRoleChoices(): AiOfficeRoleChoice[] {
  return AI_OFFICE_ROLE_CHOICES.map((choice) => ({
    ...choice,
    taskChoices: [...choice.taskChoices],
  }));
}

export function getAiOfficeRoleChoice(
  roleId: CreatorAiAgentRole
): AiOfficeRoleChoice | undefined {
  return AI_OFFICE_ROLE_CHOICES.find((choice) => choice.roleId === roleId);
}

export function getAiOfficeTaskRoleChoices(
  taskType: TaskType
): AiOfficeRoleChoice[] {
  return AI_OFFICE_ROLE_CHOICES.filter((choice) =>
    choice.taskChoices.some((taskChoice) => taskChoice.taskType === taskType)
  ).map((choice) => ({
    ...choice,
    taskChoices: [...choice.taskChoices],
  }));
}

export function doesAiOfficeTaskMatchRole(
  taskType: TaskType,
  roleId: CreatorAiAgentRole
): boolean {
  return getAiOfficeTaskRoleChoices(taskType).some(
    (choice) => choice.roleId === roleId
  );
}

export function getDefaultAiOfficeRole(
  taskType: TaskType
): CreatorAiAgentRole {
  return getAiOfficeTaskRoleChoices(taskType)[0]?.roleId ?? "MANAGER";
}

export function getAiOfficeRoleUsefulness(
  roleId: CreatorAiAgentRole,
  roleBreakdown: readonly AiOfficeRoleUsefulnessView[]
): AiOfficeRoleUsefulnessView | undefined {
  return roleBreakdown.find((role) => role.roleId === roleId);
}

export function getAiOfficeRoleGuidance(
  roleChoices: readonly AiOfficeRoleChoice[],
  roleBreakdown: readonly AiOfficeRoleUsefulnessView[]
): AiOfficeRoleGuidance {
  const pendingRole = [...roleBreakdown]
    .filter((role) => role.waitingApprovalCount > 0)
    .sort((a, b) => {
      if (b.ignoredCount !== a.ignoredCount) {
        return b.ignoredCount - a.ignoredCount;
      }
      if (b.waitingApprovalCount !== a.waitingApprovalCount) {
        return b.waitingApprovalCount - a.waitingApprovalCount;
      }
      return a.roleId.localeCompare(b.roleId);
    })[0];

  if (pendingRole) {
    return {
      roleId: pendingRole.roleId,
      tone: "attention",
      title: "先に確認したい role があります",
      description: `${pendingRole.label} に承認待ち ${pendingRole.waitingApprovalCount} 件があります。新しい下書きを増やす前に Inbox で確認すると運営が止まりません。`,
    };
  }

  const effectiveRole = [...roleBreakdown]
    .filter((role) => role.trackedReadyCount > 0)
    .sort((a, b) => {
      if (b.usedCount !== a.usedCount) {
        return b.usedCount - a.usedCount;
      }
      if (b.usedRate !== a.usedRate) {
        return b.usedRate - a.usedRate;
      }
      if (b.trackedReadyCount !== a.trackedReadyCount) {
        return b.trackedReadyCount - a.trackedReadyCount;
      }
      return a.roleId.localeCompare(b.roleId);
    })[0];

  if (effectiveRole) {
    return {
      roleId: effectiveRole.roleId,
      tone: "recommended",
      title: "いま活用が進んでいる role があります",
      description: `${effectiveRole.label} は ${effectiveRole.usedCount} 件が実際に使われ、活用率は ${(effectiveRole.usedRate * 100).toFixed(0)}% です。次の 1 件を作る role として相性が見えています。`,
    };
  }

  const responsiveRole = [...roleBreakdown]
    .filter((role) => role.actionableCount > 0)
    .sort((a, b) => {
      if (b.followThroughRate !== a.followThroughRate) {
        return b.followThroughRate - a.followThroughRate;
      }
      if (b.approvedCount !== a.approvedCount) {
        return b.approvedCount - a.approvedCount;
      }
      if (b.actionableCount !== a.actionableCount) {
        return b.actionableCount - a.actionableCount;
      }
      return a.roleId.localeCompare(b.roleId);
    })[0];

  if (responsiveRole) {
    return {
      roleId: responsiveRole.roleId,
      tone: "recommended",
      title: "いま試しやすい role があります",
      description: `${responsiveRole.label} の対応率は ${(responsiveRole.followThroughRate * 100).toFixed(0)}% です。まだ利用データが少ない段階でも、試しやすい role として見えています。`,
    };
  }

  return {
    roleId: roleChoices[0]?.roleId ?? null,
    tone: "neutral",
    title: "最初の 1 件を作る段階です",
    description:
      "まずは「次の一手を提案する」か「プロフィール改善」から試すと、AIアシスタントの使いどころを掴みやすくなります。",
  };
}

export function getAiOfficeTaskUsefulness(
  taskType: TaskType,
  tasks: readonly AgentTaskView[]
): AiOfficeTaskUsefulness {
  let actionableCount = 0;
  let autoCompletedCount = 0;
  let trackedReadyCount = 0;
  let usedCount = 0;
  let waitingApprovalCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;

  for (const task of tasks) {
    if (task.taskType !== taskType) continue;

    const createdWaitingApproval = task.auditLogs.some(
      (log) => log.action === AGENT_TASK_AUDIT_ACTION.CREATED_WAITING_APPROVAL
    );
    const createdDone = task.auditLogs.some(
      (log) => log.action === AGENT_TASK_AUDIT_ACTION.CREATED_DONE
    );
    const approved = task.auditLogs.some(
      (log) => log.action === AGENT_TASK_AUDIT_ACTION.APPROVED
    );
    const rejected = task.auditLogs.some(
      (log) => log.action === AGENT_TASK_AUDIT_ACTION.REJECTED
    );
    const followThroughAuditAction = getTaskFollowThroughAuditAction(taskType);

    if (createdDone) {
      autoCompletedCount += 1;
    }

    if (followThroughAuditAction && (createdDone || approved)) {
      trackedReadyCount += 1;
      if (
        task.auditLogs.some((log) => log.action === followThroughAuditAction)
      ) {
        usedCount += 1;
      }
    }

    if (!createdWaitingApproval) {
      continue;
    }

    actionableCount += 1;

    if (approved) {
      approvedCount += 1;
      continue;
    }

    if (rejected) {
      rejectedCount += 1;
      continue;
    }

    if (task.status === "WAITING_APPROVAL") {
      waitingApprovalCount += 1;
    }
  }

  const followThroughCount = approvedCount + rejectedCount;

  return {
    taskType,
    actionableCount,
    autoCompletedCount,
    trackedReadyCount,
    usedCount,
    waitingApprovalCount,
    approvedCount,
    rejectedCount,
    followThroughRate:
      actionableCount > 0 ? followThroughCount / actionableCount : 0,
    usedRate: trackedReadyCount > 0 ? usedCount / trackedReadyCount : 0,
  };
}

export function sortAiOfficeTaskChoicesByUsefulness(
  taskChoices: readonly AiOfficeTaskChoice[],
  tasks: readonly AgentTaskView[]
): AiOfficeTaskChoice[] {
  return taskChoices
    .map((choice, index) => ({
      choice,
      index,
      usefulness: getAiOfficeTaskUsefulness(choice.taskType, tasks),
    }))
    .sort((a, b) => {
      if (b.usefulness.usedCount !== a.usefulness.usedCount) {
        return b.usefulness.usedCount - a.usefulness.usedCount;
      }
      if (b.usefulness.usedRate !== a.usefulness.usedRate) {
        return b.usefulness.usedRate - a.usefulness.usedRate;
      }
      if (b.usefulness.approvedCount !== a.usefulness.approvedCount) {
        return b.usefulness.approvedCount - a.usefulness.approvedCount;
      }
      if (b.usefulness.followThroughRate !== a.usefulness.followThroughRate) {
        return b.usefulness.followThroughRate - a.usefulness.followThroughRate;
      }
      if (
        a.usefulness.waitingApprovalCount !== b.usefulness.waitingApprovalCount
      ) {
        return a.usefulness.waitingApprovalCount - b.usefulness.waitingApprovalCount;
      }
      if (b.usefulness.actionableCount !== a.usefulness.actionableCount) {
        return b.usefulness.actionableCount - a.usefulness.actionableCount;
      }
      if (b.usefulness.trackedReadyCount !== a.usefulness.trackedReadyCount) {
        return b.usefulness.trackedReadyCount - a.usefulness.trackedReadyCount;
      }
      if (b.usefulness.autoCompletedCount !== a.usefulness.autoCompletedCount) {
        return b.usefulness.autoCompletedCount - a.usefulness.autoCompletedCount;
      }
      return a.index - b.index;
    })
    .map((item) => item.choice);
}

export function normalizeAiOfficeTaskDraft(
  draft: AiOfficeTaskDraft
): AiOfficeTaskDraft {
  if (draft.taskType === "WEEKLY_REPORT") {
    return {
      ...draft,
      reportingWindowDays: 7,
    };
  }

  if (draft.taskType === "ANNOUNCEMENT_DRAFT") {
    return {
      ...draft,
      reportingWindowDays: 7,
      announcementChannel: "SUPPORTERS",
      includeMetricsSummary: true,
      includeSupportSummary: true,
    };
  }

  if (draft.taskType === "SUPPORTER_MESSAGE_DRAFT") {
    return {
      ...draft,
      reportingWindowDays: 30,
      includeMetricsSummary: false,
      includeSupportSummary: true,
    };
  }

  return draft;
}

export function validateAiOfficeTaskDraft(
  draft: AiOfficeTaskDraft
): string | null {
  if (draft.taskType === "TRANSLATE" && draft.translationInput.trim().length === 0) {
    return "TRANSLATE タスクには翻訳テキストが必要です。";
  }

  return null;
}

export function buildAiOfficeTaskInput(
  draft: AiOfficeTaskDraft
): Record<string, unknown> {
  const normalizedDraft = normalizeAiOfficeTaskDraft(draft);
  const common = {
    source: "mypage",
    requestedAt: new Date().toISOString(),
  };

  switch (normalizedDraft.taskType) {
    case "TRANSLATE":
      return {
        ...common,
        text: normalizedDraft.translationInput.trim(),
        from: "auto",
        to: [normalizedDraft.translationLang],
      };
    case "WEEKLY_REPORT":
      return {
        ...common,
        reportingWindowDays: normalizedDraft.reportingWindowDays,
      };
    case "ANNOUNCEMENT_DRAFT":
      return {
        ...common,
        channel: normalizedDraft.announcementChannel,
        tone: normalizedDraft.draftTone,
        reportingWindowDays: normalizedDraft.reportingWindowDays,
        includeMetricsSummary: normalizedDraft.includeMetricsSummary,
        includeSupportSummary: normalizedDraft.includeSupportSummary,
      };
    case "SUPPORTER_MESSAGE_DRAFT":
      return {
        ...common,
        purpose: normalizedDraft.supporterMessagePurpose,
        tone: normalizedDraft.draftTone,
        reportingWindowDays: normalizedDraft.reportingWindowDays,
        includeMetricsSummary: normalizedDraft.includeMetricsSummary,
        includeSupportSummary: normalizedDraft.includeSupportSummary,
      };
    default:
      return common;
  }
}
