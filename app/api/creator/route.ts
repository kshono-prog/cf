// app/api/creator/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import type {
  CreatorProfile,
  SocialLinks,
  YoutubeVideo,
} from "@/types/creator";

export const dynamic = "force-dynamic";

/* =========================
   Types
========================= */

type ApiOk = { ok: true; creator: CreatorProfile };
type ApiErr = { ok: false; error: string; detail?: string };
type ApiRes = ApiOk | ApiErr;

/* =========================
   Constants
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

/* =========================
   Guards / helpers (no any)
========================= */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toOptionalString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function toOptionalNullableString(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (typeof v === "string") return v;
  return undefined;
}

function toOptionalUnknownArray(v: unknown): unknown[] | undefined {
  return Array.isArray(v) ? v : undefined;
}

function jsonErr(
  error: string,
  status: number,
  detail?: string
): NextResponse<ApiErr> {
  return NextResponse.json({ ok: false, error, detail }, { status });
}

function normalizeAddress(raw: string): string {
  return raw.toLowerCase().trim();
}

/**
 * socials: Partial<Record<AllowedSocialType, string>>
 * - object 以外ならエラー
 * - 値は string のみ許容（空文字は捨てる）
 * - key は allowedSocialTypes のみ
 */
function parseSocialsOrThrow(v: unknown): SocialLinks {
  if (v === undefined) return {};
  if (!isRecord(v)) throw new Error("SOCIALS_INVALID");

  const out: SocialLinks = {};
  for (const [k, val] of Object.entries(v)) {
    if (!isAllowedSocialType(k)) continue;
    if (typeof val !== "string") throw new Error("SOCIALS_INVALID");
    const s = val.trim();
    if (!s) continue;
    out[k] = s;
  }
  return out;
}

/**
 * youtubeVideos: {url,title,description}[]
 * - array 以外ならエラー
 * - url は string 必須（空は捨てる）
 * - title/description は string なら採用、空は "" で返す（フロント型に合わせる）
 */
function parseYoutubeVideosOrThrow(v: unknown): YoutubeVideo[] {
  if (v === undefined) return [];
  if (!Array.isArray(v)) throw new Error("YOUTUBE_VIDEOS_INVALID");

  const out: YoutubeVideo[] = [];

  for (const item of v) {
    if (!isRecord(item)) throw new Error("YOUTUBE_VIDEOS_INVALID");
    const url = toOptionalString(item.url)?.trim();
    if (!url) continue;

    const title = toOptionalString(item.title)?.trim() ?? "";
    const description = toOptionalString(item.description)?.trim() ?? "";

    out.push({ url, title, description });
  }

  return out;
}

/**
 * 旧Goal拒否（UIから外しているのに、APIが受けてしまうと混乱するため）
 */
function assertNoLegacyGoalFields(body: Record<string, unknown>): void {
  if ("goalTitle" in body || "goalTargetJpyc" in body) {
    throw new Error("LEGACY_GOAL_FIELD_NOT_ALLOWED");
  }
}

/* =========================
   PATCH /api/creator
========================= */

