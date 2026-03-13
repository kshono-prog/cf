import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { toAddressOrNull } from "@/lib/api/guards";

export const FEED_DEFAULT_LIMIT = 20;
export const FEED_MAX_LIMIT = 50;
export const POST_BODY_MAX_LENGTH = 2000;
export const REPLY_BODY_MAX_LENGTH = 1200;
export const INITIAL_REPLY_LIMIT = 20;
export const INITIAL_REPLY_MAX_LIMIT = 50;

export type CurrencyCode = "JPYC" | "USDC";
export type PostMediaType = "IMAGE" | "VIDEO" | "LINK";
export type AiAgentRole =
  | "POSTER"
  | "ANALYST"
  | "PROMOTER"
  | "REPLY_AGENT";
export type AiPromotionJobType =
  | "AUTO_POST"
  | "AUTO_REPLY"
  | "ANALYZE"
  | "PROMOTE";
export type ManagedPostStatus = "PUBLISHED" | "ARCHIVED";

type CreatorSummaryRow = {
  id: bigint;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

type ProjectSummaryRow = {
  id: bigint;
  title: string;
  currency: string;
  status: string;
};

type PostViewRow = {
  id: string;
  creatorProfileId: bigint;
  projectId: bigint | null;
  authorType: string;
  body: string;
  mediaType: string | null;
  mediaUrl: string | null;
  visibility: string;
  status: string;
  aiGenerated: boolean;
  aiAgentId: string | null;
  likeCount: number;
  replyCount: number;
  tipCount: number;
  tipAmountJpyc: Prisma.Decimal | string;
  tipAmountUsdc: Prisma.Decimal | string;
  createdAt: Date;
  updatedAt: Date;
  creatorProfile: CreatorSummaryRow;
  project: ProjectSummaryRow | null;
  likes?: Array<{ id: string }>;
};

type ReplyViewRow = {
  id: string;
  postId: string;
  creatorProfileId: bigint;
  parentReplyId: string | null;
  authorType: string;
  body: string;
  aiGenerated: boolean;
  aiAgentId: string | null;
  likeCount: number;
  createdAt: Date;
  updatedAt: Date;
  creatorProfile: CreatorSummaryRow;
  likes?: Array<{ id: string }>;
};

type CreatorByAddressRecord = {
  id: bigint;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  walletAddress: string | null;
};

type AiAgentViewRow = {
  id: string;
  creatorProfileId: bigint;
  name: string;
  role: string;
  status: string;
  configJson: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    posts: number;
    replies: number;
    jobs: number;
  };
};

type AiPromotionJobViewRow = {
  id: string;
  creatorProfileId: bigint;
  aiAgentId: string | null;
  postId: string | null;
  jobType: string;
  status: string;
  inputJson: Prisma.JsonValue;
  outputJson: Prisma.JsonValue;
  executionCostUsd: Prisma.Decimal | string | null;
  billable: boolean;
  billingStatus: string;
  createdAt: Date;
  updatedAt: Date;
  aiAgent: {
    id: string;
    name: string;
    role: string;
    status: string;
  } | null;
  post: {
    id: string;
    body: string;
    status: string;
    visibility: string;
  } | null;
};

type TxClient = Prisma.TransactionClient;

function toDecimalString(value: Prisma.Decimal | string): string {
  return typeof value === "string" ? value : value.toString();
}

function toDecimalValue(
  value: Prisma.Decimal | string | null
): Prisma.Decimal | null {
  if (value === null) return null;
  if (value instanceof Prisma.Decimal) return value;
  try {
    return new Prisma.Decimal(value);
  } catch {
    return null;
  }
}

export function isUuidString(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function toNullableUuidString(
  value: unknown
): string | null | undefined {
  if (typeof value === "undefined") return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return null;
  return isUuidString(trimmed) ? trimmed : undefined;
}

export function toNullableTrimmedString(
  value: unknown
): string | null | undefined {
  if (typeof value === "undefined") return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function toPostMediaType(value: unknown): PostMediaType | null {
  return value === "IMAGE" || value === "VIDEO" || value === "LINK"
    ? value
    : null;
}

export function toAiAgentRole(value: unknown): AiAgentRole | null {
  return value === "POSTER" ||
    value === "ANALYST" ||
    value === "PROMOTER" ||
    value === "REPLY_AGENT"
    ? value
    : null;
}

export function toAiPromotionJobType(value: unknown): AiPromotionJobType | null {
  return value === "AUTO_POST" ||
    value === "AUTO_REPLY" ||
    value === "ANALYZE" ||
    value === "PROMOTE"
    ? value
    : null;
}

export function toManagedPostStatus(value: unknown): ManagedPostStatus | null {
  return value === "PUBLISHED" || value === "ARCHIVED" ? value : null;
}

export function normalizeTextBody(
  value: unknown,
  maxLength: number
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) return null;
  return trimmed;
}

export function parsePositiveInt(
  raw: string | null,
  fallback: number,
  max: number
): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export function encodeFeedCursor(value: {
  createdAt: Date;
  id: string;
}): string {
  return `${value.createdAt.toISOString()}|${value.id}`;
}

export function decodeFeedCursor(
  raw: string | null
): { createdAt: Date; id: string } | null {
  if (!raw) return null;
  const [createdAtRaw, id] = raw.split("|");
  if (!createdAtRaw || !id || !isUuidString(id)) return null;
  const createdAt = new Date(createdAtRaw);
  if (Number.isNaN(createdAt.getTime())) return null;
  return { createdAt, id };
}

export async function findCreatorByWalletAddress(
  addressRaw: string
): Promise<CreatorByAddressRecord | null> {
  const address = toAddressOrNull(addressRaw);
  if (!address) return null;

  return prisma.creatorProfile.findUnique({
    where: { walletAddress: address.toLowerCase() },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      walletAddress: true,
    },
  });
}

