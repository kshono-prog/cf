import {
  isRecord,
  toOptionalString,
} from "@/lib/api/guards";

export type ShareDraftProgressInput = {
  progressPct: number | null;
  confirmedAmount: number | null;
  targetAmount: number | null;
  currency: string | null;
};

export type ShareDraftInput = {
  displayName: string;
  username: string;
  profile: string | null;
  goalTitle: string | null;
  projectTitle: string | null;
  projectDescription: string | null;
  publicPageUrl: string;
  progress: ShareDraftProgressInput | null;
};

export type ShareDraftResult = {
  xShort: string;
  xLong: string;
  instagramCaption: string;
  storyShort: string;
  simpleEnglish: string;
  launchMessage: string;
  progressUpdateMessage: string;
};

function parseProgress(value: unknown): ShareDraftProgressInput | null {
  if (!isRecord(value)) {
    return null;
  }

  const progressPct =
    typeof value.progressPct === "number" && Number.isFinite(value.progressPct)
      ? value.progressPct
      : null;
  const confirmedAmount =
    typeof value.confirmedAmount === "number" &&
    Number.isFinite(value.confirmedAmount)
      ? value.confirmedAmount
      : null;
  const targetAmount =
    typeof value.targetAmount === "number" && Number.isFinite(value.targetAmount)
      ? value.targetAmount
      : null;
  const currency = toOptionalString(value.currency) ?? null;

  return {
    progressPct,
    confirmedAmount,
    targetAmount,
    currency,
  };
}

function progressLine(progress: ShareDraftProgressInput | null): string {
  if (!progress) {
    return "公開ページを整えて、最初の支援につなげたいです。";
  }

  if (
    progress.progressPct !== null &&
    progress.confirmedAmount !== null &&
    progress.targetAmount !== null &&
    progress.currency
  ) {
    return `現在は ${Math.round(progress.progressPct)}%（${progress.confirmedAmount.toLocaleString("ja-JP")} / ${progress.targetAmount.toLocaleString("ja-JP")} ${progress.currency}）です。`;
  }

  return "公開ページを整えて、最初の支援につなげたいです。";
}

export function parseShareDraftInput(value: unknown): ShareDraftInput | null {
  if (!isRecord(value)) {
    return null;
  }

  const displayName = toOptionalString(value.displayName);
  const username = toOptionalString(value.username);
  const publicPageUrl = toOptionalString(value.publicPageUrl);

  if (!displayName || !username || !publicPageUrl) {
    return null;
  }

  return {
    displayName,
    username,
    profile: toOptionalString(value.profile) ?? null,
    goalTitle: toOptionalString(value.goalTitle) ?? null,
    projectTitle: toOptionalString(value.projectTitle) ?? null,
    projectDescription: toOptionalString(value.projectDescription) ?? null,
    publicPageUrl,
    progress: parseProgress(value.progress),
  };
}

export function parseShareDraftResult(value: unknown): ShareDraftResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const xShort = toOptionalString(value.xShort);
  const xLong = toOptionalString(value.xLong);
  const instagramCaption = toOptionalString(value.instagramCaption);
  const storyShort = toOptionalString(value.storyShort);
  const simpleEnglish = toOptionalString(value.simpleEnglish);
  const launchMessage = toOptionalString(value.launchMessage);
  const progressUpdateMessage = toOptionalString(value.progressUpdateMessage);

  if (
    !xShort ||
    !xLong ||
    !instagramCaption ||
    !storyShort ||
    !simpleEnglish ||
    !launchMessage ||
    !progressUpdateMessage
  ) {
    return null;
  }

  return {
    xShort,
    xLong,
    instagramCaption,
    storyShort,
    simpleEnglish,
    launchMessage,
    progressUpdateMessage,
  };
}

export function buildFallbackShareDraft(
  input: ShareDraftInput
): ShareDraftResult {
  const projectLabel = input.projectTitle ?? input.goalTitle ?? `${input.displayName}の公開ページ`;
  const profileLine =
    input.profile?.trim() && input.profile.trim().length > 0
      ? input.profile.trim()
      : `${input.displayName}の活動を公開ページでまとめています。`;
  const progressSummary = progressLine(input.progress);
  const urlLine = input.publicPageUrl;

  return {
    xShort: `${input.displayName}の公開ページを整えました。${projectLabel}を応援してもらえるとうれしいです。 ${urlLine}`,
    xLong: `${input.displayName}の公開ページを公開しました。${profileLine} いまは「${projectLabel}」を前に進めるための支援を集めています。${progressSummary} よかったらページを見てもらえるとうれしいです。 ${urlLine}`,
    instagramCaption: `${input.displayName}の公開ページを整えました。\n\n${profileLine}\n\nいまは「${projectLabel}」を前に進めるための支援を集めています。\n${progressSummary}\n\nプロフィールのリンクから見てもらえたらうれしいです。\n${urlLine}`,
    storyShort: `${input.displayName}の公開ページを公開しました。見てもらえたらうれしいです。 ${urlLine}`,
    simpleEnglish: `I published my creator page. It shares what I do and what I am building next. If you want to take a look, here is the page: ${urlLine}`,
    launchMessage: `${input.displayName}の公開ページを公開しました。まずはここから活動や支援の受け皿を育てていきます。 ${urlLine}`,
    progressUpdateMessage: `${input.displayName}の進捗共有です。${progressSummary} 公開ページはこちらです。 ${urlLine}`,
  };
}
