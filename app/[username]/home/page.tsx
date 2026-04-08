import { HomeClientSection } from "@/app/[username]/HomeClientSection";
import { loadPublicPageData } from "@/lib/publicPageData";
import { getInitialPublicFeedList } from "@/lib/feedList";
import { PublicPageShell } from "@/components/layout/PublicPageShell";

type Params = {
  username: string;
};

export default async function HomePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;
  const [{ creator, projectId, projectIdsByCurrency }, initialFeed] =
    await Promise.all([
      loadPublicPageData(username),
      getInitialPublicFeedList(null),
    ]);

  return (
    <PublicPageShell username={username}>
      <HomeClientSection
        username={username}
        creator={creator}
        projectId={projectId}
        projectIdsByCurrency={projectIdsByCurrency}
        initialFeed={initialFeed}
      />
    </PublicPageShell>
  );
}
