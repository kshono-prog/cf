import assert from "node:assert/strict";
import test from "node:test";

import { Prisma } from "@prisma/client";

import { fetchNotificationsByOwnerAddress } from "../lib/notificationsApi";

test("fetchNotificationsByOwnerAddress merges and sorts reply/like/support items", async () => {
  const response = await fetchNotificationsByOwnerAddress("0xabc", {
    findCreatorByWalletAddress: async (address) => {
      assert.equal(address, "0xabc");
      return {
        id: 1n,
        username: "kazu",
        displayName: "Kazu",
        avatarUrl: "/avatars/kazu.jpg",
        walletAddress: "0xabc",
      };
    },
    findReplyNotifications: async () => [
      {
        id: "reply-1",
        body: "reply body",
        createdAt: new Date("2026-03-20T10:00:00.000Z"),
        creatorProfile: {
          username: "mika",
          displayName: "Mika",
          avatarUrl: null,
        },
        post: {
          creatorProfile: {
            username: "kazu",
          },
        },
      },
    ],
    findLikeNotifications: async () => [
      {
        id: "like-1",
        createdAt: new Date("2026-03-20T11:00:00.000Z"),
        creatorProfile: {
          username: "sora",
          displayName: "Sora",
          avatarUrl: "/avatars/sora.jpg",
        },
        post: {
          body: "liked post body",
          creatorProfile: {
            username: "kazu",
          },
        },
      },
    ],
    findSupportNotifications: async () => [
      {
        id: "support-1",
        currency: "JPYC",
        amountDecimal: new Prisma.Decimal("12.5"),
        amountRaw: new Prisma.Decimal("1250"),
        decimals: 2,
        fromAddress: "0x1234567890abcdef1234567890abcdef12345678",
        createdAt: new Date("2026-03-20T09:00:00.000Z"),
        confirmedAt: new Date("2026-03-20T12:00:00.000Z"),
        project: {
          creatorProfile: {
            username: "kazu",
          },
        },
        postTips: [],
      },
    ],
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  if (!response.body.ok) {
    throw new Error("expected notifications response");
  }

  assert.deepEqual(
    response.body.items.map((item) => item.kind),
    ["SUPPORT", "LIKE", "REPLY"]
  );
  assert.deepEqual(response.body.items[0], {
    id: "support-support-1",
    kind: "SUPPORT",
    createdAt: "2026-03-20T12:00:00.000Z",
    href: "/kazu#posts",
    title: "応援が届きました",
    body: "公開ページへの応援です。",
    actor: null,
    meta: "0x1234…5678 から 12.5 JPYC",
  });
});

test("fetchNotificationsByOwnerAddress returns 404 when the creator is missing", async () => {
  const response = await fetchNotificationsByOwnerAddress("0xabc", {
    findCreatorByWalletAddress: async () => null,
    findReplyNotifications: async () => [],
    findLikeNotifications: async () => [],
    findSupportNotifications: async () => [],
  });

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, {
    ok: false,
    error: "CREATOR_NOT_FOUND",
  });
});

test("fetchNotificationsByOwnerAddress returns 500 when notification reads fail", async () => {
  const response = await fetchNotificationsByOwnerAddress("0xabc", {
    findCreatorByWalletAddress: async () => ({
      id: 1n,
      username: "kazu",
      displayName: "Kazu",
      avatarUrl: null,
      walletAddress: "0xabc",
    }),
    findReplyNotifications: async () => {
      throw new Error("boom");
    },
    findLikeNotifications: async () => [],
    findSupportNotifications: async () => [],
  });

  assert.equal(response.status, 500);
  assert.deepEqual(response.body, {
    ok: false,
    error: "NOTIFICATIONS_GET_FAILED",
  });
});
