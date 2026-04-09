import { HomeClientSection } from "@/app/[username]/HomeClientSection";
import { loadPublicPageData } from "@/lib/publicPageData";
import { getInitialPublicFeedList } from "@/lib/feedList";
import { PublicWorkspaceShell } from "@/components/layout/PublicWorkspaceShell";

type Params = {
  username: string;
};

export default async function HomePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;
  const [{ creator, projectId, projectIdsByCurrency, publicAiManager, supportProfileView }, initialFeed] =
    await Promise.all([
      loadPublicPageData(username),
      getInitialPublicFeedList(null),
    ]);

  return (
    <PublicWorkspaceShell
      username={username}
      currentPage="home"
      creator={creator}
      supportShortcutHref={`/${username}#support-projects`}
      publicAiManager={publicAiManager}
      supportProfileView={supportProfileView}
    >
      <HomeClientSection
        username={username}
        creator={creator}
        projectId={projectId}
        projectIdsByCurrency={projectIdsByCurrency}
        initialFeed={initialFeed}
      />
    </PublicWorkspaceShell>
  );
}
