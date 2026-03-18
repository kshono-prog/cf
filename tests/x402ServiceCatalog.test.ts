import assert from "node:assert/strict";
import test from "node:test";

import {
  X402_SERVICE_SURFACES,
  getReadyX402ServiceSurfaces,
} from "../lib/x402/x402ServiceCatalog";

test("x402 service catalog keeps only non-funds-movement surfaces", () => {
  assert.ok(
    X402_SERVICE_SURFACES.every((surface) => surface.excludesFundsMovement)
  );
  assert.ok(
    X402_SERVICE_SURFACES.every(
      (surface) =>
        !surface.label.toLowerCase().includes("bridge") &&
        !surface.label.toLowerCase().includes("distribution")
    )
  );
});

test("phase 2 x402 surfaces stay focused on low-risk intelligence APIs", () => {
  const phase2Surfaces = getReadyX402ServiceSurfaces("PHASE_2");

  assert.deepEqual(
    phase2Surfaces.map((surface) => surface.id),
    [
      "CREATOR_ANALYSIS_API",
      "ANNOUNCEMENT_DRAFT_API",
      "SUPPORTER_MESSAGE_API",
      "WEEKLY_REPORT_API",
    ]
  );
  assert.ok(phase2Surfaces.every((surface) => surface.riskLevel === "low"));
});
