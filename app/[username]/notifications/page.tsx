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

  return <NotificationsPageClient username={username} />;
}
