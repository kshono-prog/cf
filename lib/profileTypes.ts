// lib/profileTypes.ts

/* ================================
 * SNS 定義（キー・アイコン・表示名）
 * ================================ */
export const SOCIAL_ICON_CONFIG = [
  { key: "twitter", icon: "/icon/icon-twitter.svg", label: "X (Twitter)" },
  { key: "instagram", icon: "/icon/icon-instagram.svg", label: "Instagram" },
  { key: "youtube", icon: "/icon/icon-youtube.svg", label: "YouTube" },
  { key: "facebook", icon: "/icon/icon-facebook.svg", label: "Facebook" },
  { key: "tiktok", icon: "/icon/icon-tiktok.svg", label: "TikTok" },
  { key: "website", icon: "/icon/icon-link.svg", label: "WebSite" },
] as const;

/** SNSキー型（icon config から自動導出） */
export type SocialKey = (typeof SOCIAL_ICON_CONFIG)[number]["key"];

/** SNSリンク一覧 */
export type SocialLinks = Partial<Record<SocialKey, string>>;

/* ================================
 * YouTube
 * ================================ */
export type YoutubeVideo = {
  url: string;
  title: string;
  description: string;
};

/* ================================
 * Creator Profile
 * ================================ */
export type CreatorProfile = {
  username: string;
  address?: string;
  displayName?: string;
  avatarUrl?: string | null;
  profile?: string | null;
  qrcode?: string | null;
  url?: string | null;
  goalTitle?: string | null;
  goalTargetJpyc?: number | null;
  themeColor?: string | null;
  socials?: SocialLinks;
  youtubeVideos?: YoutubeVideo[];
};
