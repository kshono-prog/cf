import assert from "node:assert/strict";
import test from "node:test";

import {
  parsePublicViewerMeResponse,
  resolvePublicViewerState,
} from "../lib/publicViewerState";

test("parsePublicViewerMeResponse accepts valid payloads", () => {
  const parsed = parsePublicViewerMeResponse({
    ok: true,
    hasUser: true,
    hasCreator: true,
    user: {
      username: "alice",
      displayName: "Alice",
    },
    creator: {
      username: "alice-creator",
    },
  });

  assert.deepEqual(parsed, {
    hasUser: true,
    hasCreator: true,
    user: {
      username: "alice",
      displayName: "Alice",
    },
    creatorUsername: "alice-creator",
  });
});

test("parsePublicViewerMeResponse rejects invalid payloads", () => {
  assert.equal(parsePublicViewerMeResponse(null), null);
  assert.equal(parsePublicViewerMeResponse({ ok: false }), null);

  const parsed = parsePublicViewerMeResponse({
    ok: true,
    hasUser: true,
    hasCreator: false,
    user: "alice",
    creator: null,
  });

  assert.deepEqual(parsed, {
    hasUser: true,
    hasCreator: false,
    user: null,
    creatorUsername: null,
  });
});

test("resolvePublicViewerState marks creator owners by address", () => {
  const state = resolvePublicViewerState({
    pageUsername: "alice",
    pageCreatorAddress: "0xabc",
    viewerAddress: "0xAbC",
    identity: null,
    identityResolved: false,
  });

  assert.equal(state.mode, "owner");
  assert.equal(state.isOwner, true);
  assert.equal(state.isConnected, true);
});

test("resolvePublicViewerState stays loading until identity is resolved", () => {
  const state = resolvePublicViewerState({
    pageUsername: "alice",
    pageCreatorAddress: null,
    viewerAddress: "0xdef",
    identity: null,
    identityResolved: false,
  });

  assert.equal(state.mode, "loading");
  assert.equal(state.hasUser, false);
  assert.equal(state.isOwner, false);
});

test("resolvePublicViewerState distinguishes unregistered and registered viewers", () => {
  const unregistered = resolvePublicViewerState({
    pageUsername: "alice",
    pageCreatorAddress: null,
    viewerAddress: "0xdef",
    identity: {
      hasUser: false,
      hasCreator: false,
      user: null,
      creatorUsername: null,
    },
    identityResolved: true,
  });
  assert.equal(unregistered.mode, "unregistered");

  const registered = resolvePublicViewerState({
    pageUsername: "alice",
    pageCreatorAddress: null,
    viewerAddress: "0xdef",
    identity: {
      hasUser: true,
      hasCreator: false,
      user: {
        username: "bob",
        displayName: "Bob",
      },
      creatorUsername: null,
    },
    identityResolved: true,
  });

  assert.equal(registered.mode, "registered");
  assert.equal(registered.userUsername, "bob");
  assert.equal(registered.displayName, "Bob");
});
