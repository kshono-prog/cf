import { PublicWorkspaceShell } from "@/components/layout/PublicWorkspaceShell";
import { NotificationsPageClient } from "@/components/social/NotificationsPageClient";
import { loadPublicPageData } from "@/lib/publicPageData";

type Params = {
  username: string;
};

export default async function NotificationsPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;
  const { creator, publicAiManager, supportProfileView } =
    await loadPublicPageData(username);

  return (
    <PublicWorkspaceShell
      username={username}
      currentPage="notifications"
      creator={creator}
      supportShortcutHref={`/${username}#support-projects`}
      publicAiManager={publicAiManager}
      supportProfileView={supportProfileView}
    >
      <NotificationsPageClient username={username} />
    </PublicWorkspaceShell>
  );
}
