import { isRecord } from "@/lib/api/guards";

export const PUBLIC_PAGE_CENTER_SECTION_KEYS = [
  "wallet-tip",
  "community",
  "guide",
  "reward-tiers",
  "posts",
] as const;

export const PUBLIC_PAGE_INTRO_SECTION_KEYS = [
  "support",
  "faq",
  "video",
] as const;

export const PUBLIC_PAGE_RIGHT_SECTION_KEYS = [
  "ai-manager",
  "creator-voice",
  "profile-qr",
  "creator-stage",
  "trust-profile",
  "credibility",
] as const;

export type PublicPageCenterSectionKey =
  (typeof PUBLIC_PAGE_CENTER_SECTION_KEYS)[number];

export type PublicPageIntroSectionKey =
  (typeof PUBLIC_PAGE_INTRO_SECTION_KEYS)[number];

export type PublicPageRightSectionKey =
  (typeof PUBLIC_PAGE_RIGHT_SECTION_KEYS)[number];

export type CreatorPublicPageConfig = {
  heroImageUrl: string | null;
  backgroundColor: string | null;
  introSectionOrder: PublicPageIntroSectionKey[];
  centerSectionOrder: PublicPageCenterSectionKey[];
  hiddenCenterSectionKeys: PublicPageCenterSectionKey[];
  rightSectionOrder: PublicPageRightSectionKey[];
  hiddenRightSectionKeys: PublicPageRightSectionKey[];
};

type CreatorPublicPageConfigInput = {
  heroImageUrl?: unknown;
  backgroundColor?: unknown;
  introSectionOrder?: readonly string[] | null;
  centerSectionOrder?: readonly string[] | null;
  hiddenCenterSectionKeys?: readonly string[] | null;
  rightSectionOrder?: readonly string[] | null;
  hiddenRightSectionKeys?: readonly string[] | null;
};

export const PUBLIC_PAGE_INTRO_SECTION_LABELS: Record<
  PublicPageIntroSectionKey,
  string
> = {
  support: "Support",
  faq: "FAQ",
  video: "Video",
};

export const PUBLIC_PAGE_CENTER_SECTION_LABELS: Record<
  PublicPageCenterSectionKey,
  string
> = {
  "wallet-tip": "外部ウォレットQR",
  community: "コミュニティ",
  guide: "ガイド",
  "reward-tiers": "支援メニュー",
  posts: "投稿",
};

export const PUBLIC_PAGE_RIGHT_SECTION_LABELS: Record<
  PublicPageRightSectionKey,
  string
> = {
  "ai-manager": "AIマネージャー",
  "creator-voice": "クリエイター紹介",
  "profile-qr": "プロフィールQR",
  "creator-stage": "ステージ",
  "trust-profile": "信頼プロフィール",
  credibility: "活動実績",
};

export const DEFAULT_PUBLIC_PAGE_CONFIG: CreatorPublicPageConfig = {
  heroImageUrl: null,
  backgroundColor: null,
  introSectionOrder: [...PUBLIC_PAGE_INTRO_SECTION_KEYS],
  centerSectionOrder: [...PUBLIC_PAGE_CENTER_SECTION_KEYS],
  hiddenCenterSectionKeys: [],
  rightSectionOrder: [...PUBLIC_PAGE_RIGHT_SECTION_KEYS],
  hiddenRightSectionKeys: [],
};

type CreatorPublicPageConfigRecord = {
  heroImageUrl: string | null;
  backgroundColor: string | null;
  introSectionOrder: string[];
  centerSectionOrder: string[];
  hiddenCenterSectionKeys: string[];
  rightSectionOrder: string[];
  hiddenRightSectionKeys: string[];
};

export function normalizeOptionalHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function normalizeOptionalHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  if (/^#[0-9a-f]{6}$/.test(trimmed)) {
    return trimmed;
  }

  const shortHex = trimmed.match(/^#([0-9a-f]{3})$/);
  if (!shortHex) {
    return null;
  }

  const [, color] = shortHex;
  return `#${color[0]}${color[0]}${color[1]}${color[1]}${color[2]}${color[2]}`;
}

function isPublicPageCenterSectionKey(
  value: string
): value is PublicPageCenterSectionKey {
  return (PUBLIC_PAGE_CENTER_SECTION_KEYS as readonly string[]).includes(value);
}

function isPublicPageIntroSectionKey(
  value: string
): value is PublicPageIntroSectionKey {
  return (PUBLIC_PAGE_INTRO_SECTION_KEYS as readonly string[]).includes(value);
}

