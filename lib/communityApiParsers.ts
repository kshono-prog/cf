function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export type FollowPreview = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type FollowSummary = {
  creator: FollowPreview;
  counts: {
    followers: number;
    following: number;
  };
  viewer: {
    hasUser: boolean;
    isOwner: boolean;
    follows: boolean;
  };
  followers: FollowPreview[];
};

export type NotificationKind = "REPLY" | "LIKE" | "SUPPORT" | "NOTICE";

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  createdAt: string;
  href: string;
  title: string;
  body: string;
  actor:
    | {
        username: string;
        displayName: string;
        avatarUrl: string | null;
      }
    | null;
  meta: string | null;
};

function parseFollowPreview(value: unknown): FollowPreview | null {
  if (!isRecord(value)) return null;

  const id = toStringOrNull(value.id);
  const username = toStringOrNull(value.username);
  const displayName = toStringOrNull(value.displayName);
  const avatarUrl =
    value.avatarUrl === null ? null : toStringOrNull(value.avatarUrl);

  if (!id || !username || !displayName || avatarUrl === undefined) return null;

  return {
    id,
    username,
    displayName,
    avatarUrl,
  };
}

export function parseFollowSummaryResponse(value: unknown): FollowSummary {
  if (
    !isRecord(value) ||
    value.ok !== true ||
    !isRecord(value.counts) ||
    !isRecord(value.viewer) ||
    !Array.isArray(value.followers)
  ) {
    throw new Error("FOLLOW_SUMMARY_INVALID");
  }

  const creator = parseFollowPreview(value.creator);
  const followers = toNumberOrNull(value.counts.followers);
  const following = toNumberOrNull(value.counts.following);
  if (!creator || followers === null || following === null) {
    throw new Error("FOLLOW_SUMMARY_INVALID");
  }

  return {
    creator,
    counts: {
      followers,
      following,
    },
    viewer: {
      hasUser: value.viewer.hasUser === true,
      isOwner: value.viewer.isOwner === true,
      follows: value.viewer.follows === true,
    },
    followers: value.followers
      .map((item) => parseFollowPreview(item))
      .filter((item): item is FollowPreview => item !== null),
  };
}

export function parseNotificationsResponse(value: unknown): NotificationItem[] {
  if (!isRecord(value) || value.ok !== true || !Array.isArray(value.items)) {
    return [];
  }

  return value.items
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => {
      const id = toStringOrNull(item.id);
      const kind = toStringOrNull(item.kind);
      const createdAt = toStringOrNull(item.createdAt);
      const href = toStringOrNull(item.href);
      const title = toStringOrNull(item.title);
      const body = toStringOrNull(item.body);
      const meta = item.meta === null ? null : toStringOrNull(item.meta);
      const actor = item.actor;

      if (
        !id ||
        !createdAt ||
        !href ||
        !title ||
        body === null ||
        meta === undefined ||
        (kind !== "REPLY" &&
          kind !== "LIKE" &&
          kind !== "SUPPORT" &&
          kind !== "NOTICE")
      ) {
        return null;
      }

      let parsedActor: NotificationItem["actor"] = null;
      if (actor !== null) {
        if (!isRecord(actor)) return null;
        const username = toStringOrNull(actor.username);
        const displayName = toStringOrNull(actor.displayName);
        const avatarUrl =
          actor.avatarUrl === null ? null : toStringOrNull(actor.avatarUrl);

        if (!username || !displayName || avatarUrl === undefined) {
          return null;
        }

        parsedActor = {
          username,
          displayName,
          avatarUrl,
        };
      }

      return {
        id,
        kind,
        createdAt,
        href,
        title,
        body,
        actor: parsedActor,
        meta,
      };
    })
    .filter((item): item is NotificationItem => item !== null);
}
