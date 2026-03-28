// app/[username]/page.tsx

import { Suspense } from "react";

import { ProfileClientSection } from "@/app/[username]/ProfileClientSection";
import { PublicProfileIntroServer } from "@/components/profile/PublicProfileIntroServer";
import { PublicProfilePageBodyServer } from "@/components/profile/PublicProfilePageBodyServer";
import { loadPublicProfileMetadataSeed } from "@/lib/publicProfileMetadata";
import { prisma } from "@/lib/prisma";
import { isPrismaUnavailableError, withPrismaRetry } from "@/lib/prismaRetry";
import type { SupportProfileView } from "@/lib/supportProfileView";

type Params = { username: string };

export const revalidate = 120;
export const preferredRegion = "syd1";
export const dynamicParams = true;
const PUBLIC_SITE_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";

function buildFallbackSupportProfileView(profile: string | null | undefined): SupportProfileView {
  if (profile && profile.trim().length > 0) {
    return {
      mode: "draft",
      activeCurrency: null,
      activeProjectId: null,
      projectsByCurrency: { JPYC: null, USDC: null },
      draft: {
        title: null,
        description: profile,
      },
    };
  }

  return {
    mode: "unavailable",
    activeCurrency: null,
    activeProjectId: null,
    projectsByCurrency: { JPYC: null, USDC: null },
    draft: null,
  };
}

function PublicProfilePageFallback({
  username,
}: {
  username: string;
}) {
  const fallbackCreator = {
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
  };

  return (
    <div className="space-y-4">
      <ProfileClientSection
        username={username}
        creator={fallbackCreator}
        projectId={null}
        projectIdsByCurrency={{ JPYC: null, USDC: null }}
        supportProfileView={buildFallbackSupportProfileView(fallbackCreator.profile)}
        recruitingProjects={[]}
        initialFeed={null}
        introContent={
          <PublicProfileIntroServer
            username={username}
            creator={fallbackCreator}
            supportProfileView={buildFallbackSupportProfileView(
              fallbackCreator.profile
            )}
            recruitingProjects={[]}
          />
        }
      />
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--text-subtle)]">
        公開ページの詳細を準備しています…
      </section>
    </div>
  );
}

export async function generateStaticParams(): Promise<Params[]> {
  try {
    const rows = await withPrismaRetry(() =>
      prisma.creatorProfile.findMany({
        where: {
          username: {
            not: "",
          },
        },
        select: { username: true },
        orderBy: { updatedAt: "desc" },
      })
    );

    return rows.map((row) => ({ username: row.username }));
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return [];
    }

    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;
  const metadataSeed = await loadPublicProfileMetadataSeed(
    username,
    PUBLIC_SITE_BASE_URL
  );

  return {
    title: metadataSeed.title,
    description: metadataSeed.description,
    applicationName: metadataSeed.displayName,
    appleWebApp: {
      title: metadataSeed.displayName,
    },
    manifest: metadataSeed.manifestPath,
    icons: {
      icon: [{ url: metadataSeed.imageUrl }],
      apple: [{ url: metadataSeed.imageUrl }],
    },
    openGraph: {
      title: metadataSeed.title,
      description: metadataSeed.description,
      url: metadataSeed.pageUrl,
      type: "website",
      images: [{ url: metadataSeed.imageUrl }],
    },
    twitter: {
      card: "summary",
      title: metadataSeed.title,
      description: metadataSeed.description,
      images: [metadataSeed.imageUrl],
    },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { username } = await params;

  return (
    <Suspense
      fallback={
        <PublicProfilePageFallback username={username} />
      }
    >
      <PublicProfilePageBodyServer username={username} />
    </Suspense>
  );
}
