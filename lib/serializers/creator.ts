import { isRecord, toOptionalString } from "@/lib/api/guards";
import { isCreatorType } from "@/lib/creatorTaxonomy";
import {
  resolveConfirmedAmount,
  resolveGoalTargetAmount,
} from "@/lib/fundingAmounts";
import type { SummaryViewData } from "@/lib/mypage/accountPageTypes";
import type { CurrencyCode } from "@/lib/currencyUtils";
import type { CreatorProfile, SocialLinks, YoutubeVideo } from "@/types/creator";

export type CreatorProjectIdsByCurrency = {
  JPYC: string | null;
  USDC: string | null;
};

export type CreatorLatestProjectSummary = {
  projectId: string;
  title: string;
  currency: CurrencyCode;
  targetAmount: number | null;
  confirmedAmount: number;
  progressPct: number;
  achievedAt: string | null;
};

export type CreatorPublicDto = CreatorProfile & {
  projectId: string | null;
  projectIdsByCurrency: CreatorProjectIdsByCurrency;
  latestProjectSummary: CreatorLatestProjectSummary | null;
};

type CreatorProjectSelectionArgs = {
  activeProjectIdJpyc: string | null;
  activeProjectIdUsdc: string | null;
};

const SOCIAL_KEYS = [
  "twitter",
  "instagram",
  "youtube",
  "facebook",
  "tiktok",
  "website",
] as const;

type CreatorSocialLinkRow = {
  type: string;
  url: string | null;
};

type CreatorYoutubeVideoRow = {
  url: string;
  title: string | null;
  description: string | null;
};

type CreatorProfileDbShape = {
  username: string;
  displayName: string | null;
  profileText: string | null;
  avatarUrl: string | null;
  qrcodeUrl: string | null;
  externalUrl: string | null;
  themeColor: string | null;
  creatorType: string | null;
  walletAddress: string | null;
  socialLinks?: CreatorSocialLinkRow[];
  youtubeVideos?: CreatorYoutubeVideoRow[];
};

function toNullOrString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toNullOrNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toSocialLinks(value: unknown): SocialLinks | undefined {
  if (!isRecord(value)) return undefined;

  const socials: SocialLinks = {};
  for (const key of SOCIAL_KEYS) {
    const nextValue = value[key];
    if (typeof nextValue === "string" && nextValue.length > 0) {
      socials[key] = nextValue;
    }
  }

  return socials;
}

function toYoutubeVideos(value: unknown): YoutubeVideo[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const videos: YoutubeVideo[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;

    const url = toOptionalString(item.url);
    const title = toNullOrString(item.title) ?? "";
    const description = toNullOrString(item.description) ?? "";
    if (!url) continue;

    videos.push({ url, title, description });
  }

  return videos;
}

function serializeSocialLinks(
  rows: CreatorSocialLinkRow[] | undefined
): SocialLinks | undefined {
  if (!rows || rows.length === 0) return undefined;

  const socials: SocialLinks = {};
  for (const row of rows) {
    if (
      SOCIAL_KEYS.includes(row.type as (typeof SOCIAL_KEYS)[number]) &&
      typeof row.url === "string" &&
      row.url.length > 0
    ) {
      socials[row.type as keyof SocialLinks] = row.url;
    }
  }

  return socials;
}

function serializeYoutubeVideos(
  rows: CreatorYoutubeVideoRow[] | undefined
): YoutubeVideo[] | undefined {
  if (!rows || rows.length === 0) return undefined;

  return rows.map((row) => ({
    url: row.url,
    title: row.title ?? "",
    description: row.description ?? "",
  }));
}

function parseLatestProjectSummary(
  value: unknown
): CreatorLatestProjectSummary | null {
  if (!isRecord(value)) return null;

  const projectId = toOptionalString(value.projectId);
  const title = toOptionalString(value.title);
  const currency = value.currency;
  const targetAmount = toNullOrNumber(value.targetAmount);
  const confirmedAmount = toNullOrNumber(value.confirmedAmount);
  const progressPct = toNullOrNumber(value.progressPct);
  const achievedAt =
    value.achievedAt === null ? null : toNullOrString(value.achievedAt);

  if (!projectId || !title) return null;
  if (currency !== "JPYC" && currency !== "USDC") return null;
  if (confirmedAmount == null || progressPct == null || achievedAt === undefined) {
    return null;
  }

  return {
    projectId,
    title,
    currency,
    targetAmount,
    confirmedAmount,
    progressPct,
    achievedAt,
  };
}

