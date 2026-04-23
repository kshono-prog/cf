import { isRecord } from "@/lib/mypage/helpers";

export function parseJsonObjectOrArray(text: string): unknown | null {
  try {
    const value: unknown = JSON.parse(text);
    if (Array.isArray(value)) {
      return value;
    }
    if (isRecord(value)) {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

export function parseTxHashesText(text: string): string[] | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[")) {
    try {
      const value: unknown = JSON.parse(trimmed);
      if (!Array.isArray(value)) {
        return null;
      }

      const hashes: string[] = [];
      for (const item of value) {
        if (typeof item !== "string") {
          return null;
        }
        const normalized = item.trim();
        if (!normalized) {
          return null;
        }
        hashes.push(normalized);
      }
      return hashes;
    } catch {
      return null;
    }
  }

  return trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function safeJsonStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return null;
  }
}
