import type { SnsAiAgent, SnsAiJob } from "@/lib/mypage/snsAgentJobApi";
import {
  createManagedPostingApi,
  createSnsPost,
  type ManagedPostingApiBasePath,
  type SnsAnalyticsSummary,
  type SnsManagedPost,
  type SnsManagedPostsResponse,
  type SnsProjectOption,
} from "@/lib/mypage/snsPostsApi";

export { createManagedPostingApi, type ManagedPostingApiBasePath };

export type PostingProjectOption = SnsProjectOption;
export type PostingManagedPost = SnsManagedPost;
export type PostingManagedPostsResponse = SnsManagedPostsResponse;
export type PostingAnalyticsSummary = SnsAnalyticsSummary;
export type PostingAiAgent = SnsAiAgent;
export type PostingAiJob = SnsAiJob;

export const createPostingPost = createSnsPost;