export function resolveCreatorProjectSelection(
  args: CreatorProjectSelectionArgs
): {
  projectId: string | null;
  projectIdsByCurrency: CreatorProjectIdsByCurrency;
} {
  const projectIdsByCurrency: CreatorProjectIdsByCurrency = {
    JPYC: args.activeProjectIdJpyc ?? null,
    USDC: args.activeProjectIdUsdc ?? null,
  };

  return {
    projectId: projectIdsByCurrency.JPYC ?? projectIdsByCurrency.USDC ?? null,
    projectIdsByCurrency,
  };
}

export function serializeCreatorLatestProjectSummary(
  summary: SummaryViewData | null
): CreatorLatestProjectSummary | null {
  if (!summary) return null;
  if (summary.project.currency !== "JPYC" && summary.project.currency !== "USDC") {
    return null;
  }

  const targetAmount = resolveGoalTargetAmount(summary.goal);
  const confirmedAmount = resolveConfirmedAmount(summary.progress);
  const progressPct =
    typeof summary.progress.progressPct === "number" &&
    Number.isFinite(summary.progress.progressPct)
      ? summary.progress.progressPct
      : 0;

  return {
    projectId: summary.project.id,
    title: summary.project.title,
    currency: summary.project.currency,
    targetAmount,
    confirmedAmount,
    progressPct,
    achievedAt: summary.goal?.achievedAt ?? null,
  };
}

export function serializeCreatorPublicDto(args: {
  creator: CreatorProfile;
  projectId: string | null;
  projectIdsByCurrency: CreatorProjectIdsByCurrency;
  latestProjectSummary?: CreatorLatestProjectSummary | null;
}): CreatorPublicDto {
  return {
    ...args.creator,
    projectId: args.projectId,
    projectIdsByCurrency: args.projectIdsByCurrency,
    latestProjectSummary: args.latestProjectSummary ?? null,
  };
}

export function serializeCreatorProfile(
  record: CreatorProfileDbShape
): CreatorProfile {
  return {
    username: record.username,
    address: record.walletAddress ?? undefined,
    displayName: record.displayName ?? record.username,
    avatarUrl: record.avatarUrl ?? null,
    profile: record.profileText ?? null,
    qrcode: record.qrcodeUrl ?? null,
    url: record.externalUrl ?? null,
    themeColor: record.themeColor ?? null,
    creatorType:
      typeof record.creatorType === "string" && isCreatorType(record.creatorType)
        ? record.creatorType
        : null,
    socials: serializeSocialLinks(record.socialLinks),
    youtubeVideos: serializeYoutubeVideos(record.youtubeVideos),
  };
}

export function parseCreatorProfile(raw: unknown): CreatorProfile | null {
  if (!isRecord(raw)) return null;

  const username = toOptionalString(raw.username);
  const displayName = toOptionalString(raw.displayName);
  const profile = raw.profile === null ? null : toNullOrString(raw.profile);
  const avatarUrl = raw.avatarUrl === null ? null : toNullOrString(raw.avatarUrl);
  const qrcode = raw.qrcode === null ? null : toNullOrString(raw.qrcode);
  const url = raw.url === null ? null : toNullOrString(raw.url);
  const themeColor =
    raw.themeColor === null ? null : toNullOrString(raw.themeColor);
  const creatorTypeRaw = toNullOrString(raw.creatorType);

  if (!username || !displayName) return null;

  return {
    username,
    address: toNullOrString(raw.address) ?? undefined,
    displayName,
    profile,
    avatarUrl,
    qrcode,
    url,
    themeColor,
    creatorType:
      creatorTypeRaw && isCreatorType(creatorTypeRaw) ? creatorTypeRaw : null,
    socials: toSocialLinks(raw.socials),
    youtubeVideos: toYoutubeVideos(raw.youtubeVideos),
  };
}

export function parseCreatorPublicDto(raw: unknown): CreatorPublicDto {
  if (!isRecord(raw)) throw new Error("CREATOR_INVALID");
  const creator = parseCreatorProfile(raw);
  if (!creator) throw new Error("CREATOR_INVALID");

  const projectIdsByCurrencyRaw = isRecord(raw.projectIdsByCurrency)
    ? raw.projectIdsByCurrency
    : {};
  const latestProjectSummary = parseLatestProjectSummary(raw.latestProjectSummary);

  return {
    ...creator,
    projectId: raw.projectId === null ? null : toNullOrString(raw.projectId),
    projectIdsByCurrency: {
      JPYC:
        projectIdsByCurrencyRaw.JPYC === null
          ? null
          : toNullOrString(projectIdsByCurrencyRaw.JPYC),
      USDC:
        projectIdsByCurrencyRaw.USDC === null
          ? null
          : toNullOrString(projectIdsByCurrencyRaw.USDC),
    },
    latestProjectSummary,
  };
}
