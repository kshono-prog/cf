export type LanguageCode = "ja" | "en" | "ko" | "zh";

export const ALLOWED_LANGS: readonly LanguageCode[] = [
  "ja",
  "en",
  "ko",
  "zh",
] as const;

export type TranslationTaskInput = {
  text: string;
  from: LanguageCode | "auto";
  to: LanguageCode[];
};

export function toLanguageCode(v: unknown): LanguageCode | null {
  if (typeof v !== "string") return null;
  return ALLOWED_LANGS.includes(v as LanguageCode) ? (v as LanguageCode) : null;
}

export function parseTranslationTaskInput(v: unknown): TranslationTaskInput | null {
  if (typeof v !== "object" || v === null) return null;
  const r = v as Record<string, unknown>;

  if (typeof r.text !== "string") return null;
  const text = r.text.trim();
  if (!text || text.length > 2000) return null;

  const fromRaw = r.from;
  const from =
    fromRaw === "auto"
      ? "auto"
      : toLanguageCode(fromRaw);
  if (!from) return null;

  if (!Array.isArray(r.to)) return null;
  const to: LanguageCode[] = [];
  for (const item of r.to) {
    const lang = toLanguageCode(item);
    if (!lang) return null;
    if (!to.includes(lang)) to.push(lang);
  }
  if (to.length === 0) return null;

  return { text, from, to };
}

export function translateStub(
  text: string,
  from: LanguageCode | "auto",
  to: LanguageCode
): string {
  if (to === "ja") return `【ja/${from}】${text}`;
  if (to === "en") return `[en/${from}] ${text}`;
  if (to === "ko") return `【ko/${from}】${text}`;
  return `【zh/${from}】${text}`;
}

export function buildTranslationsOutput(input: TranslationTaskInput) {
  return input.to.map((lang) => ({
    lang,
    text: translateStub(input.text, input.from, lang),
  }));
}
