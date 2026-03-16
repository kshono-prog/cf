import dynamic from "next/dynamic";
import type { FeedListView } from "@/lib/feedList";
import type { CreatorProfile } from "@/lib/profileTypes";
import type { PublicSummaryLite } from "@/lib/publicSummary";
import type {
  SupportProfileView,
  SupportProjectView,
} from "@/lib/supportProfileView";

const ProfileClient = dynamic(() => import("@/components/ProfileClient"), {
  loading: () => (
    <div className="px-4 pb-6 text-sm text-[var(--text-subtle)]">
      追加情報を読み込み中…
    </div>
  ),
});

type ProfileClientSectionProps = {
  username: string;
  creator: Omit<CreatorProfile, "address"> & { address?: string | null };
  projectId: string | null;
  projectIdsByCurrency?: {
    JPYC: string | null;
    USDC: string | null;
  } | null;
  publicSummary?: PublicSummaryLite | null;
  supportProfileView?: SupportProfileView | null;
  recruitingProjects?: SupportProjectView[] | null;
  initialFeed?: FeedListView | null;
};

export function ProfileClientSection({
  username,
  creator,
  projectId,
  projectIdsByCurrency,
  publicSummary,
  supportProfileView,
  recruitingProjects,
  initialFeed,
}: ProfileClientSectionProps) {
  return (
    <ProfileClient
      username={username}
      creator={creator}
      projectId={projectId}
      projectIdsByCurrency={projectIdsByCurrency ?? undefined}
      publicSummary={publicSummary ?? null}
      supportProfileView={supportProfileView ?? null}
      recruitingProjects={recruitingProjects ?? []}
      initialFeed={initialFeed ?? null}
      layout="content"
    />
  );
}
