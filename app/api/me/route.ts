// app/api/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  CreatorProfile,
  SocialLinks,
  YoutubeVideo,
} from "@/types/creator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================
   Types (no any)
========================= */

type MeOk = {
  ok: true;
  hasUser: boolean;
  hasCreator: boolean;
  user: { displayName: string; profile: string | null } | null;
  creator: CreatorProfile | null;
  projectId: string | null;
};

type MeErr = { ok: false; error: string; detail?: string };

type MeRes = MeOk | MeErr;

/* =========================
   Social types
========================= */

const allowedSocialTypes = [
  "twitter",
  "instagram",
  "youtube",
  "facebook",
  "tiktok",
  "website",
] as const;

type AllowedSocialType = (typeof allowedSocialTypes)[number];

function isAllowedSocialType(value: string): value is AllowedSocialType {
  return (allowedSocialTypes as readonly string[]).includes(value);
}

function normalizeAddress(input: string): string {
  return input.trim().toLowerCase();
}

function okEmpty(): NextResponse<MeOk> {
  return NextResponse.json({
    ok: true,
    hasUser: false,
    hasCreator: false,
    user: null,
    creator: null,
    projectId: null,
  });
}

function errJson(
  error: string,
  status: number,
  detail?: string
): NextResponse<MeErr> {
  return NextResponse.json({ ok: false, error, detail }, { status });
}

/* =========================
   GET /api/me?address=0x...
========================= */

export async function GET(req: NextRequest): Promise<NextResponse<MeRes>> {
  const { searchParams } = new URL(req.url);
  const addressRaw = searchParams.get("address");

  // “未接続”はエラーにしない（UI側が扱いやすい）
  if (!addressRaw) return okEmpty();

  const walletAddress = normalizeAddress(addressRaw);
  if (!walletAddress) return okEmpty();

  try {
    const profile = await prisma.creatorProfile.findUnique({
      where: { walletAddress },
      select: {
        id: true,
        username: true,
        displayName: true,
        profileText: true,
        avatarUrl: true,
        qrcodeUrl: true,
        externalUrl: true,
        themeColor: true,
        walletAddress: true,
        activeProjectId: true,
        status: true,
      },
    });

    if (!profile) return okEmpty();

    const hasCreator = profile.status === "PUBLISHED";

    const [socialRows, youtubeRows] = await Promise.all([
      prisma.creatorSocialLink.findMany({
        where: { profileId: profile.id },
        select: { type: true, url: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.creatorYoutubeVideo.findMany({
        where: { profileId: profile.id },
        select: { url: true, title: true, description: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const socialsResult: SocialLinks = {};
    for (const row of socialRows) {
      if (isAllowedSocialType(row.type) && row.url) {
        socialsResult[row.type] = row.url;
      }
    }

    const youtubeResult: YoutubeVideo[] = youtubeRows.map((v) => ({
      url: v.url,
      title: v.title ?? "",
      description: v.description ?? "",
    }));

    const creator: CreatorProfile = {
      username: profile.username,
      address: profile.walletAddress ?? undefined,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      profile: profile.profileText,
      qrcode: profile.qrcodeUrl,
      url: profile.externalUrl,
      themeColor: profile.themeColor,
      socials: socialsResult,
      youtubeVideos: youtubeResult,
    };

    return NextResponse.json({
      ok: true,
      hasUser: true,
      hasCreator,
      user: {
        displayName: profile.displayName,
        profile: profile.profileText,
      },
      // hasCreator=false のときは creator を null にする（現行UIロジックに合わせる）
      creator: hasCreator ? creator : null,
      projectId: profile.activeProjectId
        ? profile.activeProjectId.toString()
        : null,
    });
  } catch (e: unknown) {
    console.error("ME_PRISMA_ERROR", e);
    return errJson(
      "ME_PRISMA_ERROR",
      500,
      e instanceof Error ? e.message : String(e)
    );
  }
}
