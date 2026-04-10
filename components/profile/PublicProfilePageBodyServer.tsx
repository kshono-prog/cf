import { Suspense } from "react";

import { AiManagerSupportActionCard } from "@/components/profile/AiManagerSupportActionCard";
import { ProfileClientSection } from "@/app/[username]/ProfileClientSection";
import { CreatorActivityCredibilityBadge } from "@/components/profile/CreatorActivityCredibilityBadge";
import { PublicTrustProfileSection } from "@/components/profile/PublicTrustProfileSection";
import { PublicProfileAiManagerCard } from "@/components/profile/PublicProfileAiManagerCard";
import { CreatorStageCard } from "@/components/profile/CreatorStageCard";
import { PublicProfileAnchorNav } from "@/components/profile/PublicProfileAnchorNav";
import { PublicProfileCreatorVoiceCard } from "@/components/profile/PublicProfileCreatorVoiceCard";
import { PublicProfileDeferredSectionsServer } from "@/components/profile/PublicProfileDeferredSectionsServer";
import { PublicProfileIntroServer } from "@/components/profile/PublicProfileIntroServer";
import { PublicProfileImpactNumbersInline } from "@/components/profile/PublicProfileImpactNumbers";
import { PublicProfilePageSidebar } from "@/components/profile/PublicProfilePageSidebar";
import { loadPublicProfilePageReadModel } from "@/lib/publicProfilePageReadModel";
import { isPrismaUnavailableError } from "@/lib/prismaRetry";
import { deriveCreatorStage } from "@/lib/creatorStage";
import { serializeJsonLd } from "@/lib/seo/jsonLd";
import { buildPublicProfileStructuredData } from "@/lib/seo/publicProfileStructuredData";
import { getActiveSupportProject } from "@/lib/supportProfileView";
import type { SupportProfileView } from "@/lib/supportProfileView";

type Props = {
  username: string;
};

const PUBLIC_SITE_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";

function DeferredSectionsFallback() {
  return (
    <>
      <div id="supporters-section" className="space-y-4">
        <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--text-subtle)]">
          支援者情報を読み込んでいます…
        </section>
      </div>
      <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--text-subtle)]">
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
    <div className="space-y-4 px-3 sm:px-6">
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
      <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--text-subtle)]">
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
        publicAiManager,
        recentSupportActivities = [],
        supportActionThemes = [],
        supportProfileView,
        recruitingProjects = [],
      },
      initialFeed,
      credibility,
    } = await loadPublicProfilePageReadModel(username);
    const stageResult =
      credibility.totalPostCount > 0 || credibility.activeMonths > 0
        ? deriveCreatorStage(credibility)
        : null;
    const structuredData = buildPublicProfileStructuredData({
      baseUrl: PUBLIC_SITE_BASE_URL,
      username,
      creator,
      supportProfileView,
      recruitingProjectCount: recruitingProjects.length,
      credibility,
    });

    const activeSupportProject = getActiveSupportProject(supportProfileView);
    const supportHref = activeSupportProject
      ? `/${username}?projectId=${encodeURIComponent(activeSupportProject.projectId)}&support=1#support-projects`
      : null;
    const displayName = creator.displayName || username;

    const anchorTabs = [
      { id: "support", label: "応援へ", anchor: "#support-projects" },
      ...(publicAiManager
        ? [{ id: "ai-manager", label: "運営AI", anchor: "#ai-manager-section" }]
        : []),
      { id: "posts", label: "投稿", anchor: "#posts" },
      { id: "supporters", label: "支援者", anchor: "#supporters-section" },
      { id: "credibility", label: "実績", anchor: "#credibility-section" },
    ];

    const impactNumbers = <PublicProfileImpactNumbersInline credibility={credibility} />;

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
        />

        {/* X 風 3 カラムレイアウト */}
        <div className="workspace-layout workspace-layout-balanced">

          {/* 左サイドバー — profile-sidebar CSS クラスで md+ 表示 */}
          <aside className="profile-sidebar">
            <PublicProfilePageSidebar
              username={username}
              creatorWalletAddress={creator.address ?? null}
              themeColor={creator.themeColor ?? null}
              supportHref={supportHref}
              currentPage="profile"
              anchorTabs={anchorTabs}
            />
          </aside>

          {/* 中央フィード */}
          <main className="workspace-feed">
            {/* モバイル: ヘッダー分のスペーサー（AppHeader は PublicPageShell が固定表示） */}
            {/* アンカーナビ — モバイル・タブレット (md 未満) のみ */}
            <div className="md:hidden">
              <PublicProfileAnchorNav tabs={anchorTabs} />
            </div>

            <div className="px-3 py-4 sm:px-6">
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
                    stageBadge={stageResult?.stageLabel ?? null}
                    impactContent={impactNumbers}
                  />
                }
              />
            </div>
          </main>

          {/* 右パネル */}
          <aside className="workspace-right">
            <div className="flex flex-col gap-4">
              {publicAiManager ? (
                <>
                  <PublicProfileAiManagerCard
                    creatorUsername={username}
                    creatorDisplayName={displayName}
                    aiManager={publicAiManager}
                  />
                  <AiManagerSupportActionCard
                    creatorUsername={username}
                    aiManagerDisplayName={publicAiManager.displayName}
                    themes={supportActionThemes}
                    recentSupportActivities={recentSupportActivities}
                    fallbackProjectId={
                      activeSupportProject?.projectId ??
                      recruitingProjects[0]?.projectId ??
                      null
                    }
                  />
                </>
              ) : null}

              <PublicProfileCreatorVoiceCard
                displayName={displayName}
                supportProfileView={supportProfileView}
                ecosystemRole={creator.ecosystemRole ?? null}
              />

              <div id="credibility-section" className="flex flex-col gap-4">
                <CreatorStageCard credibility={credibility} />
                {credibility.activeMonths > 0 || credibility.totalPostCount > 0 ? (
                  <CreatorActivityCredibilityBadge credibility={credibility} />
                ) : null}
                <PublicTrustProfileSection
                  displayName={displayName}
                  username={username}
                  externalUrl={creator.url ?? null}
                  activityMonths={credibility.activeMonths}
                  contributionCount={credibility.totalContributorCount}
                  stageLabel={stageResult?.stageLabel ?? null}
                />
              </div>

              <Suspense fallback={<DeferredSectionsFallback />}>
                <PublicProfileDeferredSectionsServer
                  creatorProfileId={profile.id}
                  activeSupportProject={activeSupportProject}
                />
              </Suspense>
            </div>
          </aside>
        </div>
      </>
    );
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return <UnavailableBody username={username} />;
    }

    throw error;
  }
}
