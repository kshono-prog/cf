import { ComposePageClient } from "@/components/social/ComposePageClient";
import { loadPublicPageData } from "@/lib/publicPageData";

type Params = {
  username: string;
};

export default async function ComposePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;
  const { creator, projectIdsByCurrency } = await loadPublicPageData(username);

  return (
    <ComposePageClient
      username={username}
      creator={creator}
      projectIdsByCurrency={projectIdsByCurrency}
    />
  );
}
