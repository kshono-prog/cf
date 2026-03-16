"use client";

import type { Currency } from "@/components/profile/profileClientHelpers";

export type FeedCreatorSummary = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type FeedProjectSummary = {
  id: string;
  title: string;
  currency: string;
  status: string;
};

export type FeedPost = {
  id: string;
  creatorProfileId: string;
  projectId: string | null;
  authorType: string;
  body: string;
  mediaType: "IMAGE" | "VIDEO" | "LINK" | null;
  mediaUrl: string | null;
  visibility: string;
  status: string;
  aiGenerated: boolean;
  aiAgentId: string | null;
  counts: {
    likes: number;
    replies: number;
    tips: number;
  };
  tipTotals: {
    JPYC: string;
    USDC: string;
  };
  creator: FeedCreatorSummary;
  project: FeedProjectSummary | null;
  createdAt: string;
  updatedAt: string;
  viewerHasLiked?: boolean;
};

export type FeedReply = {
  id: string;
  postId: string;
  creatorProfileId: string;
  parentReplyId: string | null;
  authorType: string;
  body: string;
  aiGenerated: boolean;
  aiAgentId: string | null;
  likeCount: number;
  creator: FeedCreatorSummary;
  createdAt: string;
  updatedAt: string;
  viewerHasLiked?: boolean;
};

export type FeedListResponse = {
  items: FeedPost[];
  nextCursor: string | null;
  limit: number;
  filters: {
    creatorUsername: string | null;
    creatorId: string | null;
    projectId: string | null;
  };
};

export type FeedPostDetailResponse = {
  post: FeedPost;
  replies: FeedReply[];
  replyLimit: number;
  viewer?: {
    creatorProfileId: string;
    hasLikedPost: boolean;
    likedReplyIds: string[];
  };
};

export type FeedLikeToggleResponse = {
  postId?: string;
  replyId?: string;
  liked: boolean;
  likeCount: number;
};

export type FeedReplyCreateResponse = {
  reply: FeedReply;
  postReplyCount: number;
};

export type FeedReplyUpdateResponse = {
  reply: FeedReply;
};

export type FeedReplyDeleteResponse = {
  deletedReplyId: string;
  postId: string;
  postReplyCount: number;
};

