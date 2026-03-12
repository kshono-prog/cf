import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";

type CreatorRouteContext = {
  params: Promise<{ username: string }>;
};

export async function GET(
  _req: NextRequest,
  context: CreatorRouteContext
): Promise<NextResponse> {
  const { username } = await context.params;

  const profile = await withPrismaRetry(() =>
    prisma.creatorProfile.findUnique({
      where: { username },
      include: {
        // user: true,  // ← これはもう削除済みで OK
        socialLinks: true,
        youtubeVideos: true,
      },
    })
  );

  if (!profile) {
    return NextResponse.json({ error: "CREATOR_NOT_FOUND" }, { status: 404 });
  }

  // socials を { TWITTER: "url", ... } 形式に整形
  const socials: Record<string, string> = {};
  for (const link of profile.socialLinks) {
    socials[link.type] = link.url;
  }

  return NextResponse.json({
    username: profile.username,
    displayName: profile.displayName,
    profile: profile.profileText,
    profileText: profile.profileText,
    avatarUrl: profile.avatarUrl,
    avatar: profile.avatarUrl,
    qrcode: profile.qrcodeUrl,
    url: profile.externalUrl,
    goalTitle: profile.goalTitle,
    goalTargetJpyc: profile.goalTargetJpyc,
    themeColor: profile.themeColor,
    creatorType: profile.creatorType,
    address: profile.walletAddress, // CreatorProfile に統合したアドレス
    projectId: profile.activeProjectId ? profile.activeProjectId.toString() : null,
    projectIdsByCurrency: {
      JPYC: profile.activeProjectIdJpyc
        ? profile.activeProjectIdJpyc.toString()
        : null,
      USDC: profile.activeProjectIdUsdc
        ? profile.activeProjectIdUsdc.toString()
        : null,
    },
    socials,
    youtubeVideos: profile.youtubeVideos.map((v) => ({
      url: v.url,
      title: v.title,
      description: v.description,
    })),
  });
}

// キャッシュ戦略は必要なら
export const dynamic = "force-dynamic";
