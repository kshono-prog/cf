import type { AiOfficeView } from "@/components/mypage/aiOfficeTypes";
import type { TaskType } from "@/lib/agentTaskParsers";
import { toTaskType } from "@/lib/agentTaskParsers";
import type { CreatorAiAgentRole } from "@/lib/creator-ai/agentRoleRegistry";
import { toCreatorAiAgentRole } from "@/lib/creator-ai/agentRoleRegistry";

export const AI_OFFICE_URL_PARAMS = {
  view: "aiOfficeView",
  role: "aiOfficeRole",
  inboxRole: "aiOfficeInboxRole",
  openLatestTaskType: "aiOfficeOpenLatestTaskType",
  openCreateTaskType: "aiOfficeOpenCreateTaskType",
} as const;

const DEFAULT_AI_OFFICE_URL_ROLE: CreatorAiAgentRole = "MANAGER";

export type AiOfficePanelUrlState = {
  activeView: AiOfficeView;
  selectedRoleId: CreatorAiAgentRole;
  selectedInboxRoleId: CreatorAiAgentRole | null;
  openLatestTaskType: TaskType | null;
  /** Pre-select a task type in the Create view. When set, the panel opens directly to that task type. */
  openCreateTaskType?: TaskType | null;
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
  const openLatestTaskTypeParam = searchParams.get(
    AI_OFFICE_URL_PARAMS.openLatestTaskType
  );
  const openCreateTaskTypeParam = searchParams.get(
    AI_OFFICE_URL_PARAMS.openCreateTaskType
  );

  return {
    activeView: isAiOfficeView(activeViewParam)
      ? activeViewParam
      : undefined,
    selectedRoleId: toCreatorAiAgentRole(selectedRoleParam) ?? undefined,
    selectedInboxRoleId:
      selectedInboxRoleParam === null
        ? null
        : toCreatorAiAgentRole(selectedInboxRoleParam),
    openLatestTaskType:
      openLatestTaskTypeParam === null
        ? null
        : toTaskType(openLatestTaskTypeParam),
    openCreateTaskType:
      openCreateTaskTypeParam === null
        ? null
        : toTaskType(openCreateTaskTypeParam),
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

  if (state.openLatestTaskType) {
    nextSearchParams.set(
      AI_OFFICE_URL_PARAMS.openLatestTaskType,
      state.openLatestTaskType
    );
  } else {
    nextSearchParams.delete(AI_OFFICE_URL_PARAMS.openLatestTaskType);
  }

  if (state.openCreateTaskType) {
    nextSearchParams.set(
      AI_OFFICE_URL_PARAMS.openCreateTaskType,
      state.openCreateTaskType
    );
  } else {
    nextSearchParams.delete(AI_OFFICE_URL_PARAMS.openCreateTaskType);
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
