import type { FeedListView } from "@/lib/feedList";
import type { CreatorProfile } from "@/lib/profileTypes";
import type {
  SupportProfileView,
  SupportProjectView,
} from "@/lib/supportProfileView";
import ProfileClient from "@/components/ProfileClient";

type ProfileClientSectionProps = {
  username: string;
  creator: Omit<CreatorProfile, "address"> & { address?: string | null };
  projectId: string | null;
  projectIdsByCurrency?: {
    JPYC: string | null;
    USDC: string | null;
  } | null;
  supportProfileView?: SupportProfileView | null;
  recruitingProjects?: SupportProjectView[] | null;
  initialFeed?: FeedListView | null;
};

export function ProfileClientSection({
  username,
  creator,
  projectId,
  projectIdsByCurrency,
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
      supportProfileView={supportProfileView ?? null}
      recruitingProjects={recruitingProjects ?? []}
      initialFeed={initialFeed ?? null}
      layout="content"
    />
  );
}
