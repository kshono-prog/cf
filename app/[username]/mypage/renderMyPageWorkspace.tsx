import { notFound } from "next/navigation";

import AccountPageClient from "./AccountPageClient";
import { getCreatorProfileByUsername } from "@/lib/creatorProfile";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";

export async function renderMyPageWorkspace(params: {
  username: string;
  initialWorkspaceView: WorkspaceView;
}) {
  const creator = await getCreatorProfileByUsername(params.username);
  if (!creator) notFound();

  return (
    <AccountPageClient
      username={params.username}
      initialWorkspaceView={params.initialWorkspaceView}
    />
  );
}
