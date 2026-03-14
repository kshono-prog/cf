import type { Address } from "viem";

import { getErrorFromApiJson, isRecord } from "@/lib/mypage/helpers";

export type SnsProjectOption = {
  id: string;
  label: string;
  currency: "JPYC" | "USDC";
  title: string;
  status: string;
};

export type SnsManagedPost = {
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
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  project: {
    id: string;
    title: string;
    currency: string;
    status: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  analytics: {
    impressionCount: number;
    profileClickCount: number;
    engagementScore: string;
    updatedAt: string;
  } | null;
};

export type SnsManagedPostsResponse = {
  items: SnsManagedPost[];
  nextCursor: string | null;
  limit: number;
  totalCount: number;
};

export type SnsAnalyticsSummary = {
  postCount: number;
  publishedCount: number;
  draftCount: number;
  archivedCount: number;
  aiGeneratedPostCount: number;
  totalLikes: number;
  totalReplies: number;
  totalTips: number;
  tipTotals: {
    JPYC: string;
    USDC: string;
  };
  analytics: {
    trackedPostCount: number;
    impressionCount: number;
    profileClickCount: number;
    engagementScore: string;
  };
  agents: {
    total: number;
    active: number;
  };
  jobs: {
    queued: number;
    running: number;
    done: number;
    failed: number;
  };
  lastPostAt: string | null;
  lastPublishedAt: string | null;
};

export type SnsAiAgent = {
  id: string;
  creatorProfileId: string;
  name: string;
  role: "POSTER" | "ANALYST" | "PROMOTER" | "REPLY_AGENT";
  status: string;
  config: unknown;
  counts: {
    posts: number;
    replies: number;
    jobs: number;
  };
  createdAt: string;
  updatedAt: string;
};

export type SnsAiJob = {
  id: string;
  creatorProfileId: string;
  aiAgentId: string | null;
  postId: string | null;
  jobType: "AUTO_POST" | "AUTO_REPLY" | "ANALYZE" | "PROMOTE";
  status: "QUEUED" | "RUNNING" | "DONE" | "FAILED" | string;
  input: unknown;
  output: unknown;
  executionCostUsd: string | null;
  billable: boolean;
  billingStatus: string;
  createdAt: string;
  updatedAt: string;
  aiAgent: {
    id: string;
    name: string;
    role: string;
    status: string;
  } | null;
  post: {
    id: string;
    preview: string;
    status: string;
    visibility: string;
  } | null;
};

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toBooleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function toMediaType(
  value: unknown
): "IMAGE" | "VIDEO" | "LINK" | null | undefined {
  if (value === null) return null;
  if (value === "IMAGE" || value === "VIDEO" || value === "LINK") return value;
  return undefined;
}

function parseCounts(value: unknown): SnsManagedPost["counts"] | null {
  if (!isRecord(value)) return null;

  const likes = toNumberOrNull(value.likes);
  const replies = toNumberOrNull(value.replies);
  const tips = toNumberOrNull(value.tips);
  if (likes === null || replies === null || tips === null) return null;

  return { likes, replies, tips };
}

function parseTipTotals(value: unknown): SnsManagedPost["tipTotals"] | null {
  if (!isRecord(value)) return null;
  const jpyc = toStringOrNull(value.JPYC);
  const usdc = toStringOrNull(value.USDC);
  if (!jpyc || !usdc) return null;
  return { JPYC: jpyc, USDC: usdc };
}

function parseCreatorSummary(value: unknown): SnsManagedPost["creator"] | null {
  if (!isRecord(value)) return null;

  const id = toStringOrNull(value.id);
  const username = toStringOrNull(value.username);
  const displayName = toStringOrNull(value.displayName);
  const avatarUrl =
    value.avatarUrl === null ? null : toStringOrNull(value.avatarUrl);
  if (!id || !username || !displayName || avatarUrl === undefined) return null;

  return { id, username, displayName, avatarUrl };
}

function parseProjectSummary(value: unknown): SnsManagedPost["project"] | null {
  if (value === null) return null;
  if (!isRecord(value)) return null;

  const id = toStringOrNull(value.id);
  const title = toStringOrNull(value.title);
  const currency = toStringOrNull(value.currency);
  const status = toStringOrNull(value.status);
  if (!id || !title || !currency || !status) return null;

  return { id, title, currency, status };
}

function parseAnalytics(value: unknown): SnsManagedPost["analytics"] | null {
  if (value === null) return null;
  if (!isRecord(value)) return null;

  const impressionCount = toNumberOrNull(value.impressionCount);
  const profileClickCount = toNumberOrNull(value.profileClickCount);
  const engagementScore = toStringOrNull(value.engagementScore);
  const updatedAt = toStringOrNull(value.updatedAt);
  if (
    impressionCount === null ||
    profileClickCount === null ||
    !engagementScore ||
    !updatedAt
  ) {
    return null;
  }

  return {
    impressionCount,
    profileClickCount,
    engagementScore,
    updatedAt,
  };
}

function parseManagedPost(value: unknown): SnsManagedPost | null {
  if (!isRecord(value)) return null;

  const id = toStringOrNull(value.id);
  const creatorProfileId = toStringOrNull(value.creatorProfileId);
  const projectId =
    value.projectId === null ? null : toStringOrNull(value.projectId);
  const authorType = toStringOrNull(value.authorType);
  const body = toStringOrNull(value.body);
  const mediaType = toMediaType(value.mediaType);
  const mediaUrl =
    value.mediaUrl === null ? null : toStringOrNull(value.mediaUrl);
  const visibility = toStringOrNull(value.visibility);
  const status = toStringOrNull(value.status);
  const aiGenerated = toBooleanOrNull(value.aiGenerated);
  const aiAgentId =
    value.aiAgentId === null ? null : toStringOrNull(value.aiAgentId);
  const counts = parseCounts(value.counts);
  const tipTotals = parseTipTotals(value.tipTotals);
  const creator = parseCreatorSummary(value.creator);
  const project = parseProjectSummary(value.project);
  const createdAt = toStringOrNull(value.createdAt);
  const updatedAt = toStringOrNull(value.updatedAt);
  const analytics = parseAnalytics(value.analytics);

  if (
    !id ||
    !creatorProfileId ||
    !authorType ||
    body === null ||
    typeof mediaType === "undefined" ||
    typeof mediaUrl === "undefined" ||
    !visibility ||
    !status ||
    aiGenerated === null ||
    typeof aiAgentId === "undefined" ||
    !counts ||
    !tipTotals ||
    !creator ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

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
    analytics,
  };
}

function parseManagedPostsResponse(value: unknown): SnsManagedPostsResponse {
  if (!isRecord(value) || value.ok !== true || !Array.isArray(value.items)) {
    throw new Error("SNS_POSTS_RESPONSE_INVALID");
  }

  const items = value.items
    .map((item) => parseManagedPost(item))
    .filter((item): item is SnsManagedPost => item !== null);
  const nextCursor =
    value.nextCursor === null ? null : toStringOrNull(value.nextCursor);
  const limit = toNumberOrNull(value.limit);
  const totalCount = toNumberOrNull(value.totalCount);
  if (nextCursor === undefined || limit === null || totalCount === null) {
    throw new Error("SNS_POSTS_RESPONSE_INVALID");
  }

  return { items, nextCursor, limit, totalCount };
}

function parseSummary(value: unknown): SnsAnalyticsSummary {
  if (!isRecord(value) || value.ok !== true || !isRecord(value.summary)) {
    throw new Error("SNS_SUMMARY_RESPONSE_INVALID");
  }

  const summary = value.summary;
  if (
    !isRecord(summary.tipTotals) ||
    !isRecord(summary.analytics) ||
    !isRecord(summary.agents) ||
    !isRecord(summary.jobs)
  ) {
    throw new Error("SNS_SUMMARY_RESPONSE_INVALID");
  }

  const postCount = toNumberOrNull(summary.postCount);
  const publishedCount = toNumberOrNull(summary.publishedCount);
  const draftCount = toNumberOrNull(summary.draftCount);
  const archivedCount = toNumberOrNull(summary.archivedCount);
  const aiGeneratedPostCount = toNumberOrNull(summary.aiGeneratedPostCount);
  const totalLikes = toNumberOrNull(summary.totalLikes);
  const totalReplies = toNumberOrNull(summary.totalReplies);
  const totalTips = toNumberOrNull(summary.totalTips);
  const tipJpyc = toStringOrNull(summary.tipTotals.JPYC);
  const tipUsdc = toStringOrNull(summary.tipTotals.USDC);
  const trackedPostCount = toNumberOrNull(summary.analytics.trackedPostCount);
  const impressionCount = toNumberOrNull(summary.analytics.impressionCount);
  const profileClickCount = toNumberOrNull(summary.analytics.profileClickCount);
  const engagementScore = toStringOrNull(summary.analytics.engagementScore);
  const agentTotal = toNumberOrNull(summary.agents.total);
  const agentActive = toNumberOrNull(summary.agents.active);
  const queued = toNumberOrNull(summary.jobs.queued);
  const running = toNumberOrNull(summary.jobs.running);
  const done = toNumberOrNull(summary.jobs.done);
  const failed = toNumberOrNull(summary.jobs.failed);
  const lastPostAt =
    summary.lastPostAt === null ? null : toStringOrNull(summary.lastPostAt);
  const lastPublishedAt =
    summary.lastPublishedAt === null
      ? null
      : toStringOrNull(summary.lastPublishedAt);

  if (
    postCount === null ||
    publishedCount === null ||
    draftCount === null ||
    archivedCount === null ||
    aiGeneratedPostCount === null ||
    totalLikes === null ||
    totalReplies === null ||
    totalTips === null ||
    !tipJpyc ||
    !tipUsdc ||
    trackedPostCount === null ||
    impressionCount === null ||
    profileClickCount === null ||
    !engagementScore ||
    agentTotal === null ||
    agentActive === null ||
    queued === null ||
    running === null ||
    done === null ||
    failed === null ||
    typeof lastPostAt === "undefined" ||
    typeof lastPublishedAt === "undefined"
  ) {
    throw new Error("SNS_SUMMARY_RESPONSE_INVALID");
  }

  return {
    postCount,
    publishedCount,
    draftCount,
    archivedCount,
    aiGeneratedPostCount,
    totalLikes,
    totalReplies,
    totalTips,
    tipTotals: {
      JPYC: tipJpyc,
      USDC: tipUsdc,
    },
    analytics: {
      trackedPostCount,
      impressionCount,
      profileClickCount,
      engagementScore,
    },
    agents: {
      total: agentTotal,
      active: agentActive,
    },
    jobs: {
      queued,
      running,
      done,
      failed,
    },
    lastPostAt,
    lastPublishedAt,
  };
}

function parseAgent(value: unknown): SnsAiAgent | null {
  if (!isRecord(value) || !isRecord(value.counts)) return null;

  const id = toStringOrNull(value.id);
  const creatorProfileId = toStringOrNull(value.creatorProfileId);
  const name = toStringOrNull(value.name);
  const role = toStringOrNull(value.role);
  const status = toStringOrNull(value.status);
  const posts = toNumberOrNull(value.counts.posts);
  const replies = toNumberOrNull(value.counts.replies);
  const jobs = toNumberOrNull(value.counts.jobs);
  const createdAt = toStringOrNull(value.createdAt);
  const updatedAt = toStringOrNull(value.updatedAt);
  if (
    !id ||
    !creatorProfileId ||
    !name ||
    !role ||
    (role !== "POSTER" &&
      role !== "ANALYST" &&
      role !== "PROMOTER" &&
      role !== "REPLY_AGENT") ||
    !status ||
    posts === null ||
    replies === null ||
    jobs === null ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id,
    creatorProfileId,
    name,
    role,
    status,
    config: value.config,
    counts: {
      posts,
      replies,
      jobs,
    },
    createdAt,
    updatedAt,
  };
}

function parseAgentsResponse(value: unknown): SnsAiAgent[] {
  if (!isRecord(value) || value.ok !== true || !Array.isArray(value.agents)) {
    throw new Error("SNS_AGENTS_RESPONSE_INVALID");
  }

  return value.agents
    .map((item) => parseAgent(item))
    .filter((item): item is SnsAiAgent => item !== null);
}

function parseJob(value: unknown): SnsAiJob | null {
  if (!isRecord(value)) return null;

  const id = toStringOrNull(value.id);
  const creatorProfileId = toStringOrNull(value.creatorProfileId);
  const aiAgentId =
    value.aiAgentId === null ? null : toStringOrNull(value.aiAgentId);
  const postId = value.postId === null ? null : toStringOrNull(value.postId);
  const jobType = toStringOrNull(value.jobType);
  const status = toStringOrNull(value.status);
  const executionCostUsd =
    value.executionCostUsd === null
      ? null
      : toStringOrNull(value.executionCostUsd);
  const billable = toBooleanOrNull(value.billable);
  const billingStatus = toStringOrNull(value.billingStatus);
  const createdAt = toStringOrNull(value.createdAt);
  const updatedAt = toStringOrNull(value.updatedAt);
  const aiAgentRaw =
    value.aiAgent === null
      ? null
      : isRecord(value.aiAgent)
      ? {
          id: toStringOrNull(value.aiAgent.id),
          name: toStringOrNull(value.aiAgent.name),
          role: toStringOrNull(value.aiAgent.role),
          status: toStringOrNull(value.aiAgent.status),
        }
      : undefined;
  const postRaw =
    value.post === null
      ? null
      : isRecord(value.post)
      ? {
          id: toStringOrNull(value.post.id),
          preview: toStringOrNull(value.post.preview),
          status: toStringOrNull(value.post.status),
          visibility: toStringOrNull(value.post.visibility),
        }
      : undefined;

  if (
    !id ||
    !creatorProfileId ||
    typeof aiAgentId === "undefined" ||
    typeof postId === "undefined" ||
    !jobType ||
    (jobType !== "AUTO_POST" &&
      jobType !== "AUTO_REPLY" &&
      jobType !== "ANALYZE" &&
      jobType !== "PROMOTE") ||
    !status ||
    typeof executionCostUsd === "undefined" ||
    billable === null ||
    !billingStatus ||
    !createdAt ||
    !updatedAt ||
    typeof aiAgentRaw === "undefined" ||
    typeof postRaw === "undefined"
  ) {
    return null;
  }

  let aiAgent: SnsAiJob["aiAgent"] = null;
  if (aiAgentRaw) {
    const aiAgentIdValue = aiAgentRaw.id;
    const aiAgentNameValue = aiAgentRaw.name;
    const aiAgentRoleValue = aiAgentRaw.role;
    const aiAgentStatusValue = aiAgentRaw.status;
    if (
      !aiAgentIdValue ||
      !aiAgentNameValue ||
      !aiAgentRoleValue ||
      !aiAgentStatusValue
    ) {
      return null;
    }
    aiAgent = {
      id: aiAgentIdValue!,
      name: aiAgentNameValue!,
      role: aiAgentRoleValue!,
      status: aiAgentStatusValue!,
    };
  }

  let post: SnsAiJob["post"] = null;
  if (postRaw) {
    const postRecordId = postRaw.id;
    const postPreviewValue = postRaw.preview;
    const postStatusValue = postRaw.status;
    const postVisibilityValue = postRaw.visibility;
    if (
      !postRecordId ||
      !postPreviewValue ||
      !postStatusValue ||
      !postVisibilityValue
    ) {
      return null;
    }
    post = {
      id: postRecordId!,
      preview: postPreviewValue!,
      status: postStatusValue!,
      visibility: postVisibilityValue!,
    };
  }

  return {
    id,
    creatorProfileId,
    aiAgentId,
    postId,
    jobType,
    status,
    input: value.input,
    output: value.output,
    executionCostUsd,
    billable,
    billingStatus,
    createdAt,
    updatedAt,
    aiAgent,
    post,
  };
}

function parseJobsResponse(value: unknown): SnsAiJob[] {
  if (!isRecord(value) || value.ok !== true || !Array.isArray(value.jobs)) {
    throw new Error("SNS_JOBS_RESPONSE_INVALID");
  }

  return value.jobs
    .map((item) => parseJob(item))
    .filter((item): item is SnsAiJob => item !== null);
}

async function requestJson(args: {
  url: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}): Promise<{ res: Response; json: unknown }> {
  const res = await fetch(args.url, {
    method: args.method ?? "GET",
    headers: args.body ? { "Content-Type": "application/json" } : undefined,
    body: args.body === undefined ? undefined : JSON.stringify(args.body),
    cache: "no-store",
  });
  const json: unknown = await res.json().catch(() => null);
  return { res, json };
}

function toApiError(json: unknown, fallback: string): string {
  return getErrorFromApiJson(json) ?? fallback;
}

export async function createSnsPost(args: {
  address: Address;
  body: string;
  mediaType?: "IMAGE" | "VIDEO" | "LINK" | null;
  mediaUrl?: string | null;
  projectId?: string | null;
}): Promise<{ ok: true; post: SnsManagedPost } | { ok: false; error: string }> {
  const { res, json } = await requestJson({
    url: "/api/posts",
    method: "POST",
    body: {
      address: args.address,
      body: args.body,
      ...(args.mediaType ? { mediaType: args.mediaType } : {}),
      ...(typeof args.mediaUrl !== "undefined" ? { mediaUrl: args.mediaUrl } : {}),
      ...(typeof args.projectId !== "undefined" ? { projectId: args.projectId } : {}),
    },
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, "POST_CREATE_FAILED"),
    };
  }

  if (!isRecord(json) || json.ok !== true) {
    return { ok: false, error: "POST_CREATE_RESPONSE_INVALID" };
  }

  const post = parseManagedPost(json.post);
  if (!post) return { ok: false, error: "POST_CREATE_RESPONSE_INVALID" };
  return { ok: true, post };
}

