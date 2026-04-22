// app/api/creator/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isCreatorType,
  isEcosystemRole,
  type CreatorType,
  type EcosystemRole,
} from "@/lib/creatorTaxonomy";

import type { SocialLinks, YoutubeVideo } from "@/types/creator";
import {
  errMyPageMutationResponse,
  okMyPageMutationResponse,
} from "@/lib/mypageApiResponses";
import { requireOwnerSession } from "@/lib/ownerAuthSession";
import {
  isRecord,
  normalizeAddress,
  toOptionalString,
} from "@/lib/api/guards";
import { serializeCreatorProfile } from "@/lib/serializers/creator";
import {
  DEFAULT_PUBLIC_PAGE_CONFIG,
  resolveCreatorPublicPageConfig,
  type CreatorPublicPageConfig,
} from "@/lib/publicPageConfig";
import {
  PUBLIC_PAGE_CONFIG_SELECT_BASE,
  PUBLIC_PAGE_CONFIG_SELECT_WITH_INTRO_SECTION_ORDER,
  hasPublicPageIntroSectionOrderColumn,
  normalizePublicPageConfigRow,
} from "@/lib/publicPageConfigSchema";

export const dynamic = "force-dynamic";

/* =========================
   Types
========================= */

type ApiErr = { ok: false; error: string; detail?: string };

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

function toOptionalNullableString(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (typeof v === "string") return v;
  return undefined;
}

function jsonErr(
  error: string,
  status: number,
  detail?: string
): NextResponse<ApiErr> {
  return errMyPageMutationResponse(error, status, detail);
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

function parseCreatorTypeOrThrow(
  v: unknown
): CreatorType | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  if (typeof v !== "string" || !isCreatorType(v)) {
    throw new Error("CREATOR_TYPE_INVALID");
  }
  return v;
}

function parseEcosystemRoleOrThrow(
  v: unknown
): EcosystemRole | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  if (typeof v !== "string" || !isEcosystemRole(v)) {
    throw new Error("ECOSYSTEM_ROLE_INVALID");
  }
  return v;
}

function parseStringArrayOrThrow(
  value: unknown,
  errorCode: string
): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error(errorCode);
  }

  const output: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      throw new Error(errorCode);
    }
    output.push(item);
  }

  return output;
}

