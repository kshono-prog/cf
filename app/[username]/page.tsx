// app/[username]/page.tsx

import { Suspense } from "react";

import { PublicProfilePageBodyServer } from "@/components/profile/PublicProfilePageBodyServer";
import { PublicProfilePageLoadingShell } from "@/components/profile/PublicProfilePageLoadingShell";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { loadPublicProfileMetadataSeed } from "@/lib/publicProfileMetadata";
import { prisma } from "@/lib/prisma";
import { isPrismaUnavailableError, withPrismaRetry } from "@/lib/prismaRetry";

type Params = { username: string };

export const revalidate = 120;
export const preferredRegion = "syd1";
export const dynamicParams = true;
const PUBLIC_SITE_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";

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
    alternates: {
      canonical: metadataSeed.pageUrl,
    },
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
      siteName: "Creator Founding",
      locale: "ja_JP",
      type: "profile",
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

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { username } = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <PublicPageShell username={username} fullBleed hideDesktopHeader>
      <Suspense fallback={<PublicProfilePageLoadingShell username={username} />}>
        <PublicProfilePageBodyServer
          username={username}
          e2eMockScenario={resolvedSearchParams}
        />
      </Suspense>
    </PublicPageShell>
  );
}
