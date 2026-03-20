import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";

import {
  fetchCreatorFollowSummaryByUsername,
  mutateCreatorFollowByUsername,
} from "../lib/followApi";

test("fetchCreatorFollowSummaryByUsername returns the ok envelope", async () => {
  const response = await fetchCreatorFollowSummaryByUsername({
    username: "kazu",
    viewerAddress: "0xabc",
    deps: {
      getCreatorFollowSummary: async ({ username, viewerAddress }) => {
        assert.equal(username, "kazu");
        assert.equal(viewerAddress, "0xabc");
        return {
          creator: {
            id: "1",
            username: "kazu",
            displayName: "Kazu",
            avatarUrl: "/avatars/kazu.jpg",
          },
          counts: {
            followers: 12,
            following: 3,
          },
          viewer: {
            hasUser: true,
            isOwner: false,
            follows: true,
          },
          followers: [
            {
              id: "2",
              username: "mika",
              displayName: "Mika",
              avatarUrl: null,
            },
          ],
        };
      },
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    ok: true,
    creator: {
      id: "1",
      username: "kazu",
      displayName: "Kazu",
      avatarUrl: "/avatars/kazu.jpg",
    },
    counts: {
      followers: 12,
      following: 3,
    },
    viewer: {
      hasUser: true,
      isOwner: false,
      follows: true,
    },
    followers: [
      {
        id: "2",
        username: "mika",
        displayName: "Mika",
        avatarUrl: null,
      },
    ],
  });
});

test("fetchCreatorFollowSummaryByUsername returns 404 when the creator is missing", async () => {
  const response = await fetchCreatorFollowSummaryByUsername({
    username: "missing",
    viewerAddress: null,
    deps: {
      getCreatorFollowSummary: async () => null,
    },
  });

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, {
    ok: false,
    error: "CREATOR_NOT_FOUND",
  });
});

test("fetchCreatorFollowSummaryByUsername returns 500 on lookup failures", async () => {
  const response = await fetchCreatorFollowSummaryByUsername({
    username: "kazu",
    viewerAddress: null,
    deps: {
      getCreatorFollowSummary: async () => {
        throw new Error("boom");
      },
    },
  });

  assert.equal(response.status, 500);
  assert.deepEqual(response.body, {
    ok: false,
    error: "CREATOR_FOLLOW_GET_FAILED",
  });
});

test("mutateCreatorFollowByUsername returns 400 when the viewer tries to follow self", async () => {
  const response = await mutateCreatorFollowByUsername({
    action: "follow",
    username: "kazu",
    viewerAddress: "0xabc",
    deps: {
      findTargetCreator: async () => ({
        id: 1n,
        username: "kazu",
        displayName: "Kazu",
        avatarUrl: null,
      }),
      findCreatorByWalletAddress: async () => ({
        id: 1n,
        username: "kazu",
        displayName: "Kazu",
        avatarUrl: null,
        walletAddress: "0xabc",
      }),
      getCreatorFollowSummary: async () => null,
      createCreatorFollow: async () => undefined,
      deleteCreatorFollow: async () => undefined,
    },
  });

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    ok: false,
    error: "CANNOT_FOLLOW_SELF",
  });
});

test("mutateCreatorFollowByUsername treats duplicate follow as idempotent and returns the refreshed summary", async () => {
  const response = await mutateCreatorFollowByUsername({
    action: "follow",
    username: "kazu",
    viewerAddress: "0xabc",
    deps: {
      findTargetCreator: async () => ({
        id: 1n,
        username: "kazu",
        displayName: "Kazu",
        avatarUrl: null,
      }),
      findCreatorByWalletAddress: async () => ({
        id: 2n,
        username: "mika",
        displayName: "Mika",
        avatarUrl: null,
        walletAddress: "0xabc",
      }),
      createCreatorFollow: async () => {
        throw new Prisma.PrismaClientKnownRequestError("duplicate", {
          code: "P2002",
          clientVersion: "5.22.0",
        });
      },
      deleteCreatorFollow: async () => undefined,
      getCreatorFollowSummary: async () => ({
        creator: {
          id: "1",
          username: "kazu",
          displayName: "Kazu",
          avatarUrl: null,
        },
        counts: {
          followers: 13,
          following: 4,
        },
        viewer: {
          hasUser: true,
          isOwner: false,
          follows: true,
        },
        followers: [],
      }),
    },
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  if (!response.body.ok) {
    throw new Error("expected follow mutation response");
  }
  assert.equal(response.body.viewer.follows, true);
});

test("mutateCreatorFollowByUsername returns 404 when the viewer is not registered", async () => {
  const response = await mutateCreatorFollowByUsername({
    action: "follow",
    username: "kazu",
    viewerAddress: "0xabc",
    deps: {
      findTargetCreator: async () => ({
        id: 1n,
        username: "kazu",
        displayName: "Kazu",
        avatarUrl: null,
      }),
      findCreatorByWalletAddress: async () => null,
      getCreatorFollowSummary: async () => null,
      createCreatorFollow: async () => undefined,
      deleteCreatorFollow: async () => undefined,
    },
  });

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, {
    ok: false,
    error: "VIEWER_NOT_REGISTERED",
  });
});

test("mutateCreatorFollowByUsername returns the refreshed summary after unfollow", async () => {
  let deleted = false;
  const response = await mutateCreatorFollowByUsername({
    action: "unfollow",
    username: "kazu",
    viewerAddress: "0xabc",
    deps: {
      findTargetCreator: async () => ({
        id: 1n,
        username: "kazu",
        displayName: "Kazu",
        avatarUrl: null,
      }),
      findCreatorByWalletAddress: async () => ({
        id: 2n,
        username: "mika",
        displayName: "Mika",
        avatarUrl: null,
        walletAddress: "0xabc",
      }),
      createCreatorFollow: async () => undefined,
      deleteCreatorFollow: async () => {
        deleted = true;
      },
      getCreatorFollowSummary: async () => ({
        creator: {
          id: "1",
          username: "kazu",
          displayName: "Kazu",
          avatarUrl: null,
        },
        counts: {
          followers: 10,
          following: 4,
        },
        viewer: {
          hasUser: true,
          isOwner: false,
          follows: false,
        },
        followers: [],
      }),
    },
  });

  assert.equal(deleted, true);
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  if (!response.body.ok) {
    throw new Error("expected unfollow mutation response");
  }
  assert.equal(response.body.viewer.follows, false);
});

test("mutateCreatorFollowByUsername returns 500 when follow persistence fails unexpectedly", async () => {
  const response = await mutateCreatorFollowByUsername({
    action: "follow",
    username: "kazu",
    viewerAddress: "0xabc",
    deps: {
      findTargetCreator: async () => ({
        id: 1n,
        username: "kazu",
        displayName: "Kazu",
        avatarUrl: null,
      }),
      findCreatorByWalletAddress: async () => ({
        id: 2n,
        username: "mika",
        displayName: "Mika",
        avatarUrl: null,
        walletAddress: "0xabc",
      }),
      createCreatorFollow: async () => {
        throw new Error("boom");
      },
      deleteCreatorFollow: async () => undefined,
      getCreatorFollowSummary: async () => null,
    },
  });

  assert.equal(response.status, 500);
  assert.deepEqual(response.body, {
    ok: false,
    error: "CREATOR_FOLLOW_POST_FAILED",
  });
});
