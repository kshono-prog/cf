import assert from "node:assert/strict";
import test from "node:test";

import {
  CREATOR_READY_WORKSPACE_VIEWS,
  getCreatorReadyWorkspaceConfig,
} from "../components/mypage/creatorReadyWorkspaceConfig";

test("creatorReady workspace config has 2 modes in correct order", () => {
  assert.deepEqual(
    CREATOR_READY_WORKSPACE_VIEWS.map((view) => view.id),
    ["daily-work", "settings"]
  );
});

test("creatorReady workspace config lookup returns matching view", () => {
  assert.equal(getCreatorReadyWorkspaceConfig("daily-work")?.label, "ホーム");
  assert.equal(getCreatorReadyWorkspaceConfig("settings")?.label, "設定");
});

test("creatorReady workspace config returns undefined for unknown view", () => {
  assert.equal(
    getCreatorReadyWorkspaceConfig("unknown" as never),
    undefined
  );
});
