export const CREATOR_TYPE_OPTIONS = [
  "MUSICIAN",
  "VTUBER",
  "ILLUSTRATOR",
  "VIDEO_CREATOR",
  "EVENT_ORGANIZER",
  "PERFORMER",
  "WRITER",
  "OTHER",
] as const;

export const CREATOR_CATEGORY_OPTIONS = [
  "LIVE",
  "DJ",
  "JAZZ",
  "ROCK",
  "ANIME",
  "ART",
  "TALK",
  "WORKSHOP",
  "COMMUNITY",
  "TECH",
  "FASHION",
  "FOOD",
  "OTHER",
] as const;

export type CreatorType = (typeof CREATOR_TYPE_OPTIONS)[number];
export type CreatorCategory = (typeof CREATOR_CATEGORY_OPTIONS)[number];

export const CREATOR_TYPE_LABELS: Record<CreatorType, string> = {
  MUSICIAN: "Music",
  VTUBER: "VTuber",
  ILLUSTRATOR: "Illustration",
  VIDEO_CREATOR: "Video",
  EVENT_ORGANIZER: "Event",
  PERFORMER: "Performance",
  WRITER: "Writing",
  OTHER: "Other",
};

export const CREATOR_CATEGORY_LABELS: Record<CreatorCategory, string> = {
  LIVE: "Live",
  DJ: "DJ",
  JAZZ: "Jazz",
  ROCK: "Rock",
  ANIME: "Anime",
  ART: "Art",
  TALK: "Talk",
  WORKSHOP: "Workshop",
  COMMUNITY: "Community",
  TECH: "Tech",
  FASHION: "Fashion",
  FOOD: "Food",
  OTHER: "Other",
};

export function isCreatorType(value: string): value is CreatorType {
  return CREATOR_TYPE_OPTIONS.includes(value as CreatorType);
}

export function isCreatorCategory(value: string): value is CreatorCategory {
  return CREATOR_CATEGORY_OPTIONS.includes(value as CreatorCategory);
}
