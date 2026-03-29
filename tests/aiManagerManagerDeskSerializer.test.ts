import assert from "node:assert/strict";
import test from "node:test";

import { Prisma } from "@prisma/client";

import { serializeManagerDeskAiManagerSummary } from "../lib/serializers/aiManager";

test("serializeManagerDeskAiManagerSummary exposes a read-only safe summary", () => {
  const summary = serializeManagerDeskAiManagerSummary({
    status: "ACTIVE",
    displayName: "Nagi",
    intro: "制作の進捗整理を担当します。",
    archetype: "ANALYST",
    publicVisibility: "OWNER_ONLY",
    primaryLanguage: "ja",
    tone: "POLITE",
    supportStyle: "DATA_DRIVEN",
    disclosurePolicy: "ALWAYS_DISCLOSE_AI",
    specialties: ["進捗整理", "週次要約"],
    updatedAt: new Date("2026-03-29T00:00:00.000Z"),
    billingPolicy: {
      status: "ACTIVE",
      freeTierScope: "BRIEFING_AND_LIGHT_DRAFTS",
      autoPayEnabled: true,
      allowedBillableCapabilities: ["PROGRESS_SUMMARY", "WEB_RESEARCH"],
    },
    budgetBalance: {
      availableAmount: new Prisma.Decimal("120.00"),
    },
  });

  assert.deepEqual(summary, {
    displayName: "Nagi",
    status: "ACTIVE",
    publicVisibility: "OWNER_ONLY",
    intro: "制作の進捗整理を担当します。",
    archetype: "ANALYST",
    primaryLanguage: "ja",
    tone: "POLITE",
    supportStyle: "DATA_DRIVEN",
    disclosurePolicy: "ALWAYS_DISCLOSE_AI",
    specialties: ["進捗整理", "週次要約"],
    billingPolicyStatus: "ACTIVE",
    freeTierScope: "BRIEFING_AND_LIGHT_DRAFTS",
    allowedBillableCapabilities: ["PROGRESS_SUMMARY", "WEB_RESEARCH"],
    operatingMode: "BILLABLE_ACTIVE",
    updatedAt: "2026-03-29T00:00:00.000Z",
  });
});

test("serializeManagerDeskAiManagerSummary falls back to free-only or inactive modes", () => {
  const freeOnly = serializeManagerDeskAiManagerSummary({
    status: "ACTIVE",
    displayName: "Nagi",
    intro: null,
    archetype: "ANALYST",
    publicVisibility: "OWNER_ONLY",
    primaryLanguage: "ja",
    tone: "POLITE",
    supportStyle: "DATA_DRIVEN",
    disclosurePolicy: "ALWAYS_DISCLOSE_AI",
    specialties: [],
    updatedAt: new Date("2026-03-29T00:00:00.000Z"),
    billingPolicy: {
      status: "ACTIVE",
      freeTierScope: "BRIEFING_AND_LIGHT_DRAFTS",
      autoPayEnabled: false,
      allowedBillableCapabilities: [],
    },
    budgetBalance: {
      availableAmount: new Prisma.Decimal("0.00"),
    },
  });
  const inactive = serializeManagerDeskAiManagerSummary({
    status: "PAUSED",
    displayName: "Nagi",
    intro: null,
    archetype: "ANALYST",
    publicVisibility: "OWNER_ONLY",
    primaryLanguage: "ja",
    tone: "POLITE",
    supportStyle: "DATA_DRIVEN",
    disclosurePolicy: "ALWAYS_DISCLOSE_AI",
    specialties: [],
    updatedAt: new Date("2026-03-29T00:00:00.000Z"),
    billingPolicy: {
      status: "PAUSED",
      freeTierScope: "BRIEFING_AND_LIGHT_DRAFTS",
      autoPayEnabled: true,
      allowedBillableCapabilities: ["WEB_RESEARCH"],
    },
    budgetBalance: {
      availableAmount: new Prisma.Decimal("999.00"),
    },
  });

  assert.equal(freeOnly?.operatingMode, "FREE_ONLY");
  assert.equal(inactive?.operatingMode, "INACTIVE");
});