export async function PATCH(req: NextRequest): Promise<NextResponse<ApiRes>> {
  try {
    const json: unknown = await req.json().catch(() => null);
    if (!isRecord(json)) {
      return jsonErr("INVALID_JSON", 400);
    }

    // 旧Goalフィールドが来たら拒否
    try {
      assertNoLegacyGoalFields(json);
    } catch (e: unknown) {
      return jsonErr(
        "LEGACY_GOAL_FIELD_NOT_ALLOWED",
        400,
        e instanceof Error ? e.message : undefined
      );
    }

    const rawAddress = toOptionalString(json.address);
    if (!rawAddress) return jsonErr("ADDRESS_REQUIRED", 400);

    const walletAddress = normalizeAddress(rawAddress);

    const displayName = toOptionalString(json.displayName);
    const profile = toOptionalString(json.profile);

    // null 許容（明示クリアしたい場合）: avatarUrl/themeColor
    const avatarUrl = toOptionalNullableString(json.avatarUrl);
    const themeColor = toOptionalNullableString(json.themeColor);

    // “指定された場合のみ全入れ替え” を維持するため、
    // socials/youtubeVideos は undefined と “空オブジェクト/空配列” を区別する
    const socialsRaw = json.socials;
    const youtubeRaw = json.youtubeVideos;

    const socialsSpecified = "socials" in json;
    const youtubeSpecified = "youtubeVideos" in json;

    let socials: SocialLinks | undefined = undefined;
    let youtubeVideos: YoutubeVideo[] | undefined = undefined;

    if (socialsSpecified) {
      socials = parseSocialsOrThrow(socialsRaw);
    }
    if (youtubeSpecified) {
      youtubeVideos = parseYoutubeVideosOrThrow(youtubeRaw);
    }

    // ① CreatorProfile を取得
    const creator = await prisma.creatorProfile.findUnique({
      where: { walletAddress },
    });
    if (!creator) {
      return jsonErr("CREATOR_NOT_FOUND", 404);
    }

    // ② CreatorProfile 本体更新
    await prisma.creatorProfile.update({
      where: { id: creator.id },
      data: {
        displayName: displayName ?? creator.displayName,
        profileText: profile ?? creator.profileText,
        avatarUrl: avatarUrl === undefined ? creator.avatarUrl : avatarUrl,
        themeColor: themeColor === undefined ? creator.themeColor : themeColor,
      },
    });

    // ③ socials（指定された場合のみ全入れ替え）
    if (socialsSpecified) {
      await prisma.creatorSocialLink.deleteMany({
        where: { profileId: creator.id },
      });

      const socialData = Object.entries(socials ?? {})
        .filter(([type, url]) => {
          if (!url || !url.trim()) return false;
          if (!isAllowedSocialType(type)) return false;
          return true;
        })
        .map(([type, url]) => ({
          profileId: creator.id,
          type,
          label: null as string | null,
          url: url!.trim(),
        }));

      if (socialData.length > 0) {
        await prisma.creatorSocialLink.createMany({ data: socialData });
      }
    }

    // ④ youtubeVideos（指定された場合のみ全入れ替え）
    if (youtubeSpecified) {
      await prisma.creatorYoutubeVideo.deleteMany({
        where: { profileId: creator.id },
      });

      const videoData =
        (youtubeVideos ?? [])
          .filter((v) => v.url && v.url.trim())
          .map((v) => ({
            profileId: creator.id,
            url: v.url.trim(),
            title: v.title?.trim() || null,
            description: v.description?.trim() || null,
          })) ?? [];

      if (videoData.length > 0) {
        await prisma.creatorYoutubeVideo.createMany({ data: videoData });
      }
    }

    // ⑤ 返却用に再取得（関連含む）
    const result = await prisma.creatorProfile.findUnique({
      where: { id: creator.id },
      include: { socialLinks: true, youtubeVideos: true },
    });

    if (!result) {
      return jsonErr("CREATOR_RELOAD_FAILED", 500);
    }

    // socials を整形
    const socialsResult: SocialLinks = {};
    for (const link of result.socialLinks) {
      if (isAllowedSocialType(link.type) && link.url) {
        socialsResult[link.type] = link.url;
      }
    }

    // youtubeVideos を整形
    const youtubeResult: YoutubeVideo[] = result.youtubeVideos.map((v) => ({
      url: v.url,
      title: v.title ?? "",
      description: v.description ?? "",
    }));

    const responseCreator: CreatorProfile = {
      username: result.username,
      address: result.walletAddress ?? undefined,
      displayName: result.displayName,
      avatarUrl: result.avatarUrl,
      profile: result.profileText,
      qrcode: result.qrcodeUrl,
      url: result.externalUrl,
      themeColor: result.themeColor,
      socials: socialsResult,
      youtubeVideos: youtubeResult,
    };

    return NextResponse.json({ ok: true, creator: responseCreator });
  } catch (e: unknown) {
    console.error("CREATOR_UPDATE_ERROR", e);
    return jsonErr(
      "CREATOR_UPDATE_FAILED",
      500,
      e instanceof Error ? e.message : String(e)
    );
  }
}
