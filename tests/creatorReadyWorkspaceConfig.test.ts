import assert from "node:assert/strict";
import test from "node:test";

import {
  CREATOR_READY_WORKSPACE_VIEWS,
  getCreatorReadyWorkspaceConfig,
} from "../components/mypage/creatorReadyWorkspaceConfig";

test("creatorReady workspace config has 5 modes in correct order", () => {
  assert.deepEqual(
    CREATOR_READY_WORKSPACE_VIEWS.map((view) => view.id),
    ["daily-work", "project", "ai-office", "fans", "manage"]
  );
});

test("creatorReady workspace config lookup returns matching view", () => {
  assert.equal(getCreatorReadyWorkspaceConfig("daily-work")?.label, "今日");
  assert.equal(getCreatorReadyWorkspaceConfig("project")?.label, "プロジェクト");
  assert.equal(getCreatorReadyWorkspaceConfig("ai-office")?.label, "AI");
  assert.equal(getCreatorReadyWorkspaceConfig("fans")?.label, "ファン");
  assert.equal(getCreatorReadyWorkspaceConfig("manage")?.label, "管理");
});

test("creatorReady workspace config returns undefined for unknown view", () => {
  assert.equal(
    getCreatorReadyWorkspaceConfig("unknown" as never),
    undefined
  );
});
