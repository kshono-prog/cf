import { ProfileClientSection } from "@/app/[username]/ProfileClientSection";
import { loadPublicPageData } from "@/lib/publicPageData";

type Params = {
  username: string;
};

export default async function HomePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;
  const { creator, projectId, projectIdsByCurrency } =
    await loadPublicPageData(username);

  return (
    <ProfileClientSection
      username={username}
      creator={creator}
      projectId={projectId}
      projectIdsByCurrency={projectIdsByCurrency}
      screen="home"
    />
  );
}
