import assert from "node:assert/strict";
import test from "node:test";

import {
  POSTING_API_BASE_PATH,
  createPostingAiAgent,
  createPostingAiJob,
  createPostingPost,
  deleteMyPostingPost,
  fetchMyPostingPosts,
  fetchPostingAiAgents,
  fetchPostingAiJobs,
  fetchPostingAnalyticsSummary,
  updateMyPostingPostContent,
  updateMyPostingPostStatus,
} from "../lib/mypage/postingApi";
import {
  createManagedPostingApi,
  createPostingPost as createPostingPostCompat,
} from "../lib/mypage/postingManagedApi";
import {
  SNS_API_BASE_PATH,
  createAiAgent,
  createAiJob,
  createSnsPost,
  deleteMySnsPost,
  fetchAiAgents,
  fetchAiJobs,
  fetchMySnsPosts,
  fetchSnsAnalyticsSummary,
  updateMySnsPostContent,
  updateMySnsPostStatus,
} from "../lib/mypage/snsApi";

test("posting API keeps a distinct base path while reusing the same surface", () => {
  assert.equal(POSTING_API_BASE_PATH, "/api/mypage/posting");
  assert.equal(SNS_API_BASE_PATH, "/api/mypage/sns");
  assert.notEqual(POSTING_API_BASE_PATH, SNS_API_BASE_PATH);

  assert.equal(createPostingPost, createSnsPost);
  assert.equal(createPostingPostCompat, createSnsPost);
  assert.equal(typeof createManagedPostingApi, "function");
  assert.equal(typeof fetchMyPostingPosts, "function");
  assert.equal(typeof updateMyPostingPostStatus, "function");
  assert.equal(typeof updateMyPostingPostContent, "function");
  assert.equal(typeof deleteMyPostingPost, "function");
  assert.equal(typeof fetchPostingAnalyticsSummary, "function");
  assert.equal(typeof fetchPostingAiAgents, "function");
  assert.equal(typeof createPostingAiAgent, "function");
  assert.equal(typeof fetchPostingAiJobs, "function");
  assert.equal(typeof createPostingAiJob, "function");

  assert.equal(typeof fetchMySnsPosts, "function");
  assert.equal(typeof updateMySnsPostStatus, "function");
  assert.equal(typeof updateMySnsPostContent, "function");
  assert.equal(typeof deleteMySnsPost, "function");
  assert.equal(typeof fetchSnsAnalyticsSummary, "function");
  assert.equal(typeof fetchAiAgents, "function");
  assert.equal(typeof createAiAgent, "function");
  assert.equal(typeof fetchAiJobs, "function");
  assert.equal(typeof createAiJob, "function");
});
