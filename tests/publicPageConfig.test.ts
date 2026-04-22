import test from "node:test";
import assert from "node:assert/strict";

import {
  orderConfiguredPublicPageSections,
  parseCreatorPublicPageConfig,
  resolveCreatorPublicPageConfig,
} from "@/lib/publicPageConfig";

test("resolveCreatorPublicPageConfig normalizes colors and fills missing section keys", () => {
  const config = resolveCreatorPublicPageConfig({
    backgroundColor: "#abc",
    centerSectionOrder: ["posts", "community"],
    hiddenCenterSectionKeys: ["guide"],
    rightSectionOrder: ["credibility", "profile-qr"],
    hiddenRightSectionKeys: ["creator-stage"],
  });

  assert.equal(config.backgroundColor, "#aabbcc");
  assert.deepEqual(config.introSectionOrder, ["support", "faq", "video"]);
  assert.deepEqual(config.centerSectionOrder, [
    "posts",
    "community",
    "wallet-tip",
    "guide",
  ]);
  assert.deepEqual(config.hiddenCenterSectionKeys, ["guide"]);
  assert.deepEqual(config.rightSectionOrder, [
    "credibility",
    "profile-qr",
    "ai-manager",
    "creator-voice",
    "creator-stage",
    "trust-profile",
  ]);
  assert.deepEqual(config.hiddenRightSectionKeys, ["creator-stage"]);
});

test("parseCreatorPublicPageConfig rejects invalid values and keeps safe defaults", () => {
  const config = parseCreatorPublicPageConfig({
    heroImageUrl: "ftp://example.com/cover.jpg",
    backgroundColor: "blue",
    centerSectionOrder: ["posts", "unknown"],
    hiddenCenterSectionKeys: ["community", "missing"],
    rightSectionOrder: ["profile-qr", "credibility"],
    hiddenRightSectionKeys: ["trust-profile", "unexpected"],
  });

  assert.deepEqual(config, {
    heroImageUrl: null,
    backgroundColor: null,
    introSectionOrder: ["support", "faq", "video"],
    centerSectionOrder: ["posts", "wallet-tip", "community", "guide"],
    hiddenCenterSectionKeys: ["community"],
    rightSectionOrder: [
      "profile-qr",
      "credibility",
      "ai-manager",
      "creator-voice",
      "creator-stage",
      "trust-profile",
    ],
    hiddenRightSectionKeys: ["trust-profile"],
  });
});

test("resolveCreatorPublicPageConfig normalizes introSectionOrder", () => {
  const config = resolveCreatorPublicPageConfig({
    introSectionOrder: ["video", "support"],
  });

  assert.deepEqual(config.introSectionOrder, ["video", "support", "faq"]);
});

test("orderConfiguredPublicPageSections removes hidden keys and appends available leftovers", () => {
  const ordered = orderConfiguredPublicPageSections({
    availableKeys: ["posts", "community", "guide"],
    configuredOrder: ["guide", "posts", "wallet-tip"],
    hiddenKeys: ["community"],
  });

  assert.deepEqual(ordered, ["guide", "posts"]);
});
