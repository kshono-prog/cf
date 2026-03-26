// app/[username]/page.tsx

import { headers } from "next/headers";

import { getCreatorProfileByUsername } from "@/lib/creatorProfile";
import { ProfileClientSection } from "@/app/[username]/ProfileClientSection";
import { loadPublicPageData } from "@/lib/publicPageData";
import { getInitialPublicFeedListByCreatorId } from "@/lib/feedList";
import { resolveBaseUrlFromHeaders, withBaseUrl } from "@/utils/baseUrl";
import { getCreatorActivityCredibility } from "@/lib/creatorActivityCredibility";
import { CreatorActivityCredibilityBadge } from "@/components/profile/CreatorActivityCredibilityBadge";
import { CreatorStageCard } from "@/components/profile/CreatorStageCard";
import { getAllGoalAchievementImpacts } from "@/lib/goalAchievementImpact";
import { GoalAchievementImpactSection } from "@/components/profile/GoalAchievementImpactCard";
import { getLatestSupporterResultReportSummary } from "@/lib/supporterResultReportSummary";

type Params = { username: string };

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;
  const requestHeaders = await headers();
  const siteBaseUrl = resolveBaseUrlFromHeaders(requestHeaders);
  const creator =
    (await getCreatorProfileByUsername(username))?.creator ?? null;

  const pageUrl = withBaseUrl(username, siteBaseUrl);
  const displayName = creator?.displayName || username;

  const description =
    creator?.profile ||
    `${displayName} さんの投稿や活動を見ながら、自然に応援できるページです。`;

  const rawImage = creator?.avatarUrl || "/icon/nagesen250.png";
  const imageUrl =
    rawImage && rawImage.startsWith("http")
      ? rawImage
      : withBaseUrl(rawImage, siteBaseUrl);

  const title = `${displayName} のプロフィール`;

  return {
    title,
    description,
    applicationName: displayName,
    appleWebApp: {
      title: displayName,
    },
    manifest: `/${username}/manifest.webmanifest`,
    icons: {
      icon: [{ url: imageUrl }],
      apple: [{ url: imageUrl }],
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "website",
      images: [{ url: imageUrl }],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { username } = await params;

  // Sequential awaits to avoid exhausting the single Prisma connection pool.
  // Each function uses unstable_cache (120s), so DB is only hit on cold starts.
  const { creator, projectId, projectIdsByCurrency, supportProfileView, recruitingProjects, profile } =
    await loadPublicPageData(username);
  const initialFeed = await getInitialPublicFeedListByCreatorId(profile.id);
  const credibility = await getCreatorActivityCredibility(BigInt(profile.id));
  const impacts = await getAllGoalAchievementImpacts(BigInt(profile.id));
  const reportSummary = await getLatestSupporterResultReportSummary(BigInt(profile.id));

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
      />
      {credibility.activeMonths > 0 || credibility.totalPostCount > 0 ? (
        <CreatorActivityCredibilityBadge credibility={credibility} />
      ) : null}
      <CreatorStageCard credibility={credibility} />
      {reportSummary ? (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            支援者へのご報告
          </div>
          <p className="text-sm text-[var(--text)] leading-relaxed">
            {reportSummary.summary}
          </p>
        </section>
      ) : null}
      <GoalAchievementImpactSection impacts={impacts} />
    </div>
  );
}
