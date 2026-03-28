import { Suspense } from "react";

import { ProfileClientSection } from "@/app/[username]/ProfileClientSection";
import { CreatorActivityCredibilityBadge } from "@/components/profile/CreatorActivityCredibilityBadge";
import { CreatorStageCard } from "@/components/profile/CreatorStageCard";
import { PublicProfileAnchorNav } from "@/components/profile/PublicProfileAnchorNav";
import { PublicProfileCreatorVoiceCard } from "@/components/profile/PublicProfileCreatorVoiceCard";
import { PublicProfileDeferredSectionsServer } from "@/components/profile/PublicProfileDeferredSectionsServer";
import { PublicProfileIntroServer } from "@/components/profile/PublicProfileIntroServer";
import { PublicProfileImpactNumbersInline } from "@/components/profile/PublicProfileImpactNumbers";
import { loadPublicProfilePageReadModel } from "@/lib/publicProfilePageReadModel";
import { isPrismaUnavailableError } from "@/lib/prismaRetry";
import { getActiveSupportProject } from "@/lib/supportProfileView";
import type { SupportProfileView } from "@/lib/supportProfileView";

type Props = {
  username: string;
};

function DeferredSectionsFallback() {
  return (
    <>
      <div id="supporters-section" className="space-y-4">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--text-subtle)]">
          支援者情報を読み込んでいます…
        </section>
      </div>
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--text-subtle)]">
        実績と活動データを準備しています…
      </section>
    </>
  );
}

function buildUnavailableSupportProfileView(): SupportProfileView {
  return {
    mode: "unavailable",
    activeCurrency: null,
    activeProjectId: null,
    projectsByCurrency: { JPYC: null, USDC: null },
    draft: null,
  };
}

function UnavailableBody({ username }: Props) {
  const unavailableSupportProfileView = buildUnavailableSupportProfileView();

  return (
    <div className="space-y-4">
      <ProfileClientSection
        username={username}
        creator={{
          username,
          displayName: username,
          avatarUrl: null,
          profile: null,
          qrcode: null,
          url: null,
          themeColor: null,
          creatorType: null,
          ecosystemRole: null,
          socials: undefined,
          youtubeVideos: undefined,
        }}
        projectId={null}
        projectIdsByCurrency={{ JPYC: null, USDC: null }}
        supportProfileView={unavailableSupportProfileView}
        recruitingProjects={[]}
        initialFeed={null}
        introContent={
          <PublicProfileIntroServer
            username={username}
            creator={{
              username,
              displayName: username,
              avatarUrl: null,
              profile: null,
              qrcode: null,
              url: null,
              themeColor: null,
              creatorType: null,
              ecosystemRole: null,
              socials: undefined,
              youtubeVideos: undefined,
            }}
            supportProfileView={unavailableSupportProfileView}
            recruitingProjects={[]}
          />
        }
      />
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--text-subtle)]">
        公開プロフィールの詳細を一時的に読み込めないため、基本情報のみ先に表示しています。
      </section>
    </div>
  );
}

export async function PublicProfilePageBodyServer({ username }: Props) {
  try {
    const {
      pageData: {
        creator,
        profile,
        projectId,
        projectIdsByCurrency,
        supportProfileView,
        recruitingProjects,
      },
      initialFeed,
      credibility,
    } = await loadPublicProfilePageReadModel(username);

    const anchorTabs = [
      { id: "support", label: "応援する", anchor: "#support-projects" },
      { id: "posts", label: "投稿", anchor: "#posts" },
      { id: "supporters", label: "支援者", anchor: "#supporters-section" },
      { id: "credibility", label: "実績", anchor: "#credibility-section" },
    ];

    return (
      <div className="space-y-4">
        <ProfileClientSection
          username={username}
          creator={creator}
          projectId={projectId}
          projectIdsByCurrency={projectIdsByCurrency}
          supportProfileView={supportProfileView}
          recruitingProjects={recruitingProjects}
          initialFeed={initialFeed}
          introContent={
            <PublicProfileIntroServer
              username={username}
              creator={creator}
              supportProfileView={supportProfileView}
              recruitingProjects={recruitingProjects}
              impactContent={
                <PublicProfileImpactNumbersInline credibility={credibility} />
              }
            />
          }
        />

        <PublicProfileAnchorNav tabs={anchorTabs} />

        <PublicProfileCreatorVoiceCard
          displayName={creator.displayName || username}
          supportProfileView={supportProfileView}
        />

        <div id="credibility-section" className="space-y-4">
          <CreatorStageCard credibility={credibility} />
          {credibility.activeMonths > 0 || credibility.totalPostCount > 0 ? (
            <CreatorActivityCredibilityBadge credibility={credibility} />
          ) : null}
        </div>

        <Suspense fallback={<DeferredSectionsFallback />}>
          <PublicProfileDeferredSectionsServer
            creatorProfileId={profile.id}
            activeSupportProject={getActiveSupportProject(supportProfileView)}
          />
        </Suspense>
      </div>
    );
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return <UnavailableBody username={username} />;
    }

    throw error;
  }
}
