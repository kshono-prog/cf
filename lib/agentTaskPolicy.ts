import type { TaskType } from "@/lib/agentTaskParsers";

export type AgentTaskReviewPolicy =
  | "always_auto"
  | "review_optional"
  | "approval_required";

/**
 * Tasks that create drafts a creator may want to review before using.
 * The review step is optional: the creator can skip it when the output is
 * already clear enough, but high-risk execution remains outside this list.
 */
export const REVIEW_OPTIONAL_TASK_TYPES = new Set<TaskType>([
  "ANNOUNCEMENT_DRAFT",
  "TRANSLATE",
  "WEEKLY_REPORT",
  "SUPPORT_STORY_DRAFT",
  "SUPPORTER_MESSAGE_DRAFT",
  "DISTRIBUTION_PLAN_DRAFT",
]);

export function getAgentTaskReviewPolicy(
  taskType: TaskType
): AgentTaskReviewPolicy {
  if (REVIEW_OPTIONAL_TASK_TYPES.has(taskType)) {
    return "review_optional";
  }

  return "always_auto";
}

export function requiresApprovalByDefault(taskType: TaskType): boolean {
  return getAgentTaskReviewPolicy(taskType) !== "always_auto";
}

export function canSkipApproval(taskType: TaskType): boolean {
  return getAgentTaskReviewPolicy(taskType) === "review_optional";
}

export function isInformationalTask(taskType: TaskType): boolean {
  return getAgentTaskReviewPolicy(taskType) === "always_auto";
}
