import type { NotificationKind } from "@/lib/communityApiParsers";

type NotificationFallbackBadge = {
  label: string;
  title: string;
  className: string;
};

export function formatNotificationTimestamp(
  value: string,
  nowMs = Date.now()
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = nowMs - date.getTime();
  if (diffMs >= 0 && diffMs < 24 * 60 * 60 * 1000) {
    if (diffMs < 60 * 1000) {
      return "たった今";
    }

    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    if (diffMinutes < 60) {
      return `${diffMinutes}分前`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}時間前`;
  }

  return date.toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getNotificationFallbackBadge(
  kind: NotificationKind
): NotificationFallbackBadge {
  switch (kind) {
    case "REPLY":
      return {
        label: "返",
        title: "返信",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "LIKE":
      return {
        label: "好",
        title: "いいね",
        className: "border-pink-200 bg-pink-50 text-pink-700",
      };
    case "SUPPORT":
      return {
        label: "応",
        title: "応援",
        className: "border-sky-200 bg-sky-50 text-sky-700",
      };
    case "NOTICE":
    default:
      return {
        label: "知",
        title: "お知らせ",
        className: "border-amber-200 bg-amber-50 text-amber-700",
      };
  }
}