export async function fetchMySnsPosts(args: {
  address: Address;
  cursor?: string | null;
  limit?: number;
}): Promise<
  { ok: true; data: SnsManagedPostsResponse } | { ok: false; error: string }
> {
  const params = new URLSearchParams({ address: args.address });
  if (args.cursor) params.set("cursor", args.cursor);
  if (typeof args.limit === "number") params.set("limit", String(args.limit));

  const { res, json } = await requestJson({
    url: `/api/mypage/sns/posts?${params.toString()}`,
  });

  if (!res.ok) {
    return { ok: false, error: toApiError(json, "SNS_POSTS_FETCH_FAILED") };
  }

  try {
    return { ok: true, data: parseManagedPostsResponse(json) };
  } catch {
    return { ok: false, error: "SNS_POSTS_RESPONSE_INVALID" };
  }
}

export async function updateMySnsPostStatus(args: {
  address: Address;
  postId: string;
  status: "PUBLISHED" | "ARCHIVED";
}): Promise<{ ok: true; post: SnsManagedPost } | { ok: false; error: string }> {
  const { res, json } = await requestJson({
    url: `/api/mypage/sns/posts/${encodeURIComponent(args.postId)}`,
    method: "PATCH",
    body: {
      address: args.address,
      status: args.status,
    },
  });

  if (!res.ok) {
    return { ok: false, error: toApiError(json, "SNS_POST_STATUS_UPDATE_FAILED") };
  }

  if (!isRecord(json) || json.ok !== true) {
    return { ok: false, error: "SNS_POST_STATUS_RESPONSE_INVALID" };
  }

  const post = parseManagedPost(json.post);
  if (!post) return { ok: false, error: "SNS_POST_STATUS_RESPONSE_INVALID" };
  return { ok: true, post };
}

