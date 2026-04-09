import { SearchPageClient } from "@/components/social/SearchPageClient";
import { getDiscoverCreators } from "@/lib/discoverCreators";
import { getInitialPublicFeedList } from "@/lib/feedList";
import { PublicWorkspaceShell } from "@/components/layout/PublicWorkspaceShell";
import { loadPublicPageData } from "@/lib/publicPageData";

type Params = {
  username: string;
};

export default async function SearchPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;
  const [initialCreators, initialFeed, publicPageData] = await Promise.all([
    getDiscoverCreators(18),
    getInitialPublicFeedList(null, 30),
    loadPublicPageData(username),
  ]);

  return (
    <PublicWorkspaceShell
      username={username}
      currentPage="search"
      creator={publicPageData.creator}
      supportShortcutHref={`/${username}#support-projects`}
      publicAiManager={publicPageData.publicAiManager}
      supportProfileView={publicPageData.supportProfileView}
    >
      <SearchPageClient
        username={username}
        initialCreators={initialCreators}
        initialPosts={initialFeed.items}
      />
    </PublicWorkspaceShell>
  );
}
