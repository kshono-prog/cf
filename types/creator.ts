export type SocialLinks = Partial<
  Record<
    "twitter" | "instagram" | "youtube" | "facebook" | "tiktok" | "website",
    string
  >
>;

export type YoutubeVideo = {
  url: string;
  title: string;
  description: string;
};

export type CreatorProfile = {
  username: string;
  address?: string;
  displayName?: string;
  avatarUrl?: string | null;
  profile?: string | null;
  qrcode?: string | null;
  url?: string | null;
  // 削除:
  // goalTitle?: string | null;
  // goalTargetJpyc?: number | null;
  themeColor?: string | null;
  socials?: SocialLinks;
  youtubeVideos?: YoutubeVideo[];
};

// export type CreatorProfile = {
//   username: string;
//   displayName?: string;
//   profileText?: string; // ★追加（bio相当）
//   avatar?: string;
//   qrcode?: string;
//   url?: string;
//   goalTitle?: string;
//   goalTargetJpyc?: number;
//   themeColor?: string;
//   address?: string;
//   socials?: Record<string, string>;
//   youtubeVideos?: YoutubeVideo[];
// };
