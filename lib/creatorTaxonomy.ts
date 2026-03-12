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

export const EVENT_CATEGORY_OPTIONS = [
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
export type EventCategory = (typeof EVENT_CATEGORY_OPTIONS)[number];

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

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
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

export function isEventCategory(value: string): value is EventCategory {
  return EVENT_CATEGORY_OPTIONS.includes(value as EventCategory);
}
