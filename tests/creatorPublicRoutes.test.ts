import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchCreatorPublicDtoByUsername,
  fetchPublicCreatorByUsername,
  createCreatorProfileLookupResult,
  type PublicErr,
  type PublicOk,
} from "../lib/publicCreatorApi";

const creatorRecord = createCreatorProfileLookupResult({
  creator: {
    username: "kazu",
    displayName: "Kazu",
    profile: "creator profile",
    avatarUrl: "/avatars/kazu.jpg",
    qrcode: null,
    url: "https://example.com",
    themeColor: "#005bbb",
    creatorType: "MUSICIAN",
  },
  profile: {
    id: "1",
    username: "kazu",
    walletAddress: null,
    activeProjectIdJpyc: "10",
    activeProjectIdUsdc: "20",
  },
});

const projectData = {
  projectId: "10",
  projectIdsByCurrency: {
    JPYC: "10",
    USDC: "20",
  },
  latestProjectSummary: {
    projectId: "10",
    title: "Pinned project",
    currency: "JPYC" as const,
    targetAmount: 1000,
    confirmedAmount: 250,
    progressPct: 25,
    achievedAt: null,
  },
  activeSummary: null,
  publicSummary: null,
  summariesByCurrency: {
    JPYC: null,
    USDC: null,
  },
};

function assertPublicOkResponse(body: PublicOk | PublicErr): asserts body is PublicOk {
  assert.equal(body.ok, true);
}

test("fetchCreatorPublicDtoByUsername returns the normalized creator DTO", async () => {
  const response = await fetchCreatorPublicDtoByUsername("kazu", {
    getCreatorProfileByUsername: async (username) =>
      username === "kazu" ? creatorRecord : null,
    resolvePublicCreatorProjectData: async () => projectData,
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    username: "kazu",
    displayName: "Kazu",
    profile: "creator profile",
    avatarUrl: "/avatars/kazu.jpg",
    qrcode: null,
    url: "https://example.com",
    themeColor: "#005bbb",
    creatorType: "MUSICIAN",
    projectId: "10",
    projectIdsByCurrency: {
      JPYC: "10",
      USDC: "20",
    },
    latestProjectSummary: {
      projectId: "10",
      title: "Pinned project",
      currency: "JPYC",
      targetAmount: 1000,
      confirmedAmount: 250,
      progressPct: 25,
      achievedAt: null,
    },
  });
});

test("fetchCreatorPublicDtoByUsername returns 404 when the creator is missing", async () => {
  const response = await fetchCreatorPublicDtoByUsername("missing", {
    getCreatorProfileByUsername: async () => null,
    resolvePublicCreatorProjectData: async () => projectData,
  });

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { error: "CREATOR_NOT_FOUND" });
});

test("fetchPublicCreatorByUsername returns the public creator envelope without legacy aliases", async () => {
  const response = await fetchPublicCreatorByUsername("kazu", {
    getCreatorProfileByUsername: async (username) =>
      username === "kazu" ? creatorRecord : null,
    resolvePublicCreatorProjectData: async () => projectData,
  });

  assert.equal(response.status, 200);
  assertPublicOkResponse(response.body);

  assert.deepEqual(response.body.projectIdsByCurrency, {
    JPYC: "10",
    USDC: "20",
  });
  assert.equal(response.body.projectId, "10");
  assert.equal(response.body.creator.profile, "creator profile");
  assert.equal(response.body.creator.url, "https://example.com");
  assert.equal("profileText" in response.body.creator, false);
  assert.equal("externalUrl" in response.body.creator, false);
  assert.equal("qrcodeUrl" in response.body.creator, false);
  assert.equal("activeProjectId" in response.body, false);
});

test("fetchPublicCreatorByUsername returns 500 details when the public creator read fails", async () => {
  const response = await fetchPublicCreatorByUsername("kazu", {
    getCreatorProfileByUsername: async () => {
      throw new Error("boom");
    },
    resolvePublicCreatorProjectData: async () => projectData,
  });

  assert.equal(response.status, 500);
  assert.deepEqual(response.body, {
    ok: false,
    error: "PUBLIC_CREATOR_FETCH_FAILED",
    detail: "boom",
  });
});
