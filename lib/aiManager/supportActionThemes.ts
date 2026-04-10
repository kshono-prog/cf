import { buildProfileDeepLink } from "@/lib/deepLink";

type SupportActionCurrency = "JPYC" | "USDC";

export type PublicSupportActionPurposeSource = {
  id: string;
  label: string;
  description: string | null;
};

export type PublicSupportActionProjectSource = {
  projectId: string;
  title: string;
  currency: SupportActionCurrency;
  purposes: PublicSupportActionPurposeSource[];
};

export type PublicSupportActionTheme = {
  id: string;
  projectId: string;
  projectTitle: string;
  purposeId: string;
  currency: SupportActionCurrency;
  title: string;
  helper: string;
  href: string;
};

function normalizeCopy(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}

function ensureSentence(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "creator の次の一歩を前に進めるための応援です。";
  }

  if (/[。.!！?？]$/.test(trimmed)) {
    return trimmed;
  }

  return `${trimmed}。`;
}

function clampCopy(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function inferRuleBasedHelper(label: string): string {
  if (/(制作|創作|作品|楽曲|執筆|撮影|編集|収録|配信準備|機材)/.test(label)) {
    return "制作を続けるための準備や整理につながる応援です。";
  }

  if (/(発信|告知|広報|投稿|配信|SNS|共有|レポート)/i.test(label)) {
    return "次の発信や近況共有につながる応援です。";
  }

  if (/(イベント|現場|出演|遠征|ライブ|会場|展示|出展)/.test(label)) {
    return "イベント準備や現場対応を前に進めるための応援です。";
  }

  if (/(ファン|コミュニティ|交流|お礼|お返し|特典|関係)/.test(label)) {
    return "ファンとの関係づくりや参加体験につながる応援です。";
  }

  return "creator の次の一歩を前に進めるための応援です。";
}

function buildThemeHelper(purpose: PublicSupportActionPurposeSource): string {
  const description = normalizeCopy(purpose.description);
  if (description) {
    return ensureSentence(clampCopy(description, 84));
  }

  return inferRuleBasedHelper(purpose.label);
}

function buildThemeHref(args: {
  username: string;
  projectId: string;
  purposeId: string;
}): string {
  return `${buildProfileDeepLink(args.username, {
    projectId: args.projectId,
    purposeId: args.purposeId,
    support: "1",
  })}#support-projects`;
}

export function buildGenericSupportHref(args: {
  username: string;
  projectId?: string | null;
}): string {
  const path = args.projectId
    ? buildProfileDeepLink(args.username, {
        projectId: args.projectId,
        support: "1",
      })
    : `/${encodeURIComponent(args.username)}`;

  return `${path}#support-projects`;
}

export function buildPublicSupportActionThemes(args: {
  username: string;
  projects: PublicSupportActionProjectSource[];
  maxItems?: number;
}): PublicSupportActionTheme[] {
  const maxItems = args.maxItems ?? 3;
  const themes: PublicSupportActionTheme[] = [];

  for (const project of args.projects) {
    for (const purpose of project.purposes) {
      themes.push({
        id: `${project.projectId}:${purpose.id}`,
        projectId: project.projectId,
        projectTitle: project.title,
        purposeId: purpose.id,
        currency: project.currency,
        title: purpose.label,
        helper: buildThemeHelper(purpose),
        href: buildThemeHref({
          username: args.username,
          projectId: project.projectId,
          purposeId: purpose.id,
        }),
      });

      if (themes.length >= maxItems) {
        return themes;
      }
    }
  }

  return themes;
}
