import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDistributionPlanDraftPayload,
  formatDistributionPlanDraftPayload,
  parseDistributionPlanDraftText,
} from "../lib/creator-ai/distributionPlanDraft";

test("distribution plan draft prefers editable distribution entries", () => {
  const payload = buildDistributionPlanDraftPayload({
    project: {
      id: "p1",
      title: "Project Alpha",
      status: "ACTIVE",
      currency: "JPYC",
    },
    goal: {
      achievedAt: "2026-03-17T00:00:00.000Z",
    },
    progress: {
      progressPct: 100,
    },
    distributionPlan: null,
    settlement: {
      status: "READY_FOR_DISTRIBUTION",
      bridgedTotalAtomic: "1500",
    },
    distributionEntries: [
      {
        id: "entry-1",
        recipientAddressChecksum: "0x1111111111111111111111111111111111111111",
        amountAtomic: "1000",
        memo: "artist",
        status: "DRAFT",
        token: "JPYC",
      },
      {
        id: "entry-2",
        recipientAddressChecksum: "0x2222222222222222222222222222222222222222",
        amountAtomic: "500",
        memo: "archived",
        status: "SENT",
        token: "JPYC",
      },
    ],
    generatedAt: "2026-03-17T00:00:00.000Z",
  });

  assert.equal(payload.source, "existing_distribution_entries");
  assert.equal(payload.rows.length, 1);
  assert.equal(payload.rows[0]?.id, "entry-1");
  assert.equal(payload.rows[0]?.amountAtomic, "1000");
});

test("distribution plan draft falls back to saved distribution plan JSON", () => {
  const payload = buildDistributionPlanDraftPayload({
    project: {
      id: "p2",
      title: "Project Beta",
      status: "ACTIVE",
      currency: "USDC",
    },
    goal: {
      achievedAt: "2026-03-17T00:00:00.000Z",
    },
    progress: {
      progressPct: 100,
    },
    distributionPlan: {
      rows: [
        {
          recipientAddress: "0x3333333333333333333333333333333333333333",
          amountAtomic: "2500000",
          memo: "production",
          token: "USDC",
        },
      ],
    },
    settlement: {
      status: "BRIDGING",
      bridgedTotalAtomic: "0",
    },
    distributionEntries: [],
    generatedAt: "2026-03-17T00:00:00.000Z",
  });

  assert.equal(payload.source, "saved_distribution_plan");
  assert.equal(payload.rows.length, 1);
  assert.equal(payload.rows[0]?.token, "USDC");
  assert.equal(payload.rows[0]?.memo, "production");
});

test("distribution plan draft creates a bridged total template when no plan exists", () => {
  const payload = buildDistributionPlanDraftPayload({
    project: {
      id: "p3",
      title: "Project Gamma",
      status: "ACTIVE",
      currency: "JPYC",
    },
    goal: {
      achievedAt: "2026-03-17T00:00:00.000Z",
    },
    progress: {
      progressPct: 100,
    },
    distributionPlan: null,
    settlement: {
      status: "READY_FOR_DISTRIBUTION",
      bridgedTotalAtomic: "900",
    },
    distributionEntries: [],
    generatedAt: "2026-03-17T00:00:00.000Z",
  });

  assert.equal(payload.source, "bridged_total_template");
  assert.equal(payload.rows[0]?.amountAtomic, "900");
  assert.equal(payload.rows[0]?.recipientAddress, "");
  assert.equal(
    payload.notes.includes(
      "Bridge 済み total を 1 行の仮置きにしています。recipientAddress を確認してから保存してください。"
    ),
    true
  );
});

test("distribution plan draft parser accepts formatted payload JSON", () => {
  const payload = buildDistributionPlanDraftPayload({
    project: {
      id: "p4",
      title: "Project Delta",
      status: "ACTIVE",
      currency: "JPYC",
    },
    goal: {
      achievedAt: null,
    },
    progress: {
      progressPct: 42,
    },
    distributionPlan: null,
    settlement: {
      status: "NOT_READY",
      bridgedTotalAtomic: "0",
    },
    distributionEntries: [],
    generatedAt: "2026-03-17T00:00:00.000Z",
  });

  const parsed = parseDistributionPlanDraftText(
    formatDistributionPlanDraftPayload(payload),
    "JPYC"
  );

  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    return;
  }

  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0]?.token, "JPYC");
});

test("distribution plan draft parser rejects invalid JSON and missing rows", () => {
  const invalidJson = parseDistributionPlanDraftText("{", "JPYC");
  assert.deepEqual(invalidJson, {
    ok: false,
    error: "AI_DRAFT_INVALID_JSON",
  });

  const missingRows = parseDistributionPlanDraftText(
    JSON.stringify({ projectId: "p5" }),
    "JPYC"
  );
  assert.deepEqual(missingRows, {
    ok: false,
    error: "AI_DRAFT_ROWS_REQUIRED",
  });
});
