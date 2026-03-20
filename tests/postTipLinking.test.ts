import assert from "node:assert/strict";
import test from "node:test";

import {
  applyConfirmedContributionToPostTips,
  ensurePostTipLink,
} from "@/lib/social";
import { Prisma } from "@prisma/client";

const NOW = new Date("2025-01-01T00:00:00Z");
const POST_ID = "post-uuid-1";
const CONTRIB_ID = "contrib-uuid-1";

// ── ensurePostTipLink ──────────────────────────────────────────────────────

test("ensurePostTipLink creates a new link when none exists", async () => {
  const created: Array<{ postId: string; contributionId: string }> = [];

  const tx = {
    postTip: {
      findFirst: async () => null,
      create: async ({ data }: { data: { postId: string; contributionId: string; createdAt: Date } }) => {
        created.push({ postId: data.postId, contributionId: data.contributionId });
        return { id: "tip-1" };
      },
    },
  };

  const result = await ensurePostTipLink({
    tx: tx as never,
    postId: POST_ID,
    contributionId: CONTRIB_ID,
    now: NOW,
  });

  assert.equal(result.created, true);
  assert.equal(created.length, 1);
  assert.equal(created[0].postId, POST_ID);
  assert.equal(created[0].contributionId, CONTRIB_ID);
});

test("ensurePostTipLink is idempotent when link already exists for same post", async () => {
  const tx = {
    postTip: {
      findFirst: async () => ({ postId: POST_ID }),
      create: async () => { throw new Error("should not be called"); },
    },
  };

  const result = await ensurePostTipLink({
    tx: tx as never,
    postId: POST_ID,
    contributionId: CONTRIB_ID,
    now: NOW,
  });

  assert.equal(result.created, false);
});

test("ensurePostTipLink throws when contribution is already linked to a different post", async () => {
  const tx = {
    postTip: {
      findFirst: async () => ({ postId: "different-post-id" }),
    },
  };

  await assert.rejects(
    () =>
      ensurePostTipLink({
        tx: tx as never,
        postId: POST_ID,
        contributionId: CONTRIB_ID,
        now: NOW,
      }),
    (err: unknown) =>
      err instanceof Error &&
      err.message === "CONTRIBUTION_ALREADY_LINKED_TO_ANOTHER_POST"
  );
});

// ── applyConfirmedContributionToPostTips ───────────────────────────────────

test("applyConfirmedContributionToPostTips does nothing if amount is null", async () => {
  const tx = {
    postTip: {
      findMany: async () => { throw new Error("should not be called"); },
    },
  };

  await applyConfirmedContributionToPostTips({
    tx: tx as never,
    contributionId: CONTRIB_ID,
    currency: "JPYC",
    amountDecimal: null,
    now: NOW,
  });
  // no error → passes
});

test("applyConfirmedContributionToPostTips increments JPYC tip amount", async () => {
  const updates: Array<{ where: { id: string }; data: Record<string, unknown> }> = [];

  const tx = {
    postTip: {
      findMany: async () => [{ postId: POST_ID }],
    },
    post: {
      update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        updates.push(args);
        return { id: args.where.id };
      },
    },
  };

  await applyConfirmedContributionToPostTips({
    tx: tx as never,
    contributionId: CONTRIB_ID,
    currency: "JPYC",
    amountDecimal: new Prisma.Decimal("500"),
    now: NOW,
  });

  assert.equal(updates.length, 1);
  assert.equal(updates[0].where.id, POST_ID);
  assert.ok("tipAmountJpyc" in updates[0].data);
  assert.ok(!("tipAmountUsdc" in updates[0].data));
});

test("applyConfirmedContributionToPostTips increments USDC tip amount", async () => {
  const updates: Array<{ where: { id: string }; data: Record<string, unknown> }> = [];

  const tx = {
    postTip: {
      findMany: async () => [{ postId: POST_ID }],
    },
    post: {
      update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        updates.push(args);
        return { id: args.where.id };
      },
    },
  };

  await applyConfirmedContributionToPostTips({
    tx: tx as never,
    contributionId: CONTRIB_ID,
    currency: "USDC",
    amountDecimal: new Prisma.Decimal("1.50"),
    now: NOW,
  });

  assert.equal(updates.length, 1);
  assert.ok("tipAmountUsdc" in updates[0].data);
  assert.ok(!("tipAmountJpyc" in updates[0].data));
});

test("applyConfirmedContributionToPostTips handles multiple linked posts", async () => {
  const updates: string[] = [];

  const tx = {
    postTip: {
      findMany: async () => [{ postId: "post-a" }, { postId: "post-b" }],
    },
    post: {
      update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        updates.push(args.where.id);
        return { id: args.where.id };
      },
    },
  };

  await applyConfirmedContributionToPostTips({
    tx: tx as never,
    contributionId: CONTRIB_ID,
    currency: "JPYC",
    amountDecimal: "200",
    now: NOW,
  });

  assert.deepEqual(updates, ["post-a", "post-b"]);
});
