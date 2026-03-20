import assert from "node:assert/strict";
import test from "node:test";

import { resolveCreatorProjectSelection } from "../lib/serializers/creator";

test("resolveCreatorProjectSelection prefers the JPYC project when both currency slots exist", () => {
  const result = resolveCreatorProjectSelection({
    activeProjectIdJpyc: "jpyc-project",
    activeProjectIdUsdc: "usdc-project",
  });

  assert.deepEqual(result, {
    projectId: "jpyc-project",
    projectIdsByCurrency: {
      JPYC: "jpyc-project",
      USDC: "usdc-project",
    },
  });
});

test("resolveCreatorProjectSelection falls back to the USDC project when JPYC is absent", () => {
  const result = resolveCreatorProjectSelection({
    activeProjectIdJpyc: null,
    activeProjectIdUsdc: "usdc-project",
  });

  assert.deepEqual(result, {
    projectId: "usdc-project",
    projectIdsByCurrency: {
      JPYC: null,
      USDC: "usdc-project",
    },
  });
});
