import { notFound } from "next/navigation";
import { headers } from "next/headers";

import AccountPageClient from "./AccountPageClient";
import {
  parseAiOfficePanelUrlState,
  type AiOfficePanelUrlState,
} from "@/components/mypage/aiOfficePanelUrlState";
import { getCreatorProfileByUsername } from "@/lib/creatorProfile";
import { getMeStatusByAddress } from "@/lib/mypageMe";
import {
  DEV_MANUAL_CHECK_SEARCH_PARAM,
  isDevManualCheckEnabled,
  isDevRuntime,
  isLocalDevHost,
  resolveDevManualCheckAddress,
} from "@/lib/manualCheckDev";
import { normalizeMyPageMePayload } from "@/lib/mypageApiResponses";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";
import { resolveCreatorProjectSelection } from "@/lib/serializers/creator";

function buildSearchParams(
  value: Record<string, string | string[] | undefined> | undefined
): URLSearchParams {
  const searchParams = new URLSearchParams();

  for (const [key, entry] of Object.entries(value ?? {})) {
    if (Array.isArray(entry)) {
      for (const item of entry) {
        if (typeof item === "string") {
          searchParams.append(key, item);
        }
      }
      continue;
    }

    if (typeof entry === "string") {
      searchParams.set(key, entry);
    }
  }

  return searchParams;
}

function hasAiOfficeInitialUrlState(
  value: Partial<AiOfficePanelUrlState>
): boolean {
  return (
    value.activeView !== undefined ||
    value.selectedRoleId !== undefined ||
    value.selectedInboxRoleId !== null ||
    value.openLatestTaskType !== null
  );
}

export async function renderMyPageWorkspace(params: {
  username: string;
  initialWorkspaceView: WorkspaceView;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const creator = await getCreatorProfileByUsername(params.username);
  if (!creator) notFound();
  const initialProjects = resolveCreatorProjectSelection({
    activeProjectIdJpyc: creator.profile.activeProjectIdJpyc ?? null,
    activeProjectIdUsdc: creator.profile.activeProjectIdUsdc ?? null,
  });
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const manualCheckAddress =
    isDevRuntime() &&
    isLocalDevHost(host) &&
    isDevManualCheckEnabled(
      params.searchParams?.[DEV_MANUAL_CHECK_SEARCH_PARAM]
    )
      ? resolveDevManualCheckAddress(creator.profile.walletAddress)
      : null;
  const initialManualCheckMe = manualCheckAddress
    ? normalizeMyPageMePayload(await getMeStatusByAddress(manualCheckAddress))
    : null;
  const parsedAiOfficeUrlState = parseAiOfficePanelUrlState(
    buildSearchParams(params.searchParams)
  );
  const initialAiOfficeUrlState = hasAiOfficeInitialUrlState(
    parsedAiOfficeUrlState
  )
    ? parsedAiOfficeUrlState
    : undefined;

  return (
    <AccountPageClient
      username={params.username}
      initialWorkspaceView={params.initialWorkspaceView}
      initialProjectId={initialProjects.projectId}
      initialProjectIdsByCurrency={initialProjects.projectIdsByCurrency}
      manualCheckAddress={manualCheckAddress}
      initialMeStatus={initialManualCheckMe}
      initialAiOfficeUrlState={initialAiOfficeUrlState}
    />
  );
}
