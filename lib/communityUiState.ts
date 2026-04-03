import type { PublicViewerIdentity } from "@/lib/publicViewerState";

export type CommunityViewerMode =
  | "unconnected"
  | "loading"
  | "unregistered"
  | "userOnly"
  | "creatorReady";

const OWNER_AUTH_ERROR_CODES = new Set<string>([
  "OWNER_SIGNER_NOT_READY",
  "OWNER_AUTH_REQUIRED",
  "OWNER_AUTH_NONCE_FAILED",
  "OWNER_AUTH_NONCE_NOT_FOUND",
  "OWNER_AUTH_NONCE_EXPIRED",
  "OWNER_AUTH_MESSAGE_INVALID",
  "OWNER_AUTH_SIGNATURE_INVALID",
  "OWNER_AUTH_SESSION_FAILED",
  "OWNER_AUTH_SESSION_STATUS_FAILED",
]);

function hasViewerAddress(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function mapFollowActionError(message: string): string {
  if (message === "CANNOT_FOLLOW_SELF") {
    return "自分自身はフォローできません。";
  }

  return mapCommunityProtectedActionError(
    message,
    "フォローの更新に失敗しました。"
  );
}

export function getAppAuthenticationHint(actionLabel: string): string {
  return `${actionLabel}にはアプリ認証が必要です。初回のみログイン用の署名確認が表示され、認証後は通常の閲覧や移動で再署名は求められません。`;
}

export function mapCommunityProtectedActionError(
  message: string,
  fallback: string
): string {
  const normalizedMessage = message.trim().toUpperCase();
  const lowerMessage = message.trim().toLowerCase();

  switch (normalizedMessage) {
    case "ADDRESS_REQUIRED":
      return "続けるにはウォレット接続が必要です。";
    case "VIEWER_NOT_REGISTERED":
      return "続けるには先にユーザー登録をしてください。";
    case "CREATOR_NOT_FOUND":
      return "この操作は現在、クリエイター登録済みウォレットで利用できます。";
    default:
      break;
  }

  if (OWNER_AUTH_ERROR_CODES.has(normalizedMessage)) {
    return "この操作にはアプリ認証が必要です。ログイン用の署名を確認してから、もう一度お試しください。";
  }

  if (
    lowerMessage.includes("user rejected") ||
    lowerMessage.includes("user denied") ||
    lowerMessage.includes("user cancelled") ||
    lowerMessage.includes("user canceled")
  ) {
    return "アプリ認証がキャンセルされました。署名を確認できたときに、もう一度お試しください。";
  }

  return fallback;
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
