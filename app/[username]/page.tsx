// app/[username]/page.tsx

import ProfileClient from "@/components/ProfileClient";
import { notFound } from "next/navigation";
import { getCreatorProfileByUsername } from "@/lib/creatorProfile";
import { prisma } from "@/lib/prisma";

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
