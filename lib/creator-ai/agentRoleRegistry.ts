import type { TaskType } from "@/lib/agentTaskParsers";

export type CreatorAiAgentRole =
  | "MANAGER"
  | "PROMOTION"
  | "FINANCE"
  | "FAN_RELATION";

export type CreatorAiRolloutPhase = "MVP" | "PHASE_2" | "FUTURE";

export type CreatorAiUiTarget =
  | "project"
  | "goal"
  | "summary"
  | "achieve"
  | "plan"
  | "bridge"
  | "distributionResult"
  | "publicProfile"
  | "supporterMessage"
  | "reporting";

export type CreatorAiExecutionBoundary =
  | "advisory_only"
  | "approval_required";

export type BillableReadiness =
  | "none"
  | "internal_candidate"
  | "x402_candidate";

export type CreatorAiAgentRoleDefinition = {
  id: CreatorAiAgentRole;
  label: string;
  description: string;
  phase: CreatorAiRolloutPhase;
  executionBoundary: CreatorAiExecutionBoundary;
  billableReadiness: BillableReadiness;
  candidateTaskTypes: readonly TaskType[];
  allowedTargets: readonly CreatorAiUiTarget[];
};

export const CREATOR_AI_AGENT_ROLE_DEFINITIONS: readonly CreatorAiAgentRoleDefinition[] =
  [
    {
      id: "MANAGER",
      label: "Manager Agent",
      description:
        "Tracks project progress, next actions, and achievement readiness inside the current creator workflow.",
      phase: "MVP",
      executionBoundary: "advisory_only",
      billableReadiness: "internal_candidate",
      candidateTaskTypes: ["PROPOSE", "ANALYZE", "WEEKLY_REPORT"],
      allowedTargets: ["project", "goal", "summary", "achieve", "reporting"],
    },
    {
      id: "PROMOTION",
      label: "Promotion Agent",
      description:
        "Creates public-facing drafts such as project copy, announcements, and promotion ideas.",
      phase: "MVP",
      executionBoundary: "approval_required",
      billableReadiness: "x402_candidate",
      candidateTaskTypes: ["PROPOSE", "ANNOUNCEMENT_DRAFT", "TRANSLATE"],
      allowedTargets: ["project", "publicProfile", "summary", "reporting"],
    },
    {
      id: "FINANCE",
      label: "Finance Agent",
      description:
        "Drafts plan and funding explanations without auto-executing bridge or distribution actions.",
      phase: "MVP",
      executionBoundary: "approval_required",
      billableReadiness: "internal_candidate",
      candidateTaskTypes: ["ANALYZE", "PROPOSE", "WEEKLY_REPORT"],
      allowedTargets: ["summary", "plan", "reporting"],
    },
    {
      id: "FAN_RELATION",
      label: "Fan Relation Agent",
      description:
        "Supports supporter communication, thank-you drafts, and retention-oriented reporting.",
      phase: "PHASE_2",
      executionBoundary: "approval_required",
      billableReadiness: "x402_candidate",
      candidateTaskTypes: [
        "SUPPORTER_MESSAGE_DRAFT",
        "ANNOUNCEMENT_DRAFT",
        "WEEKLY_REPORT",
      ],
      allowedTargets: ["supporterMessage", "reporting", "summary"],
    },
  ] as const;

export function getCreatorAiAgentRoleDefinition(
  role: CreatorAiAgentRole
): CreatorAiAgentRoleDefinition | undefined {
  return CREATOR_AI_AGENT_ROLE_DEFINITIONS.find(
    (definition) => definition.id === role
  );
}

export function getCreatorAiAgentRolesByPhase(
  phase: CreatorAiRolloutPhase
): CreatorAiAgentRoleDefinition[] {
  return CREATOR_AI_AGENT_ROLE_DEFINITIONS.filter(
    (definition) => definition.phase === phase
  );
}
