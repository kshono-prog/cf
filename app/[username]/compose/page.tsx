import { ComposePageClient } from "@/components/social/ComposePageClient";
import { loadPublicPageData } from "@/lib/publicPageData";
import { PublicPageShell } from "@/components/layout/PublicPageShell";

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
    <PublicPageShell username={username}>
      <ComposePageClient
        username={username}
        creator={creator}
        projectIdsByCurrency={projectIdsByCurrency}
      />
    </PublicPageShell>
  );
}
