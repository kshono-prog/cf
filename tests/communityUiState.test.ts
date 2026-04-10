import assert from "node:assert/strict";
import test from "node:test";

import {
  mapFollowActionError,
  resolveCommunityViewerLinks,
  resolveCommunityViewerMode,
} from "../lib/communityUiState";

test("mapFollowActionError returns friendly follow messages", () => {
  assert.equal(
    mapFollowActionError("ADDRESS_REQUIRED"),
    "続けるにはウォレット接続が必要です。"
  );
  assert.equal(
    mapFollowActionError("VIEWER_NOT_REGISTERED"),
    "続けるには先にユーザー登録をしてください。"
  );
  assert.equal(
    mapFollowActionError("CANNOT_FOLLOW_SELF"),
    "自分自身はフォローできません。"
  );
  assert.equal(
    mapFollowActionError("UNKNOWN_ERROR"),
    "フォローの更新に失敗しました。"
  );
});

test("resolveCommunityViewerMode distinguishes community entry states", () => {
  assert.equal(
    resolveCommunityViewerMode({
      isConnected: false,
      viewerAddress: null,
      identityResolved: false,
      identity: null,
    }),
    "unconnected"
  );

  assert.equal(
    resolveCommunityViewerMode({
      isConnected: true,
      viewerAddress: "0xabc",
      identityResolved: false,
      identity: null,
    }),
    "loading"
  );

  assert.equal(
    resolveCommunityViewerMode({
      isConnected: true,
      viewerAddress: "0xabc",
      identityResolved: true,
      identity: {
        hasUser: false,
        hasCreator: false,
        user: null,
        creatorUsername: null,
      },
    }),
    "unregistered"
  );

  assert.equal(
    resolveCommunityViewerMode({
      isConnected: true,
      viewerAddress: "0xabc",
      identityResolved: true,
      identity: {
        hasUser: true,
        hasCreator: false,
        user: {
          username: "fan",
          displayName: "Fan",
        },
        creatorUsername: null,
      },
    }),
    "userOnly"
  );

  assert.equal(
    resolveCommunityViewerMode({
      isConnected: true,
      viewerAddress: "0xabc",
      identityResolved: true,
      identity: {
        hasUser: true,
        hasCreator: true,
        user: {
          username: "creator-user",
          displayName: "Creator User",
        },
        creatorUsername: "creator-page",
      },
    }),
    "creatorReady"
  );
});

test("resolveCommunityViewerLinks prefers creator, then user, then fallback", () => {
  assert.deepEqual(
    resolveCommunityViewerLinks({
      fallbackUsername: "page-owner",
      identity: {
        hasUser: true,
        hasCreator: true,
        user: {
          username: "viewer-user",
          displayName: "Viewer User",
        },
        creatorUsername: "creator-page",
      },
    }),
    {
      settingsHref: "/creator-page/mypage",
      composeHref: "/creator-page/compose",
      notificationsHref: "/creator-page/notifications",
    }
  );

  assert.deepEqual(
    resolveCommunityViewerLinks({
      fallbackUsername: "page-owner",
      identity: {
        hasUser: true,
        hasCreator: false,
        user: {
          username: "viewer-user",
          displayName: "Viewer User",
        },
        creatorUsername: null,
      },
    }),
    {
      settingsHref: "/viewer-user/mypage",
      composeHref: "/viewer-user/mypage",
      notificationsHref: "/viewer-user/mypage",
    }
  );

  assert.deepEqual(
    resolveCommunityViewerLinks({
      fallbackUsername: "page-owner",
      identity: null,
    }),
    {
      settingsHref: "/page-owner/mypage",
      composeHref: "/page-owner/mypage",
      notificationsHref: "/page-owner/mypage",
    }
  );
});
