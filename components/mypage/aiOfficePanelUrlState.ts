import type { AiOfficeView } from "@/components/mypage/aiOfficeTypes";
import type { CreatorAiAgentRole } from "@/lib/creator-ai/agentRoleRegistry";
import { toCreatorAiAgentRole } from "@/lib/creator-ai/agentRoleRegistry";

export const AI_OFFICE_URL_PARAMS = {
  view: "aiOfficeView",
  role: "aiOfficeRole",
  inboxRole: "aiOfficeInboxRole",
} as const;

const DEFAULT_AI_OFFICE_URL_ROLE: CreatorAiAgentRole = "MANAGER";

export type AiOfficePanelUrlState = {
  activeView: AiOfficeView;
  selectedRoleId: CreatorAiAgentRole;
  selectedInboxRoleId: CreatorAiAgentRole | null;
};

export function isAiOfficeView(value: unknown): value is AiOfficeView {
  return value === "OVERVIEW" || value === "CREATE" || value === "INBOX";
}

export function parseAiOfficePanelUrlState(
  searchParams: URLSearchParams
): Partial<AiOfficePanelUrlState> {
  const activeViewParam = searchParams.get(AI_OFFICE_URL_PARAMS.view);
  const selectedRoleParam = searchParams.get(AI_OFFICE_URL_PARAMS.role);
  const selectedInboxRoleParam = searchParams.get(AI_OFFICE_URL_PARAMS.inboxRole);

  return {
    activeView: isAiOfficeView(activeViewParam)
      ? activeViewParam
      : undefined,
    selectedRoleId: toCreatorAiAgentRole(selectedRoleParam) ?? undefined,
    selectedInboxRoleId:
      selectedInboxRoleParam === null
        ? null
        : toCreatorAiAgentRole(selectedInboxRoleParam),
  };
}

export function buildAiOfficePanelSearchParams(
  currentSearchParams: URLSearchParams,
  state: AiOfficePanelUrlState
): URLSearchParams {
  const nextSearchParams = new URLSearchParams(currentSearchParams);

  if (state.activeView === "OVERVIEW") {
    nextSearchParams.delete(AI_OFFICE_URL_PARAMS.view);
  } else {
    nextSearchParams.set(AI_OFFICE_URL_PARAMS.view, state.activeView);
  }

  if (state.selectedRoleId === DEFAULT_AI_OFFICE_URL_ROLE) {
    nextSearchParams.delete(AI_OFFICE_URL_PARAMS.role);
  } else {
    nextSearchParams.set(AI_OFFICE_URL_PARAMS.role, state.selectedRoleId);
  }

  if (state.selectedInboxRoleId) {
    nextSearchParams.set(
      AI_OFFICE_URL_PARAMS.inboxRole,
      state.selectedInboxRoleId
    );
  } else {
    nextSearchParams.delete(AI_OFFICE_URL_PARAMS.inboxRole);
  }

  return nextSearchParams;
}

export function buildAiOfficePanelHref(input: {
  pathname: string;
  hash: string;
  currentSearchParams: URLSearchParams;
  state: AiOfficePanelUrlState;
}): string {
  const nextSearchParams = buildAiOfficePanelSearchParams(
    input.currentSearchParams,
    input.state
  );
  const nextSearch = nextSearchParams.toString();

  return `${input.pathname}${nextSearch ? `?${nextSearch}` : ""}${input.hash}`;
}
