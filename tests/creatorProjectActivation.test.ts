import assert from "node:assert/strict";
import test from "node:test";

import { buildCreatorProjectActivationFields } from "../lib/creatorProjectActivation";

test("buildCreatorProjectActivationFields targets JPYC projects to the JPYC slot only", () => {
  const result = buildCreatorProjectActivationFields({
    projectId: 11n,
    currency: "JPYC",
  });

  assert.deepEqual(result, {
    activeProjectIdJpyc: 11n,
  });
});

test("buildCreatorProjectActivationFields targets USDC projects to the USDC slot only", () => {
  const result = buildCreatorProjectActivationFields({
    projectId: 22n,
    currency: "USDC",
  });

  assert.deepEqual(result, {
    activeProjectIdUsdc: 22n,
  });
});
