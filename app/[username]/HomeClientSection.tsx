import dynamic from "next/dynamic";

import type { FeedListView } from "@/lib/feedList";
import type { CreatorProfile } from "@/lib/profileTypes";

const HomeFeedClient = dynamic(
  () =>
    import("@/components/home/HomeFeedClient").then(
      (module) => module.HomeFeedClient
    ),
  {
    loading: () => (
      <div className="px-4 pb-6 text-sm text-[var(--text-subtle)]">
        最新の投稿を読み込み中…
      </div>
    ),
  }
);

type HomeClientSectionProps = {
  username: string;
  creator: Omit<CreatorProfile, "address"> & { address?: string | null };
  projectId: string | null;
  projectIdsByCurrency?: {
    JPYC: string | null;
    USDC: string | null;
  } | null;
  initialFeed?: FeedListView | null;
};

export function HomeClientSection({
  username,
  creator,
  projectId,
  projectIdsByCurrency,
  initialFeed,
}: HomeClientSectionProps) {
  return (
    <HomeFeedClient
      username={username}
      creator={creator}
      projectId={projectId}
      projectIdsByCurrency={projectIdsByCurrency ?? undefined}
      initialFeed={initialFeed ?? null}
      layout="content"
    />
  );
}
