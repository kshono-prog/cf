import assert from "node:assert/strict";
import test from "node:test";

import {
  CREATOR_READY_WORKSPACE_VIEWS,
  getCreatorReadyWorkspaceConfig,
  getCreatorReadyWorkspaceGroups,
} from "../components/mypage/creatorReadyWorkspaceConfig";

test("creatorReady workspace config keeps stable workspace order", () => {
  assert.deepEqual(
    CREATOR_READY_WORKSPACE_VIEWS.map((view) => view.id),
    ["home", "support-page", "supporters", "public", "advanced"]
  );
});

test("creatorReady workspace helpers preserve tier grouping", () => {
  const groups = getCreatorReadyWorkspaceGroups();

  assert.deepEqual(groups.map((group) => group.tier), ["MVP", "BETA"]);
  assert.deepEqual(
    groups[0]?.views.map((view) => view.id),
    ["home", "support-page", "supporters", "public"]
  );
  assert.deepEqual(
    groups[1]?.views.map((view) => view.id),
    ["advanced"]
  );
});

test("creatorReady workspace lookup returns matching beta notes", () => {
  assert.equal(
    getCreatorReadyWorkspaceConfig("advanced")?.betaNote,
    "Gas support と高度な bridge / CCTP は beta 扱いです。"
  );
  assert.equal(getCreatorReadyWorkspaceConfig("home")?.tier, "MVP");
});
