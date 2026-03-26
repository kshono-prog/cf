import { isRecord, toBigIntOrThrow, toNonEmptyString } from "@/lib/api/guards";

export type TaskType =
  | "MANAGER_NEXT_ACTIONS"
  | "DISTRIBUTION_PLAN_DRAFT"
  | "ANALYZE"
  | "PROPOSE"
  | "TRANSLATE"
  | "WEEKLY_REPORT"
  | "ANNOUNCEMENT_DRAFT"
  | "SUPPORTER_MESSAGE_DRAFT"
  | "PROFILE_UPDATE_PROPOSAL"
  | "DAILY_ACTION_PLAN"
  | "ACTIVITY_RESTART_PROPOSAL"
  | "SUPPORT_STORY_DRAFT"
  | "SUPPORTER_RESULT_REPORT"
  | "CAREER_PLAN_DRAFT"
  | "GROWTH_OPPORTUNITY_ALERT"
  | "MEETING_AGENDA_DRAFT"
  | "CONTACT_OUTREACH_DRAFT";
export type TaskStatus =
  | "QUEUED"
  | "RUNNING"
  | "WAITING_APPROVAL"
  | "DONE"
  | "FAILED";
export type TaskApprovalAction = "APPROVE" | "REJECT";

export const ALLOWED_TASK_TYPES: readonly TaskType[] = [
  "MANAGER_NEXT_ACTIONS",
  "DISTRIBUTION_PLAN_DRAFT",
  "ANALYZE",
  "PROPOSE",
  "TRANSLATE",
  "WEEKLY_REPORT",
  "ANNOUNCEMENT_DRAFT",
  "SUPPORTER_MESSAGE_DRAFT",
  "PROFILE_UPDATE_PROPOSAL",
  "DAILY_ACTION_PLAN",
  "ACTIVITY_RESTART_PROPOSAL",
  "SUPPORT_STORY_DRAFT",
  "SUPPORTER_RESULT_REPORT",
  "CAREER_PLAN_DRAFT",
  "GROWTH_OPPORTUNITY_ALERT",
  "MEETING_AGENDA_DRAFT",
  "CONTACT_OUTREACH_DRAFT",
] as const;

export const ALLOWED_TASK_STATUS: readonly TaskStatus[] = [
  "QUEUED",
  "RUNNING",
  "WAITING_APPROVAL",
  "DONE",
  "FAILED",
] as const;

export function toTaskType(v: unknown): TaskType | null {
  if (typeof v !== "string") return null;
  return ALLOWED_TASK_TYPES.includes(v as TaskType) ? (v as TaskType) : null;
}

export function toTaskStatus(v: unknown): TaskStatus | null {
  if (typeof v !== "string") return null;
  return ALLOWED_TASK_STATUS.includes(v as TaskStatus)
    ? (v as TaskStatus)
    : null;
}

export function toTaskApprovalAction(v: unknown): TaskApprovalAction | null {
  if (v === "APPROVE" || v === "REJECT") return v;
  return null;
}

export function toProjectIdOrNull(v: unknown): bigint | null {
  const s = toNonEmptyString(v);
  if (!s) return null;
  return toBigIntOrThrow(s, "PROJECT_ID_INVALID");
}

export function parseTaskIds(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const item of v) {
    const id = toNonEmptyString(item);
    if (!id) return null;
    out.push(id);
  }
  return out;
}

export function isJsonValueForStorage(v: unknown): boolean {
  if (v === null) return true;
  if (typeof v === "string") return true;
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "boolean") return true;
  if (Array.isArray(v)) return true;
  return isRecord(v);
}
