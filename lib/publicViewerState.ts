"use client";

type ViewerUserSummary = {
  username: string | null;
  displayName: string | null;
};

export type PublicViewerIdentity = {
  hasUser: boolean;
  hasCreator: boolean;
  user: ViewerUserSummary | null;
  creatorUsername: string | null;
};

export type PublicViewerMode =
  | "loading"
  | "unconnected"
  | "unregistered"
  | "registered"
  | "owner";

export type PublicViewerState = {
  mode: PublicViewerMode;
  isConnected: boolean;
  isOwner: boolean;
  hasUser: boolean;
  hasCreator: boolean;
  userUsername: string | null;
  creatorUsername: string | null;
  displayName: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizeKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function parsePublicViewerMeResponse(
  value: unknown
): PublicViewerIdentity | null {
  if (!isRecord(value) || value.ok !== true) return null;

  const hasUser = value.hasUser === true;
  const hasCreator = value.hasCreator === true;

  let user: ViewerUserSummary | null = null;
  if (value.user === null) {
    user = null;
  } else if (isRecord(value.user)) {
    const username = toStringOrNull(value.user.username);
    const displayName = toStringOrNull(value.user.displayName);
    user = {
      username,
      displayName,
    };
  }

  const creatorUsername =
    value.creator === null
      ? null
      : isRecord(value.creator)
      ? toStringOrNull(value.creator.username)
      : null;

  return {
    hasUser,
    hasCreator,
    user,
    creatorUsername,
  };
}

export function resolvePublicViewerState(args: {
  pageUsername: string;
  pageCreatorAddress: string | null;
  viewerAddress: string | null;
  identity: PublicViewerIdentity | null;
  identityResolved: boolean;
}): PublicViewerState {
  const normalizedPageUsername = normalizeKey(args.pageUsername);
  const normalizedPageCreatorAddress = normalizeKey(args.pageCreatorAddress);
  const normalizedViewerAddress = normalizeKey(args.viewerAddress);
  const userUsername = args.identity?.user?.username ?? null;
  const creatorUsername = args.identity?.creatorUsername ?? null;
  const displayName = args.identity?.user?.displayName ?? null;

  const isOwnerByAddress =
    normalizedPageCreatorAddress !== null &&
    normalizedViewerAddress !== null &&
    normalizedPageCreatorAddress === normalizedViewerAddress;
  const isOwnerByUsername =
    normalizedPageUsername !== null &&
    [userUsername, creatorUsername]
      .map((value) => normalizeKey(value))
      .some((value) => value !== null && value === normalizedPageUsername);
  const isOwner = isOwnerByAddress || isOwnerByUsername;

  if (!normalizedViewerAddress) {
    return {
      mode: "unconnected",
      isConnected: false,
      isOwner: false,
      hasUser: false,
      hasCreator: false,
      userUsername,
      creatorUsername,
      displayName,
    };
  }

  if (isOwner) {
    return {
      mode: "owner",
      isConnected: true,
      isOwner: true,
      hasUser: true,
      hasCreator: args.identity?.hasCreator ?? true,
      userUsername,
      creatorUsername,
      displayName,
    };
  }

  if (!args.identityResolved) {
    return {
      mode: "loading",
      isConnected: true,
      isOwner: false,
      hasUser: false,
      hasCreator: false,
      userUsername,
      creatorUsername,
      displayName,
    };
  }

  if (!args.identity?.hasUser) {
    return {
      mode: "unregistered",
      isConnected: true,
      isOwner: false,
      hasUser: false,
      hasCreator: false,
      userUsername,
      creatorUsername,
      displayName,
    };
  }

  return {
    mode: "registered",
    isConnected: true,
    isOwner: false,
    hasUser: true,
    hasCreator: args.identity.hasCreator,
    userUsername,
    creatorUsername,
    displayName,
  };
}
