import { notFound } from "next/navigation";

import { PublicAiManagerProfilePageBody } from "@/components/profile/PublicAiManagerProfilePageBody";
import { loadPublicAiManagerPageData } from "@/lib/aiManager/publicManagerPage";
import { isPrismaUnavailableError } from "@/lib/prismaRetry";

type Params = {
  username: string;
  slug: string;
};

const PUBLIC_SITE_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";

export const revalidate = 120;
export const preferredRegion = "syd1";
export const dynamicParams = true;

function UnavailableBody({ creatorUsername }: { creatorUsername: string }) {
  return (
    <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] px-5 py-5 text-sm leading-6 text-[var(--text-subtle)] shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
      AIマネージャーの公開紹介ページを一時的に読み込めないため、あとでもう一度試してください。
      creator の公開ページは `/{creatorUsername}` で引き続き確認できます。
    </section>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username, slug } = await params;
  const pageUrl = PUBLIC_SITE_BASE_URL
    ? new URL(
        `/${encodeURIComponent(username)}/manager/${encodeURIComponent(slug)}`,
        PUBLIC_SITE_BASE_URL
      ).toString()
    : `/${username}/manager/${slug}`;

  const pageData = await loadPublicAiManagerPageData(username, slug);
  if (!pageData) {
    return {
      title: "AI Manager | Creator Founding",
      alternates: {
        canonical: pageUrl,
      },
    };
  }

  const creatorDisplayName = pageData.creator.displayName || username;
  const title = `${pageData.aiManager.displayName} | ${creatorDisplayName} の AIマネージャー`;
  const description =
    pageData.aiManager.intro?.trim() ||
    `${creatorDisplayName} の活動を支える公開 AIマネージャーの紹介ページです。`;

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "Creator Founding",
      locale: "ja_JP",
      type: "profile",
      images: pageData.aiManager.avatarAssetUrl
        ? [{ url: pageData.aiManager.avatarAssetUrl }]
        : undefined,
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: pageData.aiManager.avatarAssetUrl
        ? [pageData.aiManager.avatarAssetUrl]
        : undefined,
    },
  };
}

export default async function AiManagerPublicProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username, slug } = await params;

  try {
    const pageData = await loadPublicAiManagerPageData(username, slug);
    if (!pageData) {
      notFound();
    }

    return (
      <PublicAiManagerProfilePageBody
        creatorUsername={username}
        creatorDisplayName={pageData.creator.displayName || username}
        creator={pageData.creator}
        aiManager={pageData.aiManager}
        activeSupportProject={pageData.activeSupportProject}
        recruitingProjects={pageData.recruitingProjects}
        credibility={pageData.credibility}
        recentSupportActivities={pageData.recentSupportActivities}
        supportActionThemes={pageData.supportActionThemes}
      />
    );
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return <UnavailableBody creatorUsername={username} />;
    }

    throw error;
  }
}
