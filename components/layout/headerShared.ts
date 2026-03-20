import { isRecord } from "@/lib/api/guards";
import type { CreatorProfile } from "@/types/creator";
import { parseCreatorProfile } from "@/lib/serializers/creator";

export type HeaderViewerUser = {
  username: string;
  displayName: string;
  profile: string | null;
};

export type HeaderViewerState = {
  hasUser: boolean;
  hasCreator: boolean;
  user: HeaderViewerUser | null;
  creator: CreatorProfile | null;
};

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseUser(value: unknown): HeaderViewerUser | null {
  if (value === null) return null;
  if (!isRecord(value)) return null;

  const username = toStringOrNull(value.username);
  const displayName = toStringOrNull(value.displayName);
  const profile = value.profile === null ? null : toStringOrNull(value.profile);

  if (!username || !displayName || profile === undefined) {
    return null;
  }

  return {
    username,
    displayName,
    profile,
  };
}

export function parseHeaderViewerState(value: unknown): HeaderViewerState | null {
  if (!isRecord(value) || value.ok !== true) return null;

  const hasUser = value.hasUser === true;
  const hasCreator = value.hasCreator === true;

  return {
    hasUser,
    hasCreator,
    user: parseUser(value.user),
    creator: parseCreatorProfile(value.creator),
  };
}

export function getAvatarInitials(value: string): string {
  const normalized = value.trim();
  if (!normalized) return "?";

  const parts = normalized.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  const joined = `${first}${second}`.trim();

  return joined ? joined.toUpperCase() : normalized.slice(0, 1).toUpperCase();
}
