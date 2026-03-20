import { notFound } from "next/navigation";

import AccountPageClient from "./AccountPageClient";
import { getCreatorProfileByUsername } from "@/lib/creatorProfile";
import { resolveCreatorProjectSelection } from "@/lib/serializers/creator";

type Params = { username: string };

export default async function MyPage({ params }: { params: Promise<Params> }) {
  const { username } = await params;
  const creator = await getCreatorProfileByUsername(username);
  if (!creator) notFound();

  const initialProjects = resolveCreatorProjectSelection({
    activeProjectIdJpyc: creator.profile.activeProjectIdJpyc ?? null,
    activeProjectIdUsdc: creator.profile.activeProjectIdUsdc ?? null,
  });

  return (
    <AccountPageClient
      username={username}
      initialWorkspaceView="advanced"
      renderMode="settings"
      initialProjectId={initialProjects.projectId}
      initialProjectIdsByCurrency={initialProjects.projectIdsByCurrency}
    />
  );
}
