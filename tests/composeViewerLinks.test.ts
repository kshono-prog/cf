import assert from "node:assert/strict";
import test from "node:test";

import { resolveComposeViewerLinks } from "../lib/composeViewerLinks";

test("resolveComposeViewerLinks sends registered non-creator viewers to their own workspace", () => {
  const links = resolveComposeViewerLinks({
    pageUsername: "page-owner",
    viewerState: {
      mode: "registered",
      isConnected: true,
      isOwner: false,
      hasUser: true,
      hasCreator: false,
      userUsername: "fan-user",
      creatorUsername: null,
      displayName: "Fan User",
    },
  });

  assert.deepEqual(links, {
    viewerWorkspaceHref: "/fan-user/mypage",
    ownComposeHref: "/fan-user/mypage",
    ownProfileHref: "/fan-user",
  });
});

test("resolveComposeViewerLinks prefers the creator workspace for creator viewers", () => {
  const links = resolveComposeViewerLinks({
    pageUsername: "page-owner",
    viewerState: {
      mode: "registered",
      isConnected: true,
      isOwner: false,
      hasUser: true,
      hasCreator: true,
      userUsername: "viewer-user",
      creatorUsername: "viewer-creator",
      displayName: "Viewer Creator",
    },
  });

  assert.deepEqual(links, {
    viewerWorkspaceHref: "/viewer-creator/mypage",
    ownComposeHref: "/viewer-creator/compose",
    ownProfileHref: "/viewer-creator",
  });
});

test("resolveComposeViewerLinks falls back to the viewed page when the viewer has no username yet", () => {
  const links = resolveComposeViewerLinks({
    pageUsername: "page-owner",
    viewerState: {
      mode: "unconnected",
      isConnected: false,
      isOwner: false,
      hasUser: false,
      hasCreator: false,
      userUsername: null,
      creatorUsername: null,
      displayName: null,
    },
  });

  assert.deepEqual(links, {
    viewerWorkspaceHref: "/page-owner/mypage",
    ownComposeHref: "/page-owner/mypage",
    ownProfileHref: "/page-owner/mypage",
  });
});
