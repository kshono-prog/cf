import assert from "node:assert/strict";
import test from "node:test";

import {
  AGENT_TASK_AUDIT_ACTION,
  getTaskFollowThroughAuditAction,
  getTaskFollowThroughUsageKind,
  toFollowThroughAuditAction,
} from "../lib/agentTaskAudit";

test("agent task audit resolves follow-through mapping by task type", () => {
  assert.equal(
    getTaskFollowThroughUsageKind("ANNOUNCEMENT_DRAFT"),
    "POSTING_COMPOSE"
  );
  assert.equal(
    getTaskFollowThroughAuditAction("ANNOUNCEMENT_DRAFT"),
    AGENT_TASK_AUDIT_ACTION.POSTING_COMPOSE_OPENED
  );
  assert.equal(
    getTaskFollowThroughAuditAction("DISTRIBUTION_PLAN_DRAFT"),
    AGENT_TASK_AUDIT_ACTION.SETTLEMENT_DRAFT_APPLIED
  );
  assert.equal(
    getTaskFollowThroughAuditAction("SUPPORTER_MESSAGE_DRAFT"),
    AGENT_TASK_AUDIT_ACTION.OUTPUT_COPIED
  );
  assert.equal(getTaskFollowThroughAuditAction("MANAGER_NEXT_ACTIONS"), null);
});

test("agent task audit parser accepts only supported follow-through actions", () => {
  assert.equal(
    toFollowThroughAuditAction(AGENT_TASK_AUDIT_ACTION.POSTING_COMPOSE_OPENED),
    AGENT_TASK_AUDIT_ACTION.POSTING_COMPOSE_OPENED
  );
  assert.equal(toFollowThroughAuditAction("TASK_APPROVED"), null);
  assert.equal(toFollowThroughAuditAction(null), null);
});
