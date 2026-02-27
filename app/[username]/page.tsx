// app/[username]/page.tsx

import { notFound } from "next/navigation";
import { getCreatorProfileByUsername } from "@/lib/creatorProfile";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";
import { ProfileSummaryServer } from "@/components/profile/ProfileSummaryServer";
import { MyPageFooter } from "@/components/MyPageFooter";
import { ProfileClientSection } from "@/app/[username]/ProfileClientSection";

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

  // 2) projectId を Prisma から取得（初回表示を優先して read-only で解決）
  let projectId: string | null = null;
  let projectIdsByCurrency: { JPYC: string | null; USDC: string | null } = {
    JPYC: null,
    USDC: null,
  };

  try {
    projectIdsByCurrency = {
      JPYC: profile.activeProjectIdJpyc ?? null,
      USDC: profile.activeProjectIdUsdc ?? null,
    };

    if (!projectIdsByCurrency.JPYC || !projectIdsByCurrency.USDC) {
      const profileId = BigInt(profile.id);
      const owner = profile.walletAddress?.toLowerCase() ?? null;
      const projectWhereOr: Array<
        { creatorProfileId: bigint } | { ownerAddress: string }
      > = [{ creatorProfileId: profileId }];
      if (owner) projectWhereOr.push({ ownerAddress: owner });

      const [latestJpyc, latestUsdc] = await Promise.all([
        !projectIdsByCurrency.JPYC
          ? withPrismaRetry(() =>
              prisma.project.findFirst({
                where: { OR: projectWhereOr, currency: "JPYC" },
                select: { id: true },
                orderBy: { createdAt: "desc" },
              })
            )
          : Promise.resolve(null),
        !projectIdsByCurrency.USDC
          ? withPrismaRetry(() =>
              prisma.project.findFirst({
                where: { OR: projectWhereOr, currency: "USDC" },
                select: { id: true },
                orderBy: { createdAt: "desc" },
              })
            )
          : Promise.resolve(null),
      ]);

      if (!projectIdsByCurrency.JPYC) {
        projectIdsByCurrency.JPYC = latestJpyc?.id?.toString() ?? null;
      }
      if (!projectIdsByCurrency.USDC) {
        projectIdsByCurrency.USDC = latestUsdc?.id?.toString() ?? null;
      }
    }

    projectId =
      profile.activeProjectId ??
      projectIdsByCurrency.JPYC ??
      projectIdsByCurrency.USDC ??
      null;
  } catch (e) {
    console.error("Failed to resolve projectId:", e);
    projectId = null;
    projectIdsByCurrency = { JPYC: null, USDC: null };
  }

  return (
    <div className="container-narrow py-8 force-light-theme">
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <ProfileSummaryServer
          username={username}
          creator={creator}
          headerColor={creator.themeColor || "#005bbb"}
        />
        <div className="px-4">
          <ProfileClientSection
            username={username}
            creator={creator}
            projectId={projectId}
            projectIdsByCurrency={projectIdsByCurrency}
          />
        </div>
      </div>
      <MyPageFooter />
    </div>
  );
}
