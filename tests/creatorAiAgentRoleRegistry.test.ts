import assert from "node:assert/strict";
import test from "node:test";

import {
  CREATOR_AI_AGENT_ROLE_DEFINITIONS,
  getCreatorAiAgentRoleDefinition,
  getCreatorAiAgentRolesForTaskType,
  getCreatorAiAgentRolesByPhase,
  getPrimaryCreatorAiAgentRoleForTaskType,
  toCreatorAiAgentRole,
} from "../lib/creator-ai/agentRoleRegistry";

test("creator AI agent roles keep stable order and ids", () => {
  assert.deepEqual(
    CREATOR_AI_AGENT_ROLE_DEFINITIONS.map((definition) => definition.id),
    ["MANAGER", "PROMOTION", "FINANCE", "FAN_RELATION"]
  );
});

test("MVP agent roles remain limited to advisory or approval-based work", () => {
  const mvpRoles = getCreatorAiAgentRolesByPhase("MVP");

  assert.deepEqual(
    mvpRoles.map((definition) => definition.id),
    ["MANAGER", "PROMOTION", "FINANCE"]
  );
  assert.ok(
    mvpRoles.every(
      (definition) =>
        definition.executionBoundary === "advisory_only" ||
        definition.executionBoundary === "approval_required"
    )
  );
});

test("manager role includes the saved next-actions task type", () => {
  const managerRole = getCreatorAiAgentRoleDefinition("MANAGER");
  const financeRole = getCreatorAiAgentRoleDefinition("FINANCE");

  assert.equal(managerRole?.candidateTaskTypes.includes("MANAGER_NEXT_ACTIONS"), true);
  assert.equal(managerRole?.executionBoundary, "advisory_only");
  assert.equal(
    financeRole?.candidateTaskTypes.includes("DISTRIBUTION_PLAN_DRAFT"),
    true
  );
  assert.equal(
    getPrimaryCreatorAiAgentRoleForTaskType("DISTRIBUTION_PLAN_DRAFT"),
    "FINANCE"
  );
});

test("creator AI role helpers resolve valid role ids and task mappings", () => {
  assert.equal(toCreatorAiAgentRole("PROMOTION"), "PROMOTION");
  assert.equal(toCreatorAiAgentRole("UNKNOWN"), null);
  assert.deepEqual(
    getCreatorAiAgentRolesForTaskType("ANNOUNCEMENT_DRAFT").map(
      (definition) => definition.id
    ),
    ["PROMOTION", "FAN_RELATION"]
  );
  assert.equal(getPrimaryCreatorAiAgentRoleForTaskType("TRANSLATE"), "PROMOTION");
});
