import assert from "node:assert/strict";
import test from "node:test";

import {
  serializePublicAiManagerProfile,
  serializePublicAiManagerSupportActivities,
} from "../lib/serializers/aiManager";

test("serializePublicAiManagerProfile returns a safe public projection", () => {
  const profile = serializePublicAiManagerProfile({
    status: "ACTIVE",
    displayName: "Luna",
    slug: "luna-manager",
    avatarAssetUrl: "/avatars/luna.jpg",
    intro: "公開ページで活動案内を担当します。",
    archetype: "PROMOTER",
    publicVisibility: "PUBLIC_BADGED",
    primaryLanguage: "ja",
    tone: "FRIENDLY",
    supportStyle: "PROMOTIONAL",
    disclosurePolicy: "ALWAYS_DISCLOSE_AI",
    specialties: ["投稿下書き", "進捗共有"],
    updatedAt: new Date("2026-03-29T00:00:00.000Z"),
  });

  assert.deepEqual(profile, {
    displayName: "Luna",
    slug: "luna-manager",
    avatarAssetUrl: "/avatars/luna.jpg",
    intro: "公開ページで活動案内を担当します。",
    archetype: "PROMOTER",
    primaryLanguage: "ja",
    tone: "FRIENDLY",
    supportStyle: "PROMOTIONAL",
    disclosurePolicy: "ALWAYS_DISCLOSE_AI",
    specialties: ["投稿下書き", "進捗共有"],
    updatedAt: "2026-03-29T00:00:00.000Z",
  });
});

test("serializePublicAiManagerProfile hides non-public or inactive accounts", () => {
  const inactive = serializePublicAiManagerProfile({
    status: "PAUSED",
    displayName: "Luna",
    slug: "luna-manager",
    avatarAssetUrl: null,
    intro: null,
    archetype: "PROMOTER",
    publicVisibility: "PUBLIC_BADGED",
    primaryLanguage: "ja",
    tone: "FRIENDLY",
    supportStyle: "PROMOTIONAL",
    disclosurePolicy: "ALWAYS_DISCLOSE_AI",
    specialties: [],
    updatedAt: new Date("2026-03-29T00:00:00.000Z"),
  });
  const ownerOnly = serializePublicAiManagerProfile({
    status: "ACTIVE",
    displayName: "Luna",
    slug: "luna-manager",
    avatarAssetUrl: null,
    intro: null,
    archetype: "PROMOTER",
    publicVisibility: "OWNER_ONLY",
    primaryLanguage: "ja",
    tone: "FRIENDLY",
    supportStyle: "PROMOTIONAL",
    disclosurePolicy: "ALWAYS_DISCLOSE_AI",
    specialties: [],
    updatedAt: new Date("2026-03-29T00:00:00.000Z"),
  });

  assert.equal(inactive, null);
  assert.equal(ownerOnly, null);
});

test("serializePublicAiManagerProfile hides accounts without public slug", () => {
  const missingSlug = serializePublicAiManagerProfile({
    status: "ACTIVE",
    displayName: "Luna",
    slug: null,
    avatarAssetUrl: null,
    intro: null,
    archetype: "PROMOTER",
    publicVisibility: "PUBLIC_BADGED",
    primaryLanguage: "ja",
    tone: "FRIENDLY",
    supportStyle: "PROMOTIONAL",
    disclosurePolicy: "ALWAYS_DISCLOSE_AI",
    specialties: [],
    updatedAt: new Date("2026-03-29T00:00:00.000Z"),
  });

  assert.equal(missingSlug, null);
});

test("serializePublicAiManagerSupportActivities keeps recent safe task summaries only", () => {
  const activities = serializePublicAiManagerSupportActivities([
    {
      billingState: "SETTLED",
      createdAt: new Date("2026-03-29T12:00:00.000Z"),
      agentTask: {
        taskType: "ANNOUNCEMENT_DRAFT",
      },
    },
    {
      billingState: "FAILED",
      createdAt: new Date("2026-03-29T11:00:00.000Z"),
      agentTask: {
        taskType: "PROPOSE",
      },
    },
    {
      billingState: "WAIVED",
      createdAt: new Date("2026-03-29T10:00:00.000Z"),
      agentTask: null,
    },
    {
      billingState: "WAIVED",
      createdAt: new Date("2026-03-29T09:00:00.000Z"),
      agentTask: {
        taskType: "SUPPORTER_MESSAGE_DRAFT",
      },
    },
    {
      billingState: "SETTLED",
      createdAt: new Date("2026-03-29T08:00:00.000Z"),
      agentTask: {
        taskType: "UNKNOWN_INTERNAL_TASK",
      },
    },
  ]);

  assert.deepEqual(activities, [
    {
      taskType: "ANNOUNCEMENT_DRAFT",
      label: "告知文案を作る",
      helper: "最近の動きと支援状況を踏まえて、告知向けの文面を作ります。",
      createdAt: "2026-03-29T12:00:00.000Z",
    },
    {
      taskType: "SUPPORTER_MESSAGE_DRAFT",
      label: "支援者メッセージ案を作る",
      helper: "支援者向けのお礼や再案内の文面を作ります。",
      createdAt: "2026-03-29T09:00:00.000Z",
    },
  ]);
});
