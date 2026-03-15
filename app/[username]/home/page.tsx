import { HomeClientSection } from "@/app/[username]/HomeClientSection";
import { loadPublicPageData } from "@/lib/publicPageData";
import { getInitialPublicFeedList } from "@/lib/feedList";

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
    <HomeClientSection
      username={username}
      creator={creator}
      projectId={projectId}
      projectIdsByCurrency={projectIdsByCurrency}
      initialFeed={initialFeed}
    />
  );
}