export type SelectedPostTipContext = {
  id: string;
  preview: string;
  projectId: string | null;
  projectTitle: string | null;
  preferredCurrency: Currency | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toBooleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function toNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseCreatorSummary(value: unknown): FeedCreatorSummary | null {
  if (!isRecord(value)) return null;

  const id = toStringOrNull(value.id);
  const username = toStringOrNull(value.username);
  const displayName = toStringOrNull(value.displayName);
  const avatarUrl =
    value.avatarUrl === null ? null : toStringOrNull(value.avatarUrl);

  if (!id || !username || !displayName || avatarUrl === undefined) return null;

  return {
    id,
    username,
    displayName,
    avatarUrl,
  };
}

function parseProjectSummary(value: unknown): FeedProjectSummary | null {
  if (value === null) return null;
  if (!isRecord(value)) return null;

  const id = toStringOrNull(value.id);
  const title = toStringOrNull(value.title);
  const currency = toStringOrNull(value.currency);
  const status = toStringOrNull(value.status);

  if (!id || !title || !currency || !status) return null;

  return {
    id,
    title,
    currency,
    status,
  };
}

function parseCounts(value: unknown): FeedPost["counts"] | null {
  if (!isRecord(value)) return null;

  const likes = toNumberOrNull(value.likes);
  const replies = toNumberOrNull(value.replies);
  const tips = toNumberOrNull(value.tips);

  if (likes === null || replies === null || tips === null) return null;

  return { likes, replies, tips };
}

function parseTipTotals(value: unknown): FeedPost["tipTotals"] | null {
  if (!isRecord(value)) return null;

  const jpyc = toStringOrNull(value.JPYC);
  const usdc = toStringOrNull(value.USDC);

  if (!jpyc || !usdc) return null;

  return {
    JPYC: jpyc,
    USDC: usdc,
  };
}

function parseFeedPost(value: unknown): FeedPost | null {
  if (!isRecord(value)) return null;

  const id = toStringOrNull(value.id);
  const creatorProfileId = toStringOrNull(value.creatorProfileId);
  const projectId =
    value.projectId === null ? null : toStringOrNull(value.projectId);
  const authorType = toStringOrNull(value.authorType);
  const body = toStringOrNull(value.body);
  const mediaTypeRaw =
    value.mediaType === null ? null : toStringOrNull(value.mediaType);
  const mediaType =
    mediaTypeRaw === "IMAGE" ||
    mediaTypeRaw === "VIDEO" ||
    mediaTypeRaw === "LINK" ||
    mediaTypeRaw === null
      ? mediaTypeRaw
      : null;
  const mediaUrl =
    value.mediaUrl === null ? null : toStringOrNull(value.mediaUrl);
  const visibility = toStringOrNull(value.visibility);
  const status = toStringOrNull(value.status);
  const aiGenerated = toBooleanOrNull(value.aiGenerated);
  const aiAgentId =
    value.aiAgentId === null ? null : toStringOrNull(value.aiAgentId);
  const createdAt = toStringOrNull(value.createdAt);
  const updatedAt = toStringOrNull(value.updatedAt);
  const creator = parseCreatorSummary(value.creator);
  const project = parseProjectSummary(value.project);
  const counts = parseCounts(value.counts);
  const tipTotals = parseTipTotals(value.tipTotals);

  if (
    !id ||
    !creatorProfileId ||
    authorType === null ||
    body === null ||
    mediaUrl === undefined ||
    visibility === null ||
    status === null ||
    aiGenerated === null ||
    aiAgentId === undefined ||
    !createdAt ||
    !updatedAt ||
    !creator ||
    !counts ||
    !tipTotals
  ) {
    return null;
  }

  const viewerHasLiked =
    "viewerHasLiked" in value ? toBooleanOrNull(value.viewerHasLiked) : null;

  return {
    id,
    creatorProfileId,
    projectId,
    authorType,
    body,
    mediaType,
    mediaUrl,
    visibility,
    status,
    aiGenerated,
    aiAgentId,
    counts,
    tipTotals,
    creator,
    project,
    createdAt,
    updatedAt,
    ...(viewerHasLiked !== null ? { viewerHasLiked } : {}),
  };
}

export function parseFeedReply(value: unknown): FeedReply | null {
  if (!isRecord(value)) return null;

  const id = toStringOrNull(value.id);
  const postId = toStringOrNull(value.postId);
  const creatorProfileId = toStringOrNull(value.creatorProfileId);
  const parentReplyId =
    value.parentReplyId === null ? null : toStringOrNull(value.parentReplyId);
  const authorType = toStringOrNull(value.authorType);
  const body = toStringOrNull(value.body);
  const aiGenerated = toBooleanOrNull(value.aiGenerated);
  const aiAgentId =
    value.aiAgentId === null ? null : toStringOrNull(value.aiAgentId);
  const likeCount = toNumberOrNull(value.likeCount);
  const creator = parseCreatorSummary(value.creator);
  const createdAt = toStringOrNull(value.createdAt);
  const updatedAt = toStringOrNull(value.updatedAt);

  if (
    !id ||
    !postId ||
    !creatorProfileId ||
    parentReplyId === undefined ||
    authorType === null ||
    body === null ||
    aiGenerated === null ||
    aiAgentId === undefined ||
    likeCount === null ||
    !creator ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  const viewerHasLiked =
    "viewerHasLiked" in value ? toBooleanOrNull(value.viewerHasLiked) : null;

  return {
    id,
    postId,
    creatorProfileId,
    parentReplyId,
    authorType,
    body,
    aiGenerated,
    aiAgentId,
    likeCount,
    creator,
    createdAt,
    updatedAt,
    ...(viewerHasLiked !== null ? { viewerHasLiked } : {}),
  };
}

function expectOkResponse(value: unknown): Record<string, unknown> {
  if (!isRecord(value) || value.ok !== true) {
    throw new Error("API_RESPONSE_INVALID");
  }
  return value;
}

export function parseApiErrorCode(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const error = toStringOrNull(value.error);
  return error ?? null;
}

export function parseFeedListResponse(value: unknown): FeedListResponse {
  const record = expectOkResponse(value);
  if (!Array.isArray(record.items)) throw new Error("FEED_ITEMS_INVALID");

  const items = record.items
    .map((item) => parseFeedPost(item))
    .filter((item): item is FeedPost => item !== null);
  const nextCursor =
    record.nextCursor === null ? null : toStringOrNull(record.nextCursor);
  const limit = toNumberOrNull(record.limit);
  const filters = isRecord(record.filters) ? record.filters : null;

  if (nextCursor === undefined || limit === null || !filters) {
    throw new Error("FEED_META_INVALID");
  }

  return {
    items,
    nextCursor,
    limit,
    filters: {
      creatorUsername:
        filters.creatorUsername === null
          ? null
          : toStringOrNull(filters.creatorUsername),
      creatorId:
        filters.creatorId === null ? null : toStringOrNull(filters.creatorId),
      projectId:
        filters.projectId === null ? null : toStringOrNull(filters.projectId),
    },
  };
}

export function parseFeedPostDetailResponse(
  value: unknown
): FeedPostDetailResponse {
  const record = expectOkResponse(value);
  const post = parseFeedPost(record.post);
  if (!post) throw new Error("POST_DETAIL_INVALID");
  if (!Array.isArray(record.replies)) throw new Error("POST_REPLIES_INVALID");

  const replies = record.replies
    .map((reply) => parseFeedReply(reply))
    .filter((reply): reply is FeedReply => reply !== null);
  const replyLimit = toNumberOrNull(record.replyLimit);
  if (replyLimit === null) throw new Error("POST_REPLY_LIMIT_INVALID");

  let viewer: FeedPostDetailResponse["viewer"] | undefined = undefined;
  if ("viewer" in record && record.viewer != null) {
    if (!isRecord(record.viewer)) throw new Error("POST_VIEWER_INVALID");
    const creatorProfileId = toStringOrNull(record.viewer.creatorProfileId);
    const hasLikedPost = toBooleanOrNull(record.viewer.hasLikedPost);
    const likedReplyIds = Array.isArray(record.viewer.likedReplyIds)
      ? record.viewer.likedReplyIds.filter(
          (replyId): replyId is string => typeof replyId === "string"
        )
      : null;

    if (!creatorProfileId || hasLikedPost === null || likedReplyIds === null) {
      throw new Error("POST_VIEWER_INVALID");
    }

    viewer = {
      creatorProfileId,
      hasLikedPost,
      likedReplyIds,
    };
  }

  return {
    post,
    replies,
    replyLimit,
    ...(viewer ? { viewer } : {}),
  };
}

export function parseFeedLikeToggleResponse(
  value: unknown
): FeedLikeToggleResponse {
  const record = expectOkResponse(value);

  const liked = toBooleanOrNull(record.liked);
  const likeCount = toNumberOrNull(record.likeCount);

  if (liked === null || likeCount === null) {
    throw new Error("LIKE_TOGGLE_INVALID");
  }

  const postId =
    record.postId === undefined || record.postId === null
      ? undefined
      : toStringOrNull(record.postId) ?? undefined;
  const replyId =
    record.replyId === undefined || record.replyId === null
      ? undefined
      : toStringOrNull(record.replyId) ?? undefined;

  return {
    ...(postId ? { postId } : {}),
    ...(replyId ? { replyId } : {}),
    liked,
    likeCount,
  };
}

export function parseFeedReplyCreateResponse(
  value: unknown
): FeedReplyCreateResponse {
  const record = expectOkResponse(value);

  const reply = parseFeedReply(record.reply);
  const postReplyCount = toNumberOrNull(record.postReplyCount);

  if (!reply || postReplyCount === null) {
    throw new Error("REPLY_CREATE_INVALID");
  }

  return {
    reply,
    postReplyCount,
  };
}

export function parseFeedReplyUpdateResponse(
  value: unknown
): FeedReplyUpdateResponse {
  const record = expectOkResponse(value);
  const reply = parseFeedReply(record.reply);
  if (!reply) {
    throw new Error("REPLY_UPDATE_INVALID");
  }
  return { reply };
}

export function parseFeedReplyDeleteResponse(
  value: unknown
): FeedReplyDeleteResponse {
  const record = expectOkResponse(value);
  const deletedReplyId = toStringOrNull(record.deletedReplyId);
  const postId = toStringOrNull(record.postId);
  const postReplyCount = toNumberOrNull(record.postReplyCount);
  if (!deletedReplyId || !postId || postReplyCount === null) {
    throw new Error("REPLY_DELETE_INVALID");
  }
  return {
    deletedReplyId,
    postId,
    postReplyCount,
  };
}

export function toSelectedPostTipContext(post: FeedPost): SelectedPostTipContext {
  const preview =
    post.body.length > 90 ? `${post.body.slice(0, 90).trimEnd()}…` : post.body;
  const preferredCurrency =
    post.project?.currency === "JPYC" || post.project?.currency === "USDC"
      ? (post.project.currency as Currency)
      : null;

  return {
    id: post.id,
    preview,
    projectId: post.projectId,
    projectTitle: post.project?.title ?? null,
    preferredCurrency,
  };
}

export function getFeedPostProjectSupportHref(post: FeedPost): string | null {
  if (!post.project) return null;

  return `/${encodeURIComponent(
    post.creator.username
  )}?projectId=${encodeURIComponent(post.project.id)}&support=1`;
}
