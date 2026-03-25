import type {
  ActionLogType,
  ActionLogVisibility,
  ActionTargetEntityType,
  ContactTemperature,
  ExternalContactSourceType,
  ExternalContactStatus,
  ExternalContactType,
  ManagerAssignmentRole,
  ManagerAssignmentStatus,
  ManagerNoteType,
  MeetingStatus,
  MeetingType,
  MeetingVisibility,
  NoteVisibility,
} from "@prisma/client";

function toEnumValue<T extends string>(
  value: unknown,
  allowed: readonly T[]
): T | null {
  if (typeof value !== "string") return null;
  return allowed.includes(value as T) ? (value as T) : null;
}

export const MANAGER_ASSIGNMENT_ROLES = [
  "PRIMARY",
  "SUPPORTING",
] as const satisfies readonly ManagerAssignmentRole[];

export const MANAGER_ASSIGNMENT_STATUSES = [
  "ACTIVE",
  "PAUSED",
  "ENDED",
] as const satisfies readonly ManagerAssignmentStatus[];

export const MANAGER_NOTE_TYPES = [
  "GENERAL",
  "VENUE_SCOUT",
  "SALES_MEETING",
  "NEGOTIATION",
  "CREATOR_STATUS",
  "EVENT_OPERATION",
  "RISK",
  "FOLLOW_UP",
] as const satisfies readonly ManagerNoteType[];

export const NOTE_VISIBILITIES = [
  "MANAGER_ONLY",
  "INTERNAL_TEAM",
  "SHAREABLE_WITH_CREATOR",
] as const satisfies readonly NoteVisibility[];

export const EXTERNAL_CONTACT_TYPES = [
  "VENUE",
  "ORGANIZER",
  "MEDIA",
  "BRAND",
  "COMPANY",
  "COLLABORATOR",
  "AGENCY",
  "SPONSOR",
  "OTHER",
] as const satisfies readonly ExternalContactType[];

export const EXTERNAL_CONTACT_STATUSES = [
  "NEW",
  "CONTACTED",
  "REPLIED",
  "MEETING_SCHEDULED",
  "IN_DISCUSSION",
  "NEGOTIATING",
  "ON_HOLD",
  "WON",
  "LOST",
  "ONGOING",
] as const satisfies readonly ExternalContactStatus[];

export const CONTACT_TEMPERATURES = [
  "UNKNOWN",
  "COLD",
  "NEUTRAL",
  "WARM",
  "HOT",
] as const satisfies readonly ContactTemperature[];

export const EXTERNAL_CONTACT_SOURCE_TYPES = [
  "MANUAL",
  "IMPORTED",
  "AI_SUGGESTED",
] as const satisfies readonly ExternalContactSourceType[];

export const MEETING_TYPES = [
  "WEEKLY_REVIEW",
  "RELEASE_CHECK",
  "OUTREACH_PROGRESS",
  "EVENT_PREP",
  "RETROSPECTIVE",
  "URGENT_RESPONSE",
  "OTHER",
] as const satisfies readonly MeetingType[];

export const MEETING_STATUSES = [
  "SCHEDULED",
  "COMPLETED",
  "CANCELED",
] as const satisfies readonly MeetingStatus[];

export const MEETING_VISIBILITIES = [
  "INTERNAL",
  "CREATOR_VISIBLE",
] as const satisfies readonly MeetingVisibility[];

export const ACTION_LOG_TYPES = [
  "PROJECT_CREATED",
  "PROJECT_UPDATED",
  "GOAL_UPDATED",
  "GOAL_ACHIEVED",
  "MEETING_CREATED",
  "MEETING_COMPLETED",
  "MANAGER_ASSIGNMENT_CREATED",
  "MANAGER_ASSIGNMENT_UPDATED",
  "MANAGER_NOTE_CREATED",
  "MANAGER_NOTE_UPDATED",
  "CONTACT_CREATED",
  "CONTACT_UPDATED",
  "CONTACT_ACTIVITY_RECORDED",
  "TASK_CREATED",
  "TASK_COMPLETED",
  "AI_SUGGESTION_CREATED",
  "AI_SUGGESTION_ACCEPTED",
  "AI_SUGGESTION_REJECTED",
  "DRAFT_CREATED",
  "DRAFT_UPDATED",
  "OPPORTUNITY_LINKED",
  "STATUS_CHANGED",
  "OTHER",
] as const satisfies readonly ActionLogType[];

export const ACTION_LOG_VISIBILITIES = [
  "INTERNAL",
  "CREATOR_VISIBLE",
  "SYSTEM_ONLY",
] as const satisfies readonly ActionLogVisibility[];

export const ACTION_TARGET_ENTITY_TYPES = [
  "PROJECT",
  "GOAL",
  "MEETING",
  "MANAGER_ASSIGNMENT",
  "MANAGER_NOTE",
  "EXTERNAL_CONTACT",
  "TASK",
  "DRAFT",
  "OPPORTUNITY",
  "OTHER",
] as const satisfies readonly ActionTargetEntityType[];

export function toManagerAssignmentRole(
  value: unknown
): ManagerAssignmentRole | null {
  return toEnumValue(value, MANAGER_ASSIGNMENT_ROLES);
}

export function toManagerAssignmentStatus(
  value: unknown
): ManagerAssignmentStatus | null {
  return toEnumValue(value, MANAGER_ASSIGNMENT_STATUSES);
}

export function toManagerNoteType(value: unknown): ManagerNoteType | null {
  return toEnumValue(value, MANAGER_NOTE_TYPES);
}

export function toNoteVisibility(value: unknown): NoteVisibility | null {
  return toEnumValue(value, NOTE_VISIBILITIES);
}

export function toExternalContactType(
  value: unknown
): ExternalContactType | null {
  return toEnumValue(value, EXTERNAL_CONTACT_TYPES);
}

export function toExternalContactStatus(
  value: unknown
): ExternalContactStatus | null {
  return toEnumValue(value, EXTERNAL_CONTACT_STATUSES);
}

export function toContactTemperature(
  value: unknown
): ContactTemperature | null {
  return toEnumValue(value, CONTACT_TEMPERATURES);
}

export function toExternalContactSourceType(
  value: unknown
): ExternalContactSourceType | null {
  return toEnumValue(value, EXTERNAL_CONTACT_SOURCE_TYPES);
}

export function toMeetingType(value: unknown): MeetingType | null {
  return toEnumValue(value, MEETING_TYPES);
}

export function toMeetingStatus(value: unknown): MeetingStatus | null {
  return toEnumValue(value, MEETING_STATUSES);
}

export function toMeetingVisibility(value: unknown): MeetingVisibility | null {
  return toEnumValue(value, MEETING_VISIBILITIES);
}

export function toActionLogType(value: unknown): ActionLogType | null {
  return toEnumValue(value, ACTION_LOG_TYPES);
}

export function toActionLogVisibility(
  value: unknown
): ActionLogVisibility | null {
  return toEnumValue(value, ACTION_LOG_VISIBILITIES);
}

export function toActionTargetEntityType(
  value: unknown
): ActionTargetEntityType | null {
  return toEnumValue(value, ACTION_TARGET_ENTITY_TYPES);
}