export async function updateMySnsPostContent(args: {
  address: Address;
  postId: string;
  body: string;
  mediaType: "IMAGE" | "VIDEO" | "LINK" | null;
  mediaUrl: string | null;
  projectId: string | null;
}): Promise<{ ok: true; post: SnsManagedPost } | { ok: false; error: string }> {
  const { res, json } = await requestJson({
    url: `/api/mypage/sns/posts/${encodeURIComponent(args.postId)}`,
    method: "PATCH",
    body: {
      address: args.address,
      body: args.body,
      mediaType: args.mediaType,
      mediaUrl: args.mediaUrl,
      projectId: args.projectId,
    },
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, "SNS_POST_CONTENT_UPDATE_FAILED"),
    };
  }

  if (!isRecord(json) || json.ok !== true) {
    return { ok: false, error: "SNS_POST_CONTENT_RESPONSE_INVALID" };
  }

  const post = parseManagedPost(json.post);
  if (!post) return { ok: false, error: "SNS_POST_CONTENT_RESPONSE_INVALID" };
  return { ok: true, post };
}

export async function deleteMySnsPost(args: {
  address: Address;
  postId: string;
}): Promise<{ ok: true; deletedPostId: string } | { ok: false; error: string }> {
  const { res, json } = await requestJson({
    url: `/api/mypage/sns/posts/${encodeURIComponent(args.postId)}`,
    method: "DELETE",
    body: {
      address: args.address,
    },
  });

  if (!res.ok) {
    return { ok: false, error: toApiError(json, "SNS_POST_DELETE_FAILED") };
  }

  if (!isRecord(json) || json.ok !== true || typeof json.deletedPostId !== "string") {
    return { ok: false, error: "SNS_POST_DELETE_RESPONSE_INVALID" };
  }

  return { ok: true, deletedPostId: json.deletedPostId };
}

