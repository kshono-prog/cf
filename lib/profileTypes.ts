import type {
  CreatorProfile,
  SocialLinks,
  YoutubeVideo,
} from "@/types/creator";

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

export type { CreatorProfile, SocialLinks, YoutubeVideo };