export async function resolveViewerCreatorProfileId(
  addressRaw: string | null
): Promise<bigint | null> {
  const address = toAddressOrNull(addressRaw);
  if (!address) return null;

  const creator = await prisma.creatorProfile.findUnique({
    where: { walletAddress: address.toLowerCase() },
    select: { id: true },
  });

  return creator?.id ?? null;
}

export function serializePost(
  row: PostViewRow,
  includeViewerHasLiked: boolean
) {
  return {
    id: row.id,
    creatorProfileId: row.creatorProfileId.toString(),
    projectId: row.projectId?.toString() ?? null,
    authorType: row.authorType,
    body: row.body,
    mediaType: row.mediaType,
    mediaUrl: row.mediaUrl,
    visibility: row.visibility,
    status: row.status,
    aiGenerated: row.aiGenerated,
    aiAgentId: row.aiAgentId,
    counts: {
      likes: row.likeCount,
      replies: row.replyCount,
      tips: row.tipCount,
    },
    tipTotals: {
      JPYC: toDecimalString(row.tipAmountJpyc),
      USDC: toDecimalString(row.tipAmountUsdc),
    },
    creator: {
      id: row.creatorProfile.id.toString(),
      username: row.creatorProfile.username,
      displayName: row.creatorProfile.displayName,
      avatarUrl: row.creatorProfile.avatarUrl,
    },
    project: row.project
      ? {
          id: row.project.id.toString(),
          title: row.project.title,
          currency: row.project.currency,
          status: row.project.status,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(includeViewerHasLiked
      ? { viewerHasLiked: Array.isArray(row.likes) && row.likes.length > 0 }
      : {}),
  };
}

export function serializeReply(
  row: ReplyViewRow,
  includeViewerHasLiked: boolean
) {
  return {
    id: row.id,
    postId: row.postId,
    creatorProfileId: row.creatorProfileId.toString(),
    parentReplyId: row.parentReplyId,
    authorType: row.authorType,
    body: row.body,
    aiGenerated: row.aiGenerated,
    aiAgentId: row.aiAgentId,
    likeCount: row.likeCount,
    creator: {
      id: row.creatorProfile.id.toString(),
      username: row.creatorProfile.username,
      displayName: row.creatorProfile.displayName,
      avatarUrl: row.creatorProfile.avatarUrl,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(includeViewerHasLiked
      ? { viewerHasLiked: Array.isArray(row.likes) && row.likes.length > 0 }
      : {}),
  };
}

function buildTextPreview(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1))}\u2026`;
}

export function serializeAiAgent(row: AiAgentViewRow) {
  return {
    id: row.id,
    creatorProfileId: row.creatorProfileId.toString(),
    name: row.name,
    role: row.role,
    status: row.status,
    config: row.configJson,
    counts: {
      posts: row._count?.posts ?? 0,
      replies: row._count?.replies ?? 0,
      jobs: row._count?.jobs ?? 0,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeAiPromotionJob(row: AiPromotionJobViewRow) {
  return {
    id: row.id,
    creatorProfileId: row.creatorProfileId.toString(),
    aiAgentId: row.aiAgentId,
    postId: row.postId,
    jobType: row.jobType,
    status: row.status,
    input: row.inputJson,
    output: row.outputJson,
    executionCostUsd: row.executionCostUsd
      ? toDecimalString(row.executionCostUsd)
      : null,
    billable: row.billable,
    billingStatus: row.billingStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    aiAgent: row.aiAgent
      ? {
          id: row.aiAgent.id,
          name: row.aiAgent.name,
          role: row.aiAgent.role,
          status: row.aiAgent.status,
        }
      : null,
    post: row.post
      ? {
          id: row.post.id,
          preview: buildTextPreview(row.post.body, 90),
          status: row.post.status,
          visibility: row.post.visibility,
        }
      : null,
  };
}

export async function ensurePostTipLink(params: {
  tx: TxClient;
  postId: string;
  contributionId: string;
  now: Date;
}): Promise<{ created: boolean }> {
  const existingByContribution = await params.tx.postTip.findFirst({
    where: { contributionId: params.contributionId },
    select: { postId: true },
  });

  if (existingByContribution) {
    if (existingByContribution.postId !== params.postId) {
      throw new Error("CONTRIBUTION_ALREADY_LINKED_TO_ANOTHER_POST");
    }
    return { created: false };
  }

  await params.tx.postTip.create({
    data: {
      postId: params.postId,
      contributionId: params.contributionId,
      createdAt: params.now,
    },
    select: { id: true },
  });

  return { created: true };
}

export async function applyConfirmedContributionToPostTips(params: {
  tx: TxClient;
  contributionId: string;
  currency: CurrencyCode;
  amountDecimal: Prisma.Decimal | string | null;
  now: Date;
}): Promise<void> {
  const amount = toDecimalValue(params.amountDecimal);
  if (!amount) return;

  const links = await params.tx.postTip.findMany({
    where: { contributionId: params.contributionId },
    select: { postId: true },
  });

  for (const link of links) {
    if (params.currency === "JPYC") {
      await params.tx.post.update({
        where: { id: link.postId },
        data: {
          tipCount: { increment: 1 },
          tipAmountJpyc: { increment: amount },
          updatedAt: params.now,
        },
        select: { id: true },
      });
      continue;
    }

    await params.tx.post.update({
      where: { id: link.postId },
      data: {
        tipCount: { increment: 1 },
        tipAmountUsdc: { increment: amount },
        updatedAt: params.now,
      },
      select: { id: true },
    });
  }
}