export async function fetchSnsAnalyticsSummary(args: {
  address: Address;
}): Promise<{ ok: true; summary: SnsAnalyticsSummary } | { ok: false; error: string }> {
  const params = new URLSearchParams({ address: args.address });
  const { res, json } = await requestJson({
    url: `/api/mypage/sns/summary?${params.toString()}`,
  });

  if (!res.ok) {
    return { ok: false, error: toApiError(json, "SNS_SUMMARY_FETCH_FAILED") };
  }

  try {
    return { ok: true, summary: parseSummary(json) };
  } catch {
    return { ok: false, error: "SNS_SUMMARY_RESPONSE_INVALID" };
  }
}

export async function fetchAiAgents(args: {
  address: Address;
}): Promise<{ ok: true; agents: SnsAiAgent[] } | { ok: false; error: string }> {
  const params = new URLSearchParams({ address: args.address });
  const { res, json } = await requestJson({
    url: `/api/mypage/sns/agents?${params.toString()}`,
  });

  if (!res.ok) {
    return { ok: false, error: toApiError(json, "SNS_AGENTS_FETCH_FAILED") };
  }

  try {
    return { ok: true, agents: parseAgentsResponse(json) };
  } catch {
    return { ok: false, error: "SNS_AGENTS_RESPONSE_INVALID" };
  }
}

