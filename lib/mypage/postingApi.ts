import {
  createManagedPostingApi,
  createPostingPost as createPostingPostRequest,
  type PostingAiAgent,
  type PostingAiJob,
  type PostingAnalyticsSummary,
  type PostingManagedPost,
  type PostingManagedPostsResponse,
  type PostingProjectOption,
} from "@/lib/mypage/postingManagedApi";

export const POSTING_API_BASE_PATH = "/api/mypage/posting" as const;

const postingManagedApi = createManagedPostingApi(POSTING_API_BASE_PATH);

export type {
  PostingAiAgent,
  PostingAiJob,
  PostingAnalyticsSummary,
  PostingManagedPost,
  PostingManagedPostsResponse,
  PostingProjectOption,
};

export const createPostingPost = createPostingPostRequest;
export const fetchMyPostingPosts = postingManagedApi.fetchMyPosts;
export const updateMyPostingPostStatus = postingManagedApi.updateMyPostStatus;
export const updateMyPostingPostContent = postingManagedApi.updateMyPostContent;
export const deleteMyPostingPost = postingManagedApi.deleteMyPost;
export const fetchPostingAnalyticsSummary =
  postingManagedApi.fetchAnalyticsSummary;
export const fetchPostingAiAgents = postingManagedApi.fetchAiAgents;
export const createPostingAiAgent = postingManagedApi.createAiAgent;
export const fetchPostingAiJobs = postingManagedApi.fetchAiJobs;
export const createPostingAiJob = postingManagedApi.createAiJob;
