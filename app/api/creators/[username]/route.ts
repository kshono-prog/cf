/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, context: any) {
  const { username } = context.params as { username: string };

  const profile = await prisma.creatorProfile.findUnique({
    where: { username },
    include: {
      // user: true,  // ← これはもう削除済みで OK
      socialLinks: true,
      youtubeVideos: true,
    },
  });

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
    profileText: profile.profileText,
    avatar: profile.avatarUrl,
    qrcode: profile.qrcodeUrl,
    url: profile.externalUrl,
    goalTitle: profile.goalTitle,
    goalTargetJpyc: profile.goalTargetJpyc,
    themeColor: profile.themeColor,
    address: profile.walletAddress, // CreatorProfile に統合したアドレス
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
