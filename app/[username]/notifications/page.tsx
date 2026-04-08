import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { NotificationsPageClient } from "@/components/social/NotificationsPageClient";

type Params = {
  username: string;
};

export default async function NotificationsPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;

  return (
    <PublicPageShell username={username}>
      <NotificationsPageClient username={username} />
    </PublicPageShell>
  );
}
