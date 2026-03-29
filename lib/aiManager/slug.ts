export const AI_MANAGER_SLUG_MAX_LENGTH = 48;

function trimHyphenEdges(value: string): string {
  return value.replace(/^-+/, "").replace(/-+$/, "");
}

export function normalizeAiManagerSlug(value: string): string | null {
  const normalized = trimHyphenEdges(
    value
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, AI_MANAGER_SLUG_MAX_LENGTH)
  );

  return normalized.length > 0 ? normalized : null;
}

export function buildDefaultAiManagerSlug(username: string): string {
  const normalized = normalizeAiManagerSlug(`${username}-manager`);
  return normalized ?? "ai-manager";
}
