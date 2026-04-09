import { ComposePageClient } from "@/components/social/ComposePageClient";
import { loadPublicPageData } from "@/lib/publicPageData";
import { PublicWorkspaceShell } from "@/components/layout/PublicWorkspaceShell";

type Params = {
  username: string;
};

export default async function ComposePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;
  const { creator, projectIdsByCurrency, publicAiManager, supportProfileView } =
    await loadPublicPageData(username);

  return (
    <PublicWorkspaceShell
      username={username}
      currentPage="compose"
      creator={creator}
      supportShortcutHref={`/${username}#support-projects`}
      publicAiManager={publicAiManager}
      supportProfileView={supportProfileView}
    >
      <ComposePageClient
        username={username}
        creator={creator}
        projectIdsByCurrency={projectIdsByCurrency}
      />
    </PublicWorkspaceShell>
  );
}
