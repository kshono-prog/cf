import { SearchPageClient } from "@/components/social/SearchPageClient";
import { getDiscoverCreators } from "@/lib/discoverCreators";
import { getInitialPublicFeedList } from "@/lib/feedList";
import { PublicPageShell } from "@/components/layout/PublicPageShell";

type Params = {
  username: string;
};

export default async function SearchPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;
  const [initialCreators, initialFeed] = await Promise.all([
    getDiscoverCreators(18),
    getInitialPublicFeedList(null, 30),
  ]);

  return (
    <PublicPageShell username={username}>
      <SearchPageClient
        username={username}
        initialCreators={initialCreators}
        initialPosts={initialFeed.items}
      />
    </PublicPageShell>
  );
}