function isPublicPageRightSectionKey(
  value: string
): value is PublicPageRightSectionKey {
  return (PUBLIC_PAGE_RIGHT_SECTION_KEYS as readonly string[]).includes(value);
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function uniqueKnownValues<T extends string>(
  values: readonly string[],
  isAllowed: (value: string) => value is T
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const value of values) {
    if (!isAllowed(value) || seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }

  return result;
}

function normalizeSectionOrder<T extends string>(args: {
  values: readonly string[];
  defaults: readonly T[];
  isAllowed: (value: string) => value is T;
}): T[] {
  const ordered = uniqueKnownValues(args.values, args.isAllowed);

  for (const fallback of args.defaults) {
    if (!ordered.includes(fallback)) {
      ordered.push(fallback);
    }
  }

  return ordered;
}

function normalizeHiddenSectionKeys<T extends string>(args: {
  values: readonly string[];
  isAllowed: (value: string) => value is T;
}): T[] {
  return uniqueKnownValues(args.values, args.isAllowed);
}

export function resolveCreatorPublicPageConfig(
  input?: CreatorPublicPageConfigInput | null
): CreatorPublicPageConfig {
  const introSectionOrder = normalizeSectionOrder({
    values: input?.introSectionOrder ?? [],
    defaults: PUBLIC_PAGE_INTRO_SECTION_KEYS,
    isAllowed: isPublicPageIntroSectionKey,
  });
  const centerSectionOrder = normalizeSectionOrder({
    values: input?.centerSectionOrder ?? [],
    defaults: PUBLIC_PAGE_CENTER_SECTION_KEYS,
    isAllowed: isPublicPageCenterSectionKey,
  });
  const hiddenCenterSectionKeys = normalizeHiddenSectionKeys({
    values: input?.hiddenCenterSectionKeys ?? [],
    isAllowed: isPublicPageCenterSectionKey,
  });
  const rightSectionOrder = normalizeSectionOrder({
    values: input?.rightSectionOrder ?? [],
    defaults: PUBLIC_PAGE_RIGHT_SECTION_KEYS,
    isAllowed: isPublicPageRightSectionKey,
  });
  const hiddenRightSectionKeys = normalizeHiddenSectionKeys({
    values: input?.hiddenRightSectionKeys ?? [],
    isAllowed: isPublicPageRightSectionKey,
  });

  return {
    heroImageUrl:
      normalizeOptionalHttpUrl(input?.heroImageUrl) ??
      DEFAULT_PUBLIC_PAGE_CONFIG.heroImageUrl,
    backgroundColor:
      normalizeOptionalHexColor(input?.backgroundColor) ??
      DEFAULT_PUBLIC_PAGE_CONFIG.backgroundColor,
    introSectionOrder,
    centerSectionOrder,
    hiddenCenterSectionKeys,
    rightSectionOrder,
    hiddenRightSectionKeys,
  };
}

export function serializeCreatorPublicPageConfig(
  record: CreatorPublicPageConfigRecord | null | undefined
): CreatorPublicPageConfig | null {
  if (!record) return null;

  return resolveCreatorPublicPageConfig({
    heroImageUrl: record.heroImageUrl,
    backgroundColor: record.backgroundColor,
    introSectionOrder: record.introSectionOrder,
    centerSectionOrder: record.centerSectionOrder,
    hiddenCenterSectionKeys: record.hiddenCenterSectionKeys,
    rightSectionOrder: record.rightSectionOrder,
    hiddenRightSectionKeys: record.hiddenRightSectionKeys,
  });
}

export function parseCreatorPublicPageConfig(
  raw: unknown
): CreatorPublicPageConfig | null {
  if (!isRecord(raw)) return null;

  return resolveCreatorPublicPageConfig({
    heroImageUrl: raw.heroImageUrl,
    backgroundColor: raw.backgroundColor,
    introSectionOrder: toStringArray(raw.introSectionOrder),
    centerSectionOrder: toStringArray(raw.centerSectionOrder),
    hiddenCenterSectionKeys: toStringArray(raw.hiddenCenterSectionKeys),
    rightSectionOrder: toStringArray(raw.rightSectionOrder),
    hiddenRightSectionKeys: toStringArray(raw.hiddenRightSectionKeys),
  });
}

export function orderConfiguredPublicPageSections<T extends string>(args: {
  availableKeys: readonly T[];
  configuredOrder: readonly T[];
  hiddenKeys: readonly T[];
}): T[] {
  const availableSet = new Set(args.availableKeys);
  const hiddenSet = new Set(args.hiddenKeys);
  const ordered: T[] = [];

  for (const key of args.configuredOrder) {
    if (!availableSet.has(key) || hiddenSet.has(key) || ordered.includes(key)) {
      continue;
    }
    ordered.push(key);
  }

  for (const key of args.availableKeys) {
    if (!hiddenSet.has(key) && !ordered.includes(key)) {
      ordered.push(key);
    }
  }

  return ordered;
}
