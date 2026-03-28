import type { TaskType } from "@/lib/agentTaskParsers";

export type X402ServiceSurfaceId =
  | "CREATOR_ANALYSIS_API"
  | "ANNOUNCEMENT_DRAFT_API"
  | "SUPPORTER_MESSAGE_API"
  | "WEEKLY_REPORT_API"
  | "BUDGET_PLAN_DRAFT_API"
  | "DAILY_BRIEFING_API"
  | "CONTACT_INTELLIGENCE_API"
  | "MANAGER_OPERATIONS_API"
  | "GROWTH_ANALYTICS_API"
  | "FAN_RELATIONS_API";

export type X402PaymentModel = "per_call" | "future";

export type X402RiskLevel = "low" | "medium";

export type X402ReadinessPhase = "PHASE_2" | "PHASE_3" | "FUTURE";

export type X402ServiceSurface = {
  id: X402ServiceSurfaceId;
  label: string;
  description: string;
  paymentModel: X402PaymentModel;
  readinessPhase: X402ReadinessPhase;
  riskLevel: X402RiskLevel;
  requiresHumanApproval: boolean;
  taskTypes: readonly TaskType[];
  excludesFundsMovement: true;
};

export const X402_SERVICE_SURFACES: readonly X402ServiceSurface[] = [
  {
    id: "CREATOR_ANALYSIS_API",
    label: "Creator analysis API",
    description:
      "Returns creator or project analysis summaries for low-risk operational use.",
    paymentModel: "per_call",
    readinessPhase: "PHASE_2",
    riskLevel: "low",
    requiresHumanApproval: false,
    taskTypes: ["ANALYZE", "PROPOSE"],
    excludesFundsMovement: true,
  },
  {
    id: "ANNOUNCEMENT_DRAFT_API",
    label: "Announcement draft API",
    description:
      "Generates announcement drafts for creator or supporter communication.",
    paymentModel: "per_call",
    readinessPhase: "PHASE_2",
    riskLevel: "low",
    requiresHumanApproval: true,
    taskTypes: ["ANNOUNCEMENT_DRAFT", "TRANSLATE"],
    excludesFundsMovement: true,
  },
  {
    id: "SUPPORTER_MESSAGE_API",
    label: "Supporter message API",
    description:
      "Generates supporter-facing drafts such as thanks, milestone notes, or re-engagement copies.",
    paymentModel: "per_call",
    readinessPhase: "PHASE_2",
    riskLevel: "low",
    requiresHumanApproval: true,
    taskTypes: ["SUPPORTER_MESSAGE_DRAFT", "TRANSLATE"],
    excludesFundsMovement: true,
  },
  {
    id: "WEEKLY_REPORT_API",
    label: "Weekly report API",
    description:
      "Builds weekly or monthly creator operations summaries for internal or supporter-facing review.",
    paymentModel: "per_call",
    readinessPhase: "PHASE_2",
    riskLevel: "low",
    requiresHumanApproval: true,
    taskTypes: ["WEEKLY_REPORT", "ANALYZE"],
    excludesFundsMovement: true,
  },
  {
    id: "BUDGET_PLAN_DRAFT_API",
    label: "Budget plan draft API",
    description:
      "Suggests budget or allocation draft structures without executing distribution.",
    paymentModel: "future",
    readinessPhase: "FUTURE",
    riskLevel: "medium",
    requiresHumanApproval: true,
    taskTypes: ["PROPOSE", "ANALYZE"],
    excludesFundsMovement: true,
  },
  {
    id: "DAILY_BRIEFING_API",
    label: "Daily briefing API",
    description:
      "Returns a structured daily action plan with cashflow signals, stage maturity, and prioritized creator tasks.",
    paymentModel: "per_call",
    readinessPhase: "PHASE_3",
    riskLevel: "low",
    requiresHumanApproval: false,
    taskTypes: ["DAILY_ACTION_PLAN"],
    excludesFundsMovement: true,
  },
  {
    id: "CONTACT_INTELLIGENCE_API",
    label: "Contact intelligence API",
    description:
      "Analyzes external contact health — staleness, overdue actions, temperature — and returns a ranked risk list.",
    paymentModel: "per_call",
    readinessPhase: "PHASE_3",
    riskLevel: "low",
    requiresHumanApproval: false,
    taskTypes: ["CONTACT_INTELLIGENCE_ALERT"],
    excludesFundsMovement: true,
  },
  {
    id: "MANAGER_OPERATIONS_API",
    label: "Manager operations API",
    description:
      "Generates meeting agendas, contact outreach drafts, and career plans for manager-directed creator operations.",
    paymentModel: "per_call",
    readinessPhase: "PHASE_3",
    riskLevel: "low",
    requiresHumanApproval: true,
    taskTypes: ["MEETING_AGENDA_DRAFT", "CONTACT_OUTREACH_DRAFT", "CAREER_PLAN_DRAFT"],
    excludesFundsMovement: true,
  },
  {
    id: "GROWTH_ANALYTICS_API",
    label: "Growth analytics API",
    description:
      "Returns creator stage growth plans and opportunity alerts derived from activity, maturity axes, and content metrics.",
    paymentModel: "per_call",
    readinessPhase: "PHASE_3",
    riskLevel: "low",
    requiresHumanApproval: true,
    taskTypes: ["STAGE_GROWTH_PLAN", "GROWTH_OPPORTUNITY_ALERT"],
    excludesFundsMovement: true,
  },
  {
    id: "FAN_RELATIONS_API",
    label: "Fan relations API",
    description:
      "Generates supporter result reports and supporter-facing message drafts for fan relationship management.",
    paymentModel: "per_call",
    readinessPhase: "PHASE_3",
    riskLevel: "low",
    requiresHumanApproval: true,
    taskTypes: ["SUPPORTER_RESULT_REPORT", "SUPPORTER_MESSAGE_DRAFT"],
    excludesFundsMovement: true,
  },
] as const;

export function getX402ServiceSurface(
  id: X402ServiceSurfaceId
): X402ServiceSurface | undefined {
  return X402_SERVICE_SURFACES.find((surface) => surface.id === id);
}

export function getReadyX402ServiceSurfaces(
  phase: X402ReadinessPhase
): X402ServiceSurface[] {
  return X402_SERVICE_SURFACES.filter(
    (surface) => surface.readinessPhase === phase
  );
}

export function getX402SurfaceForTaskType(
  taskType: TaskType
): X402ServiceSurface | undefined {
  return X402_SERVICE_SURFACES.find((surface) =>
    (surface.taskTypes as readonly string[]).includes(taskType)
  );
}
