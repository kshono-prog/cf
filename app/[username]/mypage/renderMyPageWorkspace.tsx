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
import {
  buildCreatorReadyMeStatus,
  buildUserOnlyMeStatus,
  E2E_MOCK_SEARCH_PARAM,
  getE2EMockOwnerAddress,
  parseE2EMockScenario,
} from "@/lib/testing/e2eMocks";

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
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const e2eMockScenario = parseE2EMockScenario(
    params.searchParams?.[E2E_MOCK_SEARCH_PARAM]
  );
  const creator = await getCreatorProfileByUsername(params.username);
  const e2eMockMe =
    isDevRuntime() && e2eMockScenario === "userOnly"
      ? buildUserOnlyMeStatus(params.username)
      : isDevRuntime() && e2eMockScenario === "creatorReady"
        ? buildCreatorReadyMeStatus(params.username)
        : null;
  const syntheticCreatorProfile =
    isDevRuntime() &&
    isLocalDevHost(host) &&
    !creator &&
    (e2eMockScenario !== null || params.username.startsWith("e2e-"))
      ? {
          id: `e2e-${params.username}`,
          username: params.username,
          walletAddress:
            e2eMockMe?.creator?.address ?? getE2EMockOwnerAddress(),
          activeProjectIdJpyc: null,
          activeProjectIdUsdc: null,
        }
      : null;
  const creatorProfile = creator?.profile ?? syntheticCreatorProfile;
  if (!creatorProfile) notFound();
  const initialProjects = resolveCreatorProjectSelection({
    activeProjectIdJpyc:
      e2eMockMe?.projectIdsByCurrency?.JPYC ??
      creatorProfile.activeProjectIdJpyc ??
      null,
    activeProjectIdUsdc:
      e2eMockMe?.projectIdsByCurrency?.USDC ??
      creatorProfile.activeProjectIdUsdc ??
      null,
  });
  const manualCheckAddress =
    isDevRuntime() &&
    isLocalDevHost(host) &&
    isDevManualCheckEnabled(
      params.searchParams?.[DEV_MANUAL_CHECK_SEARCH_PARAM]
    )
      ? resolveDevManualCheckAddress(
          e2eMockMe?.creator?.address ?? getE2EMockOwnerAddress()
        ) ??
        resolveDevManualCheckAddress(creatorProfile.walletAddress)
      : null;
  const initialManualCheckMe = manualCheckAddress
    ? normalizeMyPageMePayload(
        e2eMockMe ?? (await getMeStatusByAddress(manualCheckAddress))
      )
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
      initialProjectId={e2eMockMe?.projectId ?? initialProjects.projectId}
      initialProjectIdsByCurrency={
        e2eMockMe?.projectIdsByCurrency ?? initialProjects.projectIdsByCurrency
      }
      manualCheckAddress={manualCheckAddress}
      initialMeStatus={initialManualCheckMe}
      initialAiOfficeUrlState={initialAiOfficeUrlState}
    />
  );
}
