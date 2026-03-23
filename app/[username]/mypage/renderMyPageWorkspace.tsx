import { notFound } from "next/navigation";
import { headers } from "next/headers";

import AccountPageClient from "./AccountPageClient";
import { getCreatorProfileByUsername } from "@/lib/creatorProfile";
import {
  DEV_MANUAL_CHECK_SEARCH_PARAM,
  isDevManualCheckEnabled,
  isDevRuntime,
  isLocalDevHost,
  resolveDevManualCheckAddress,
} from "@/lib/manualCheckDev";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";
import { resolveCreatorProjectSelection } from "@/lib/serializers/creator";

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

  return (
    <AccountPageClient
      username={params.username}
      initialWorkspaceView={params.initialWorkspaceView}
      initialProjectId={initialProjects.projectId}
      initialProjectIdsByCurrency={initialProjects.projectIdsByCurrency}
      manualCheckAddress={manualCheckAddress}
    />
  );
}
