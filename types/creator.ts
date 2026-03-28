import type {
  CreatorType,
  EcosystemRole,
} from "@/lib/creatorTaxonomy";

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
  themeColor?: string | null;
  creatorType?: CreatorType | null;
  ecosystemRole?: EcosystemRole | null;
  socials?: SocialLinks;
  youtubeVideos?: YoutubeVideo[];
};
