// app/[username]/page.tsx

import ProfileClient from "@/components/ProfileClient";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cache } from "react";

type Params = { username: string };

// ---- 型定義 ----
const SOCIAL_KEYS = [
  "twitter",
  "instagram",
  "youtube",
  "facebook",
  "tiktok",
  "website",
] as const;

type SocialKey = (typeof SOCIAL_KEYS)[number];

type SocialLinks = Partial<Record<SocialKey, string>>;

function isSocialKey(v: string): v is SocialKey {
  return (SOCIAL_KEYS as readonly string[]).includes(v);
}

type YoutubeVideo = {
  url: string;
  title: string;
  description: string;
};

export type CreatorProfile = {
  username: string;
  address?: string;
  displayName?: string;
  avatarUrl?: string | null;
  profile?: string | null;
  qrcode?: string | null;
  url?: string | null;
  goalTitle?: string | null;
  goalTargetJpyc?: number | null;
  themeColor?: string | null;
  socials?: SocialLinks;
  youtubeVideos?: YoutubeVideo[];
};

function normalizeCreator(raw: {
  username: string;
  displayName: string | null;
  profileText: string | null;
  avatarUrl: string | null;
  qrcodeUrl: string | null;
  externalUrl: string | null;
  goalTitle: string | null;
  goalTargetJpyc: number | null;
  themeColor: string | null;
  walletAddress: string | null;
  socials?: SocialLinks;
  youtubeVideos?: YoutubeVideo[];
}): CreatorProfile {
  return {
    username: raw.username,
    address: raw.walletAddress ?? undefined,
    displayName: raw.displayName ?? raw.username,
    avatarUrl: raw.avatarUrl ?? null,
    profile: raw.profileText ?? null,
    qrcode: raw.qrcodeUrl ?? null,
    url: raw.externalUrl ?? null,
    goalTitle: raw.goalTitle ?? null,
    goalTargetJpyc: raw.goalTargetJpyc ?? null,
    themeColor: raw.themeColor ?? null,
    socials: raw.socials,
    youtubeVideos: raw.youtubeVideos,
  };
}

const SITE_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://nagesen-v2.vercel.app";

const getCreatorProfileByUsername = cache(async (username: string) => {
  const profile = await prisma.creatorProfile.findUnique({
    where: { username },
    include: {
      socialLinks: true,
      youtubeVideos: true,
    },
  });

  if (!profile) return null;

  // ---- socials を型安全に詰める（TS7053対策）----
  const socials: SocialLinks = {};
  for (const link of profile.socialLinks) {
    // Prisma 側で string になっていてもここで絞り込む
    if (isSocialKey(link.type)) {
      socials[link.type] = link.url;
    }
  }

  return {
    profile,
    creator: normalizeCreator({
      username: profile.username,
      displayName: profile.displayName,
      profileText: profile.profileText,
      avatarUrl: profile.avatarUrl,
      qrcodeUrl: profile.qrcodeUrl,
      externalUrl: profile.externalUrl,
      goalTitle: profile.goalTitle,
      goalTargetJpyc: profile.goalTargetJpyc,
      themeColor: profile.themeColor,
      walletAddress: profile.walletAddress,
      socials,
      // ---- null を正規化して YoutubeVideo[] に合わせる（TS2322対策）----
      youtubeVideos: profile.youtubeVideos.map((v) => ({
        url: v.url,
        title: v.title ?? "",
        description: v.description ?? "",
      })),
    }),
  };
});

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
    `${displayName} さんを JPYC で応援できる投げ銭ページです。`;

  const rawImage = creator?.avatarUrl || "/icon/nagesen250.png";
  const imageUrl =
    rawImage && rawImage.startsWith("http")
      ? rawImage
      : `${SITE_BASE_URL}${rawImage}`;

  const title = `${displayName} さんへの JPYC投げ銭`;

  return {
    title,
    description,
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

  // 1) クリエイタープロフィール（表示用）
  const creatorResult = await getCreatorProfileByUsername(username);
  if (!creatorResult) notFound();

  const { creator, profile } = creatorResult;

  // 2) projectId を Prisma から取得（既存ロジックそのまま）
  let projectId: string | null = null;

  try {
    if (profile.activeProjectId != null) {
      projectId = profile.activeProjectId.toString();
    } else {
      const projByCreator = await prisma.project.findFirst({
        where: { creatorProfileId: profile.id },
        select: { id: true },
        orderBy: { createdAt: "desc" },
      });

      if (projByCreator?.id != null) {
        projectId = projByCreator.id.toString();
      } else {
        const owner = profile.walletAddress?.toLowerCase() ?? null;

        if (owner) {
          const projByOwner = await prisma.project.findFirst({
            where: { ownerAddress: owner },
            select: { id: true },
            orderBy: { createdAt: "desc" },
          });

          if (projByOwner?.id != null) {
            projectId = projByOwner.id.toString();

            await prisma.$transaction([
              prisma.project.update({
                where: { id: projByOwner.id },
                data: { creatorProfileId: profile.id },
              }),
              prisma.creatorProfile.update({
                where: { id: profile.id },
                data: { activeProjectId: projByOwner.id },
              }),
            ]);
          }
        }
      }
    }
  } catch (e) {
    console.error("Failed to resolve projectId:", e);
    projectId = null;
  }

  return (
    <ProfileClient
      username={username}
      creator={creator}
      projectId={projectId}
    />
  );
}
