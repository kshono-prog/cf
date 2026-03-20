// Barrel re-exporter — implementation has been split by domain.
// All existing import sites continue to work without changes.

export type {
  SnsProjectOption,
  SnsManagedPost,
  SnsManagedPostsResponse,
  SnsAnalyticsSummary,
  ManagedPostingApiBasePath,
} from "@/lib/mypage/snsPostsApi";

export {
  SNS_API_BASE_PATH,
  createManagedPostingApi,
  createSnsPost,
} from "@/lib/mypage/snsPostsApi";

export type {
  SnsAiAgent,
  SnsAiJob,
} from "@/lib/mypage/snsAgentJobApi";

// Convenience bindings created from the default SNS API instance.
// These are re-created here (matching the original pattern) so that
// consumers importing them by name continue to work.
import {
  SNS_API_BASE_PATH,
  createManagedPostingApi,
} from "@/lib/mypage/snsPostsApi";

const snsManagedPostingApi = createManagedPostingApi(SNS_API_BASE_PATH);

export const fetchMySnsPosts = snsManagedPostingApi.fetchMyPosts;
export const updateMySnsPostStatus = snsManagedPostingApi.updateMyPostStatus;
export const updateMySnsPostContent = snsManagedPostingApi.updateMyPostContent;
export const deleteMySnsPost = snsManagedPostingApi.deleteMyPost;
export const fetchSnsAnalyticsSummary =
  snsManagedPostingApi.fetchAnalyticsSummary;
export const fetchAiAgents = snsManagedPostingApi.fetchAiAgents;
export const createAiAgent = snsManagedPostingApi.createAiAgent;
export const fetchAiJobs = snsManagedPostingApi.fetchAiJobs;
export const createAiJob = snsManagedPostingApi.createAiJob;