export async function createAiAgent(args: {
  address: Address;
  name: string;
  role: SnsAiAgent["role"];
}): Promise<{ ok: true; agent: SnsAiAgent } | { ok: false; error: string }> {
  const { res, json } = await requestJson({
    url: "/api/mypage/sns/agents",
    method: "POST",
    body: {
      address: args.address,
      name: args.name,
      role: args.role,
    },
  });

  if (!res.ok) {
    return { ok: false, error: toApiError(json, "SNS_AGENT_CREATE_FAILED") };
  }

  if (!isRecord(json) || json.ok !== true) {
    return { ok: false, error: "SNS_AGENT_CREATE_RESPONSE_INVALID" };
  }

  const agent = parseAgent(json.agent);
  if (!agent) return { ok: false, error: "SNS_AGENT_CREATE_RESPONSE_INVALID" };
  return { ok: true, agent };
}

export async function fetchAiJobs(args: {
  address: Address;
}): Promise<{ ok: true; jobs: SnsAiJob[] } | { ok: false; error: string }> {
  const params = new URLSearchParams({ address: args.address });
  const { res, json } = await requestJson({
    url: `/api/mypage/sns/jobs?${params.toString()}`,
  });

  if (!res.ok) {
    return { ok: false, error: toApiError(json, "SNS_JOBS_FETCH_FAILED") };
  }

  try {
    return { ok: true, jobs: parseJobsResponse(json) };
  } catch {
    return { ok: false, error: "SNS_JOBS_RESPONSE_INVALID" };
  }
}

export async function createAiJob(args: {
  address: Address;
  jobType: SnsAiJob["jobType"];
  aiAgentId?: string | null;
}): Promise<{ ok: true; job: SnsAiJob } | { ok: false; error: string }> {
  const { res, json } = await requestJson({
    url: "/api/mypage/sns/jobs",
    method: "POST",
    body: {
      address: args.address,
      jobType: args.jobType,
      ...(typeof args.aiAgentId !== "undefined"
        ? { aiAgentId: args.aiAgentId }
        : {}),
    },
  });

  if (!res.ok) {
    return { ok: false, error: toApiError(json, "SNS_JOB_CREATE_FAILED") };
  }

  if (!isRecord(json) || json.ok !== true) {
    return { ok: false, error: "SNS_JOB_CREATE_RESPONSE_INVALID" };
  }

  const job = parseJob(json.job);
  if (!job) return { ok: false, error: "SNS_JOB_CREATE_RESPONSE_INVALID" };
  return { ok: true, job };
}
