import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDefaultAiManagerSlug,
  normalizeAiManagerSlug,
} from "../lib/aiManager/slug";

test("normalizeAiManagerSlug keeps lowercase path-safe slugs", () => {
  assert.equal(normalizeAiManagerSlug(" Luna Manager 2026 "), "luna-manager-2026");
  assert.equal(normalizeAiManagerSlug("___AI___Guide___"), "ai-guide");
});

test("buildDefaultAiManagerSlug falls back to creator-scoped default", () => {
  assert.equal(buildDefaultAiManagerSlug("kazu"), "kazu-manager");
});
