import assert from "node:assert/strict";
import test from "node:test";

import {
  parseFollowSummaryResponse,
  parseNotificationsResponse,
} from "../lib/communityApiParsers";

test("parseFollowSummaryResponse reads the follow summary envelope", () => {
  const parsed = parseFollowSummaryResponse({
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

  assert.deepEqual(parsed, {
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

test("parseFollowSummaryResponse rejects an invalid follow summary envelope", () => {
  assert.throws(
    () =>
      parseFollowSummaryResponse({
        ok: true,
        counts: {},
      }),
    /FOLLOW_SUMMARY_INVALID/
  );
});

test("parseNotificationsResponse keeps only valid notification items", () => {
  const parsed = parseNotificationsResponse({
    ok: true,
    items: [
      {
        id: "reply-1",
        kind: "REPLY",
        createdAt: "2026-03-20T10:00:00.000Z",
        href: "/kazu#posts",
        title: "返信がありました",
        body: "reply body",
        actor: {
          username: "mika",
          displayName: "Mika",
          avatarUrl: null,
        },
        meta: null,
      },
      {
        id: "broken",
        kind: "UNKNOWN",
        createdAt: "2026-03-20T10:00:00.000Z",
        href: "/kazu#posts",
        title: "broken",
        body: "broken",
        actor: null,
        meta: null,
      },
    ],
  });

  assert.deepEqual(parsed, [
    {
      id: "reply-1",
      kind: "REPLY",
      createdAt: "2026-03-20T10:00:00.000Z",
      href: "/kazu#posts",
      title: "返信がありました",
      body: "reply body",
      actor: {
        username: "mika",
        displayName: "Mika",
        avatarUrl: null,
      },
      meta: null,
    },
  ]);
});

test("parseNotificationsResponse returns an empty list for invalid payloads", () => {
  assert.deepEqual(parseNotificationsResponse(null), []);
  assert.deepEqual(parseNotificationsResponse({ ok: false }), []);
});
