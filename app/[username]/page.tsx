// app/[username]/page.tsx

import { getCreatorProfileByUsername } from "@/lib/creatorProfile";
import { ProfileClientSection } from "@/app/[username]/ProfileClientSection";
import { loadPublicPageData } from "@/lib/publicPageData";
import { getInitialPublicFeedList } from "@/lib/feedList";

type Params = { username: string };

const SITE_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://nagesen-v2.vercel.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;
  const creator =
    (await getCreatorProfileByUsername(username))?.creator ?? null;

  const pageUrl = `${SITE_BASE_URL}/${username}`;
  const displayName = creator?.displayName || username;

  const description =
    creator?.profile ||
    `${displayName} さんの投稿や活動を見ながら、自然に応援できるページです。`;

  const rawImage = creator?.avatarUrl || "/icon/nagesen250.png";
  const imageUrl =
    rawImage && rawImage.startsWith("http")
      ? rawImage
      : `${SITE_BASE_URL}${rawImage}`;

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
  const [
    { creator, projectId, projectIdsByCurrency, publicSummary, supportProfileView },
    initialFeed,
  ] =
    await Promise.all([
      loadPublicPageData(username, { includePublicSummary: true }),
      getInitialPublicFeedList(username),
    ]);

  return (
    <div className="space-y-4">
      <ProfileClientSection
        username={username}
        creator={creator}
        projectId={projectId}
        projectIdsByCurrency={projectIdsByCurrency}
        publicSummary={publicSummary}
        supportProfileView={supportProfileView}
        initialFeed={initialFeed}
      />
    </div>
  );
}
