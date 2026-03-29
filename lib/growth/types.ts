export const GROWTH_EVENT_NAMES = [
  "wallet_connected",
  "user_registered",
  "creator_applied",
  "profile_ai_generated",
  "profile_saved",
  "project_created",
  "goal_saved",
  "public_page_viewed_by_owner",
  "share_drafts_generated",
  "share_copied",
  "share_post_logged",
  "first_tip_received",
] as const;

export type GrowthEventName = (typeof GROWTH_EVENT_NAMES)[number];

export type GrowthEventPayload = {
  event: GrowthEventName;
  username?: string | null;
  walletAddress?: string | null;
  projectId?: string | null;
  metadata?: unknown;
};
