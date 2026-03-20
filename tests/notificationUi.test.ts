import assert from "node:assert/strict";
import test from "node:test";

import {
  formatNotificationTimestamp,
  getNotificationFallbackBadge,
} from "@/lib/notificationUi";

test("formatNotificationTimestamp shows relative time within 24 hours", () => {
  const now = new Date("2026-03-20T15:00:00+09:00").getTime();
  const value = formatNotificationTimestamp("2026-03-20T14:15:00+09:00", now);

  assert.equal(value, "45分前");
});

test("formatNotificationTimestamp falls back to absolute date after 24 hours", () => {
  const now = new Date("2026-03-21T16:00:00+09:00").getTime();
  const value = formatNotificationTimestamp("2026-03-20T14:15:00+09:00", now);

  assert.match(value, /\d+月\d+日/);
});

test("getNotificationFallbackBadge returns kind-aware labels", () => {
  assert.deepEqual(getNotificationFallbackBadge("NOTICE"), {
    label: "知",
    title: "お知らせ",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  });
  assert.deepEqual(getNotificationFallbackBadge("LIKE"), {
    label: "好",
    title: "いいね",
    className: "border-pink-200 bg-pink-50 text-pink-700",
  });
});
