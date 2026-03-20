import { isRecord } from "@/lib/mypage/helpers";
import {
  toStringOrNull,
  toNumberOrNull,
  toBooleanOrNull,
} from "@/lib/mypage/snsApiShared";

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

export function parseAgent(value: unknown): SnsAiAgent | null {
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

export function parseAgentsResponse(value: unknown): SnsAiAgent[] {
  if (!isRecord(value) || value.ok !== true || !Array.isArray(value.agents)) {
    throw new Error("SNS_AGENTS_RESPONSE_INVALID");
  }

  return value.agents
    .map((item) => parseAgent(item))
    .filter((item): item is SnsAiAgent => item !== null);
}

export function parseJob(value: unknown): SnsAiJob | null {
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

export function parseJobsResponse(value: unknown): SnsAiJob[] {
  if (!isRecord(value) || value.ok !== true || !Array.isArray(value.jobs)) {
    throw new Error("SNS_JOBS_RESPONSE_INVALID");
  }

  return value.jobs
    .map((item) => parseJob(item))
    .filter((item): item is SnsAiJob => item !== null);
}
