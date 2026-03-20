// app/[username]/page.tsx

import { headers } from "next/headers";

import { getCreatorProfileByUsername } from "@/lib/creatorProfile";
import { ProfileClientSection } from "@/app/[username]/ProfileClientSection";
import { loadPublicPageData } from "@/lib/publicPageData";
import { getInitialPublicFeedListByCreatorId } from "@/lib/feedList";
import { resolveBaseUrlFromHeaders, withBaseUrl } from "@/utils/baseUrl";

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
  const publicPageDataPromise = loadPublicPageData(username);
  const initialFeedPromise = publicPageDataPromise.then((data) =>
    getInitialPublicFeedListByCreatorId(data.profile.id)
  );

  const [
    {
      creator,
      projectId,
      projectIdsByCurrency,
      supportProfileView,
      recruitingProjects,
    },
    initialFeed,
  ] = await Promise.all([
    publicPageDataPromise,
    initialFeedPromise,
  ]);

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
    </div>
  );
}
