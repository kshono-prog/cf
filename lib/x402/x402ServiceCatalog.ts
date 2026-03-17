import type { TaskType } from "@/lib/agentTaskParsers";

export type X402ServiceSurfaceId =
  | "CREATOR_ANALYSIS_API"
  | "ANNOUNCEMENT_DRAFT_API"
  | "SUPPORTER_MESSAGE_API"
  | "WEEKLY_REPORT_API"
  | "BUDGET_PLAN_DRAFT_API";

export type X402PaymentModel = "per_call" | "future";

export type X402RiskLevel = "low" | "medium";

export type X402ReadinessPhase = "PHASE_2" | "FUTURE";

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
