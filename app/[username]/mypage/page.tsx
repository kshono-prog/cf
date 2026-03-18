import { notFound } from "next/navigation";

import AccountPageClient from "./AccountPageClient";
import { getCreatorProfileByUsername } from "@/lib/creatorProfile";

type Params = { username: string };

export default async function MyPage({ params }: { params: Promise<Params> }) {
  const { username } = await params;
  const creator = await getCreatorProfileByUsername(username);
  if (!creator) notFound();

  const { profile } = creator;
  const initialProjectId =
    profile.activeProjectId ?? profile.activeProjectIdJpyc ?? null;
  const initialProjectIdsByCurrency = {
    JPYC: profile.activeProjectIdJpyc,
    USDC: profile.activeProjectIdUsdc,
  };

  return (
    <AccountPageClient
      username={username}
      initialWorkspaceView="advanced"
      renderMode="settings"
      initialProjectId={initialProjectId}
      initialProjectIdsByCurrency={initialProjectIdsByCurrency}
    />
  );
}
