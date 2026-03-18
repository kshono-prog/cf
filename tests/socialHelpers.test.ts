import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeFeedCursor,
  encodeFeedCursor,
  isUuidString,
  normalizeTextBody,
  parsePositiveInt,
  serializePost,
  serializeReply,
  toNullableTrimmedString,
  toNullableUuidString,
  toPostMediaType,
} from "../lib/social";

test("uuid and string helpers normalize supported inputs", () => {
  const uuid = "123e4567-e89b-12d3-a456-426614174000";

  assert.equal(isUuidString(uuid), true);
  assert.equal(isUuidString("not-a-uuid"), false);

  assert.equal(toNullableUuidString(` ${uuid} `), uuid);
  assert.equal(toNullableUuidString("   "), null);
  assert.equal(toNullableUuidString("bad"), undefined);
  assert.equal(toNullableUuidString(undefined), undefined);

  assert.equal(toNullableTrimmedString(" hello "), "hello");
  assert.equal(toNullableTrimmedString("   "), null);
  assert.equal(toNullableTrimmedString(undefined), undefined);
});

test("post body and integer helpers apply API constraints", () => {
  assert.equal(normalizeTextBody("  hello  ", 10), "hello");
  assert.equal(normalizeTextBody("   ", 10), null);
  assert.equal(normalizeTextBody("toolong", 3), null);

  assert.equal(parsePositiveInt("12", 5, 20), 12);
  assert.equal(parsePositiveInt("999", 5, 20), 20);
  assert.equal(parsePositiveInt("0", 5, 20), 5);
  assert.equal(parsePositiveInt("bad", 5, 20), 5);
});

test("feed cursor helpers round-trip valid cursors and reject invalid ones", () => {
  const createdAt = new Date("2026-03-16T00:00:00.000Z");
  const id = "123e4567-e89b-12d3-a456-426614174000";

  const encoded = encodeFeedCursor({ createdAt, id });
  assert.equal(encoded, "2026-03-16T00:00:00.000Z|123e4567-e89b-12d3-a456-426614174000");

  assert.deepEqual(decodeFeedCursor(encoded), { createdAt, id });
  assert.equal(decodeFeedCursor(null), null);
  assert.equal(decodeFeedCursor("bad"), null);
  assert.equal(decodeFeedCursor("2026-03-16T00:00:00.000Z|bad-id"), null);
});

test("serializePost preserves viewer flags only when requested", () => {
  const row: Parameters<typeof serializePost>[0] = {
    id: "post-1",
    creatorProfileId: 42n,
    projectId: 7n,
    authorType: "CREATOR",
    body: "Hello world",
    mediaType: "IMAGE",
    mediaUrl: "https://example.com/image.png",
    visibility: "PUBLIC",
    status: "PUBLISHED",
    aiGenerated: false,
    aiAgentId: null,
    likeCount: 3,
    replyCount: 1,
    tipCount: 2,
    tipAmountJpyc: "1200",
    tipAmountUsdc: "5.50",
    createdAt: new Date("2026-03-16T00:00:00.000Z"),
    updatedAt: new Date("2026-03-16T01:00:00.000Z"),
    creatorProfile: {
      id: 42n,
      username: "alice",
      displayName: "Alice",
      avatarUrl: null,
    },
    project: {
      id: 7n,
      title: "Project",
      currency: "JPYC",
      status: "OPEN",
    },
    likes: [{ id: "like-1" }],
  };

  const withViewerState = serializePost(row, true);
  assert.equal(withViewerState.viewerHasLiked, true);
  assert.equal(withViewerState.creator.id, "42");
  assert.equal(withViewerState.project?.id, "7");
  assert.equal(withViewerState.mediaType, "IMAGE");

  const withoutViewerState = serializePost(row, false);
  assert.equal("viewerHasLiked" in withoutViewerState, false);
});

test("serializeReply preserves viewer flags only when requested", () => {
  const row: Parameters<typeof serializeReply>[0] = {
    id: "reply-1",
    postId: "post-1",
    creatorProfileId: 42n,
    parentReplyId: null,
    authorType: "CREATOR",
    body: "Thanks!",
    aiGenerated: false,
    aiAgentId: null,
    likeCount: 4,
    createdAt: new Date("2026-03-16T00:00:00.000Z"),
    updatedAt: new Date("2026-03-16T00:10:00.000Z"),
    creatorProfile: {
      id: 42n,
      username: "alice",
      displayName: "Alice",
      avatarUrl: null,
    },
    likes: [],
  };

  const withViewerState = serializeReply(row, true);
  assert.equal(withViewerState.viewerHasLiked, false);
  assert.equal(withViewerState.creator.id, "42");

  const withoutViewerState = serializeReply(row, false);
  assert.equal("viewerHasLiked" in withoutViewerState, false);
});

test("toPostMediaType accepts only supported values", () => {
  assert.equal(toPostMediaType("IMAGE"), "IMAGE");
  assert.equal(toPostMediaType("VIDEO"), "VIDEO");
  assert.equal(toPostMediaType("LINK"), "LINK");
  assert.equal(toPostMediaType("AUDIO"), null);
});
