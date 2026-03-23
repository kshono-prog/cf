import assert from "node:assert/strict";
import test from "node:test";

import {
  canSkipApproval,
  getAgentTaskReviewPolicy,
  isInformationalTask,
  requiresApprovalByDefault,
} from "@/lib/agentTaskPolicy";

test("agent task policy keeps informational tasks auto-complete", () => {
  assert.equal(getAgentTaskReviewPolicy("MANAGER_NEXT_ACTIONS"), "always_auto");
  assert.equal(isInformationalTask("ANALYZE"), true);
  assert.equal(requiresApprovalByDefault("PROPOSE"), false);
  assert.equal(canSkipApproval("CAREER_PLAN_DRAFT"), false);
});

test("agent task policy treats draft-producing tasks as review-optional by default", () => {
  assert.equal(
    getAgentTaskReviewPolicy("ANNOUNCEMENT_DRAFT"),
    "review_optional"
  );
  assert.equal(requiresApprovalByDefault("TRANSLATE"), true);
  assert.equal(canSkipApproval("WEEKLY_REPORT"), true);
  assert.equal(canSkipApproval("DISTRIBUTION_PLAN_DRAFT"), true);
});
