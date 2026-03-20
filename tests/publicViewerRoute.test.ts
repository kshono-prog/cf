import assert from "node:assert/strict";
import test from "node:test";

import { fetchPublicViewerByAddress } from "../lib/publicViewerApi";

test("fetchPublicViewerByAddress returns an empty payload when address is missing", async () => {
  const response = await fetchPublicViewerByAddress(null, {
    getMeStatusByAddress: async () => {
      throw new Error("should not be called");
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    ok: true,
    hasUser: false,
    hasCreator: false,
    user: null,
    creator: null,
    projectId: null,
    projectIdsByCurrency: {
      JPYC: null,
      USDC: null,
    },
  });
});

test("fetchPublicViewerByAddress normalizes the mypage me payload", async () => {
  const response = await fetchPublicViewerByAddress(" 0xabc ", {
    getMeStatusByAddress: async (address) => {
      assert.equal(address, "0xabc");
      return {
        hasUser: true,
        hasCreator: true,
        user: {
          username: "kazu",
          displayName: "Kazu",
          profile: "profile",
        },
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
        projectId: "project-1",
        projectIdsByCurrency: {
          JPYC: "project-1",
          USDC: null,
        },
      };
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    ok: true,
    hasUser: true,
    hasCreator: true,
    user: {
      username: "kazu",
      displayName: "Kazu",
      profile: "profile",
    },
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
    projectId: "project-1",
    projectIdsByCurrency: {
      JPYC: "project-1",
      USDC: null,
    },
  });
});

test("fetchPublicViewerByAddress returns 500 when the lookup fails", async () => {
  const response = await fetchPublicViewerByAddress("0xabc", {
    getMeStatusByAddress: async () => {
      throw new Error("boom");
    },
  });

  assert.equal(response.status, 500);
  assert.deepEqual(response.body, {
    ok: false,
    error: "PUBLIC_VIEWER_GET_FAILED",
  });
});