function parsePublicPageConfigOrThrow(
  value: unknown
): CreatorPublicPageConfig | undefined {
  if (value === undefined) return undefined;
  if (value === null) return DEFAULT_PUBLIC_PAGE_CONFIG;
  if (!isRecord(value)) {
    throw new Error("PUBLIC_PAGE_CONFIG_INVALID");
  }

  const heroImageUrlRaw =
    value.heroImageUrl === null ? null : toOptionalString(value.heroImageUrl);
  if (
    value.heroImageUrl !== undefined &&
    value.heroImageUrl !== null &&
    heroImageUrlRaw === undefined
  ) {
    throw new Error("PUBLIC_PAGE_HERO_IMAGE_URL_INVALID");
  }

  const backgroundColorRaw =
    value.backgroundColor === null ? null : toOptionalString(value.backgroundColor);
  if (
    value.backgroundColor !== undefined &&
    value.backgroundColor !== null &&
    backgroundColorRaw === undefined
  ) {
    throw new Error("PUBLIC_PAGE_BACKGROUND_COLOR_INVALID");
  }

  const introSectionOrder = parseStringArrayOrThrow(
    value.introSectionOrder,
    "PUBLIC_PAGE_CONFIG_INVALID"
  );
  const centerSectionOrder = parseStringArrayOrThrow(
    value.centerSectionOrder,
    "PUBLIC_PAGE_CONFIG_INVALID"
  );
  const hiddenCenterSectionKeys = parseStringArrayOrThrow(
    value.hiddenCenterSectionKeys,
    "PUBLIC_PAGE_CONFIG_INVALID"
  );
  const rightSectionOrder = parseStringArrayOrThrow(
    value.rightSectionOrder,
    "PUBLIC_PAGE_CONFIG_INVALID"
  );
  const hiddenRightSectionKeys = parseStringArrayOrThrow(
    value.hiddenRightSectionKeys,
    "PUBLIC_PAGE_CONFIG_INVALID"
  );

  const config = resolveCreatorPublicPageConfig({
    heroImageUrl: heroImageUrlRaw ?? null,
    backgroundColor: backgroundColorRaw ?? null,
    introSectionOrder,
    centerSectionOrder,
    hiddenCenterSectionKeys,
    rightSectionOrder,
    hiddenRightSectionKeys,
  });

  if (
    typeof heroImageUrlRaw === "string" &&
    heroImageUrlRaw.trim().length > 0 &&
    config.heroImageUrl === null
  ) {
    throw new Error("PUBLIC_PAGE_HERO_IMAGE_URL_INVALID");
  }

  if (
    typeof backgroundColorRaw === "string" &&
    backgroundColorRaw.trim().length > 0 &&
    config.backgroundColor === null
  ) {
    throw new Error("PUBLIC_PAGE_BACKGROUND_COLOR_INVALID");
  }

  return config;
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

export async function PATCH(req: NextRequest): Promise<NextResponse> {
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
    const ownerSession = await requireOwnerSession(req, walletAddress);
    if (!ownerSession.ok) return ownerSession.response;

    const displayName = toOptionalString(json.displayName);
    const profile = toOptionalString(json.profile);

    // null 許容（明示クリアしたい場合）: avatarUrl/externalUrl/themeColor
    const avatarUrl = toOptionalNullableString(json.avatarUrl);
    const externalUrl = toOptionalNullableString(json.externalUrl);
    const themeColor = toOptionalNullableString(json.themeColor);
    const creatorType = parseCreatorTypeOrThrow(json.creatorType);
    const ecosystemRole = parseEcosystemRoleOrThrow(json.ecosystemRole);
    const publicPage = parsePublicPageConfigOrThrow(json.publicPage);
    const canReadIntroSectionOrder = await hasPublicPageIntroSectionOrderColumn();

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

    const result = await prisma.$transaction(async (tx) => {
      const creator = await tx.creatorProfile.findUnique({
        where: { walletAddress },
      });
      if (!creator) {
        throw new Error("CREATOR_NOT_FOUND");
      }

      await tx.creatorProfile.update({
        where: { id: creator.id },
        data: {
          displayName: displayName ?? creator.displayName,
          profileText: profile ?? creator.profileText,
          avatarUrl: avatarUrl === undefined ? creator.avatarUrl : avatarUrl,
          externalUrl:
            externalUrl === undefined ? creator.externalUrl : externalUrl,
          themeColor:
            themeColor === undefined ? creator.themeColor : themeColor,
          creatorType:
            creatorType === undefined ? creator.creatorType : creatorType,
          ecosystemRole:
            ecosystemRole === undefined ? creator.ecosystemRole : ecosystemRole,
        },
      });

      if (socialsSpecified) {
        await tx.creatorSocialLink.deleteMany({
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
            url: url.trim(),
          }));

        if (socialData.length > 0) {
          await tx.creatorSocialLink.createMany({ data: socialData });
        }
      }

      if (youtubeSpecified) {
        await tx.creatorYoutubeVideo.deleteMany({
          where: { profileId: creator.id },
        });

        const videoData = (youtubeVideos ?? [])
          .filter((video) => video.url.trim().length > 0)
          .map((video) => ({
            profileId: creator.id,
            url: video.url.trim(),
            title: video.title?.trim() || null,
            description: video.description?.trim() || null,
          }));

        if (videoData.length > 0) {
          await tx.creatorYoutubeVideo.createMany({ data: videoData });
        }
      }

      if (publicPage !== undefined) {
        const publicPageCreate = {
          creatorProfileId: creator.id,
          heroImageUrl: publicPage.heroImageUrl,
          backgroundColor: publicPage.backgroundColor,
          centerSectionOrder: publicPage.centerSectionOrder,
          hiddenCenterSectionKeys: publicPage.hiddenCenterSectionKeys,
          rightSectionOrder: publicPage.rightSectionOrder,
          hiddenRightSectionKeys: publicPage.hiddenRightSectionKeys,
          ...(canReadIntroSectionOrder
            ? { introSectionOrder: publicPage.introSectionOrder }
            : {}),
        };

        const publicPageUpdate = {
          heroImageUrl: publicPage.heroImageUrl,
          backgroundColor: publicPage.backgroundColor,
          centerSectionOrder: publicPage.centerSectionOrder,
          hiddenCenterSectionKeys: publicPage.hiddenCenterSectionKeys,
          rightSectionOrder: publicPage.rightSectionOrder,
          hiddenRightSectionKeys: publicPage.hiddenRightSectionKeys,
          ...(canReadIntroSectionOrder
            ? { introSectionOrder: publicPage.introSectionOrder }
            : {}),
        };

        await tx.publicPageConfig.upsert({
          where: { creatorProfileId: creator.id },
          create: publicPageCreate,
          update: publicPageUpdate,
          select: { id: true },
        });
      }

      return tx.creatorProfile.findUnique({
        where: { id: creator.id },
        include: {
          socialLinks: true,
          youtubeVideos: true,
          publicPageConfig: {
            select: canReadIntroSectionOrder
              ? PUBLIC_PAGE_CONFIG_SELECT_WITH_INTRO_SECTION_ORDER
              : PUBLIC_PAGE_CONFIG_SELECT_BASE,
          },
        },
      });
    });

    if (!result) {
      return jsonErr("CREATOR_RELOAD_FAILED", 500);
    }

    const responseCreator = serializeCreatorProfile({
      username: result.username,
      displayName: result.displayName,
      profileText: result.profileText,
      avatarUrl: result.avatarUrl,
      qrcodeUrl: result.qrcodeUrl,
      externalUrl: result.externalUrl,
      themeColor: result.themeColor,
      creatorType: result.creatorType,
      ecosystemRole: result.ecosystemRole,
      walletAddress: result.walletAddress,
      socialLinks: result.socialLinks,
      youtubeVideos: result.youtubeVideos,
      publicPageConfig: normalizePublicPageConfigRow(result.publicPageConfig),
    });

    return okMyPageMutationResponse(walletAddress, { creator: responseCreator });
  } catch (e: unknown) {
    console.error("CREATOR_UPDATE_ERROR", e);
    if (e instanceof Error) {
      if (e.message === "CREATOR_NOT_FOUND") {
        return jsonErr("CREATOR_NOT_FOUND", 404);
      }
      if (e.message === "CREATOR_TYPE_INVALID" || e.message === "ECOSYSTEM_ROLE_INVALID") {
        return jsonErr(e.message, 400, e.message);
      }
      if (
        e.message === "PUBLIC_PAGE_CONFIG_INVALID" ||
        e.message === "PUBLIC_PAGE_HERO_IMAGE_URL_INVALID" ||
        e.message === "PUBLIC_PAGE_BACKGROUND_COLOR_INVALID"
      ) {
        return jsonErr(e.message, 400, e.message);
      }
    }
    return jsonErr(
      "CREATOR_UPDATE_FAILED",
      500,
      e instanceof Error ? e.message : String(e)
    );
  }
}
