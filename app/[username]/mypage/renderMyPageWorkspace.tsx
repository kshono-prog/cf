import { notFound } from "next/navigation";

import AccountPageClient from "./AccountPageClient";
import { getCreatorProfileByUsername } from "@/lib/creatorProfile";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";
import { resolveCreatorProjectSelection } from "@/lib/serializers/creator";

export async function renderMyPageWorkspace(params: {
  username: string;
  initialWorkspaceView: WorkspaceView;
}) {
  const creator = await getCreatorProfileByUsername(params.username);
  if (!creator) notFound();
  const initialProjects = resolveCreatorProjectSelection({
    activeProjectIdJpyc: creator.profile.activeProjectIdJpyc ?? null,
    activeProjectIdUsdc: creator.profile.activeProjectIdUsdc ?? null,
  });

  return (
    <AccountPageClient
      username={params.username}
      initialWorkspaceView={params.initialWorkspaceView}
      initialProjectId={initialProjects.projectId}
      initialProjectIdsByCurrency={initialProjects.projectIdsByCurrency}
    />
  );
}
