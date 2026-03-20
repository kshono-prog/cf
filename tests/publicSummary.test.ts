import assert from "node:assert/strict";
import test from "node:test";

import { pickPublicSummaryLite } from "../lib/publicSummary";

test("pickPublicSummaryLite accepts neutral summary fields", () => {
  const summary = pickPublicSummaryLite({
    goal: {
      targetAmount: 1000,
      achievedAt: null,
      deadline: null,
    },
    progress: {
      confirmedAmount: 250,
      targetAmount: 1000,
      progressPct: 25,
    },
  });

  assert.deepEqual(summary, {
    goal: {
      targetAmount: 1000,
      achievedAt: null,
      deadline: null,
    },
    progress: {
      confirmedAmount: 250,
      targetAmount: 1000,
      progressPct: 25,
    },
  });
});

test("pickPublicSummaryLite still parses legacy summary aliases", () => {
  const summary = pickPublicSummaryLite({
    goal: {
      targetAmountJpyc: 800,
      achievedAt: null,
      deadline: null,
    },
    progress: {
      confirmedJpyc: 400,
      targetJpyc: 800,
      progressPct: 50,
    },
  });

  assert.deepEqual(summary, {
    goal: {
      targetAmount: 800,
      achievedAt: null,
      deadline: null,
    },
    progress: {
      confirmedAmount: 400,
      targetAmount: 800,
      progressPct: 50,
    },
  });
});
