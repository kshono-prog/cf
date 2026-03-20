import type { PublicViewerIdentity } from "@/lib/publicViewerState";

export type CommunityViewerMode =
  | "unconnected"
  | "loading"
  | "unregistered"
  | "userOnly"
  | "creatorReady";

function hasViewerAddress(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function mapFollowActionError(message: string): string {
  switch (message) {
    case "ADDRESS_REQUIRED":
      return "フォローするにはウォレット接続が必要です。";
    case "VIEWER_NOT_REGISTERED":
      return "フォローするには先にユーザー登録をしてください。";
    case "CANNOT_FOLLOW_SELF":
      return "自分自身はフォローできません。";
    default:
      return "フォローの更新に失敗しました。";
  }
}

export function resolveCommunityViewerMode(args: {
  isConnected: boolean;
  viewerAddress: string | null | undefined;
  identityResolved: boolean;
  identity: PublicViewerIdentity | null;
}): CommunityViewerMode {
  if (!args.isConnected || !hasViewerAddress(args.viewerAddress)) {
    return "unconnected";
  }
  if (!args.identityResolved) {
    return "loading";
  }
  if (!args.identity?.hasUser) {
    return "unregistered";
  }
  if (!args.identity.hasCreator) {
    return "userOnly";
  }
  return "creatorReady";
}

export function resolveCommunityViewerLinks(args: {
  fallbackUsername: string;
  identity: PublicViewerIdentity | null;
}): {
  settingsHref: string;
  composeHref: string;
  notificationsHref: string;
} {
  const ownerUsername =
    args.identity?.creatorUsername ?? args.identity?.user?.username ?? args.fallbackUsername;
  const settingsHref = `/${ownerUsername}/mypage`;
  const composeHref = args.identity?.creatorUsername
    ? `/${args.identity.creatorUsername}/compose`
    : settingsHref;
  const notificationsHref = args.identity?.creatorUsername
    ? `/${args.identity.creatorUsername}/notifications`
    : settingsHref;

  return {
    settingsHref,
    composeHref,
    notificationsHref,
  };
}
