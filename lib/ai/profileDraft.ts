import {
  isRecord,
  toOptionalString,
} from "@/lib/api/guards";
import type { SocialLinks, YoutubeVideo } from "@/types/creator";

const SOCIAL_KEYS = [
  "twitter",
  "instagram",
  "youtube",
  "facebook",
  "tiktok",
  "website",
] as const;

export type ProfileDraftInput = {
  username: string | null;
  freeText: string;
  existingDisplayName: string | null;
  existingProfile: string | null;
  existingGoalTitle: string | null;
  existingSocials: SocialLinks;
  existingYoutubeVideos: YoutubeVideo[];
};

export type ProfileDraftResult = {
  displayName: string;
  profile: string;
  goalTitle: string;
  suggestedProjectTitle: string;
  suggestedProjectDescription: string;
  suggestedGoalTargetJpyc: number;
  suggestedThemeColor: string;
  suggestedSocialLinksNotes: string[];
  warnings: string[];
};

function parseSocialLinks(value: unknown): SocialLinks {
  if (!isRecord(value)) {
    return {};
  }

  const next: SocialLinks = {};

  for (const key of SOCIAL_KEYS) {
    const entry = toOptionalString(value[key]);
    if (entry) {
      next[key] = entry;
    }
  }

  return next;
}

function parseYoutubeVideos(value: unknown): YoutubeVideo[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const videos: YoutubeVideo[] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }

    const url = toOptionalString(item.url);
    if (!url) {
      continue;
    }

    videos.push({
      url,
      title: toOptionalString(item.title) ?? "",
      description: toOptionalString(item.description) ?? "",
    });
  }

  return videos;
}

function parseStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const items = value
    .map((entry) => toOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry));

  return items;
}

function extractActivityLabel(input: ProfileDraftInput): string {
  const firstLine =
    input.freeText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? "";

  if (firstLine.length > 0) {
    return firstLine.slice(0, 48);
  }

  return "創作活動";
}

function inferThemeColor(input: ProfileDraftInput): string {
  const text = input.freeText.toLowerCase();

  if (text.includes("音楽") || text.includes("ライブ") || text.includes("band")) {
    return "#1d4ed8";
  }

  if (text.includes("写真") || text.includes("映像") || text.includes("film")) {
    return "#0f766e";
  }

  if (text.includes("イラスト") || text.includes("art") || text.includes("design")) {
    return "#c2410c";
  }

  return "#2563eb";
}

function inferConservativeGoalTarget(input: ProfileDraftInput): number {
  const text = input.freeText.toLowerCase();

  if (
    text.includes("mv") ||
    text.includes("レコーディング") ||
    text.includes("展示") ||
    text.includes("撮影")
  ) {
    return 100000;
  }

  if (
    text.includes("イベント") ||
    text.includes("ライブ") ||
    text.includes("遠征") ||
    text.includes("制作")
  ) {
    return 50000;
  }

  return 30000;
}

export function parseProfileDraftInput(value: unknown): ProfileDraftInput | null {
  if (!isRecord(value)) {
    return null;
  }

  const freeText = toOptionalString(value.freeText);
  if (!freeText) {
    return null;
  }

  return {
    username: toOptionalString(value.username) ?? null,
    freeText,
    existingDisplayName: toOptionalString(value.existingDisplayName) ?? null,
    existingProfile: toOptionalString(value.existingProfile) ?? null,
    existingGoalTitle: toOptionalString(value.existingGoalTitle) ?? null,
    existingSocials: parseSocialLinks(value.existingSocials),
    existingYoutubeVideos: parseYoutubeVideos(value.existingYoutubeVideos),
  };
}

export function parseProfileDraftResult(
  value: unknown
): ProfileDraftResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const displayName = toOptionalString(value.displayName);
  const profile = toOptionalString(value.profile);
  const goalTitle = toOptionalString(value.goalTitle);
  const suggestedProjectTitle = toOptionalString(value.suggestedProjectTitle);
  const suggestedProjectDescription = toOptionalString(
    value.suggestedProjectDescription
  );
  const suggestedThemeColor = toOptionalString(value.suggestedThemeColor);
  const suggestedSocialLinksNotes = parseStringArray(
    value.suggestedSocialLinksNotes
  );
  const warnings = parseStringArray(value.warnings);
  const suggestedGoalTargetJpyc =
    typeof value.suggestedGoalTargetJpyc === "number" &&
    Number.isFinite(value.suggestedGoalTargetJpyc) &&
    value.suggestedGoalTargetJpyc > 0
      ? Math.round(value.suggestedGoalTargetJpyc)
      : null;

  if (
    !displayName ||
    !profile ||
    !goalTitle ||
    !suggestedProjectTitle ||
    !suggestedProjectDescription ||
    !suggestedThemeColor ||
    !suggestedSocialLinksNotes ||
    !warnings ||
    !suggestedGoalTargetJpyc
  ) {
    return null;
  }

  return {
    displayName,
    profile,
    goalTitle,
    suggestedProjectTitle,
    suggestedProjectDescription,
    suggestedGoalTargetJpyc,
    suggestedThemeColor,
    suggestedSocialLinksNotes,
    warnings,
  };
}

export function buildFallbackProfileDraft(
  input: ProfileDraftInput
): ProfileDraftResult {
  const baseName =
    input.existingDisplayName ??
    (input.username ? input.username.replace(/[-_]/g, " ") : null) ??
    "あなたの活動名";
  const activityLabel = extractActivityLabel(input);
  const goalTarget = inferConservativeGoalTarget(input);
  const hasSocialLink = Object.values(input.existingSocials).some(Boolean);

  const warnings: string[] = [];
  if (!hasSocialLink) {
    warnings.push("公開後に SNS か Web リンクを 1 つ入れると、継続フォローにつながりやすくなります。");
  }
  if (input.existingYoutubeVideos.length === 0) {
    warnings.push("紹介動画がある場合は後から追加すると、初見の人にも活動が伝わりやすくなります。");
  }

  return {
    displayName: baseName,
    profile:
      input.existingProfile ??
      `${baseName}は${activityLabel}を中心に活動しています。公開ページでは、いま取り組んでいることや支援で前に進めたい内容を分かりやすく伝えていきます。`,
    goalTitle:
      input.existingGoalTitle ?? `${baseName}の最初の公開ページを育てる`,
    suggestedProjectTitle: `${baseName}の活動を広げる最初の Project`,
    suggestedProjectDescription: `${activityLabel}を継続して届けるために、公開ページを整えながら最初の支援を集めるための project です。支援は制作準備、発信、必要な機材や移動費の一部に充てる想定です。`,
    suggestedGoalTargetJpyc: goalTarget,
    suggestedThemeColor: inferThemeColor(input),
    suggestedSocialLinksNotes: hasSocialLink
      ? ["既存の SNS リンクはそのまま活かしつつ、更新頻度の高いリンクを先頭に置くのがおすすめです。"]
      : [
          "まずは X / Instagram / Web のうち 1 つでも公開すると、ページ外で活動を追いやすくなります。",
        ],
    warnings,
  };
}
