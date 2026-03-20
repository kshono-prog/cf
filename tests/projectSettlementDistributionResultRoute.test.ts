import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { handleProjectSettlementDistributionResultPost } from "@/lib/projectSettlementDistributionResultApi";

const OWNER_ADDRESS = "0x1111111111111111111111111111111111111111";
const TX_HASH =
  "0x1111111111111111111111111111111111111111111111111111111111111111";

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(
    "http://127.0.0.1/api/projects/1/settlement/distribution-result",
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
      },
    }
  );
}

test("handleProjectSettlementDistributionResultPost returns 503 when the database is temporarily unavailable", async () => {
  const response = await handleProjectSettlementDistributionResultPost(
    createRequest({
      address: OWNER_ADDRESS,
      entryId: "entry-1",
      status: "SENT",
      txHash: TX_HASH,
    }),
    { params: Promise.resolve({ projectId: "1" }) },
    {
      requireOwnerSession: async () => ({
        ok: true,
        address: OWNER_ADDRESS,
      }),
      withPrismaRetry: async <T>(fn: () => Promise<T>) => fn(),
      db: {
        project: {
          findUnique: async () => {
            throw new Error("DATABASE_TEMPORARILY_UNAVAILABLE");
          },
        },
        $transaction: async () => {
          throw new Error("should not start a transaction");
        },
      } as never,
    }
  );

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "DB_UNAVAILABLE",
  });
});

test("handleProjectSettlementDistributionResultPost returns the execution id and settlement snapshot", async () => {
  const now = new Date("2026-03-20T10:30:00.000Z");

  const response = await handleProjectSettlementDistributionResultPost(
    createRequest({
      address: OWNER_ADDRESS,
      entryId: "entry-1",
      status: "SENT",
      txHash: TX_HASH,
    }),
    { params: Promise.resolve({ projectId: "1" }) },
    {
      now: () => now,
      requireOwnerSession: async () => ({
        ok: true,
        address: OWNER_ADDRESS,
      }),
      withPrismaRetry: async <T>(fn: () => Promise<T>) => fn(),
      db: {
        project: {
          findUnique: async () => ({
            id: 1n,
            ownerAddress: OWNER_ADDRESS,
            bridgedAt: new Date("2026-03-20T09:00:00.000Z"),
          }),
        },
        $transaction: async <T>(fn: (tx: unknown) => Promise<T>) =>
          fn({
            distributionEntry: {
              findFirst: async () => ({ id: "entry-1" }),
              update: async () => ({ id: "entry-1" }),
              findMany: async () => [{ status: "SENT" }],
            },
            distributionExecutionItem: {
              findFirst: async (args: { where?: { executionId?: string } }) =>
                args.where?.executionId ? null : null,
              update: async () => ({ id: "item-1" }),
              create: async () => ({ id: "item-1" }),
            },
            distributionExecution: {
              findFirst: async () => null,
              create: async () => ({ id: "exec-1" }),
              update: async () => ({ id: "exec-1" }),
            },
          }),
      } as never,
      ensureProjectSettlement: async () => ({}) as never,
      recomputeProjectSettlement: async () =>
        ({
          status: "DISTRIBUTED",
          bridgedTotalAtomic: { toString: () => "100" },
          distributedTotalAtomic: { toString: () => "100" },
        }) as never,
    }
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    executionId: "exec-1",
    entryId: "entry-1",
    status: "SENT",
    txHash: TX_HASH,
    settlement: {
      status: "DISTRIBUTED",
      bridgedTotalAtomic: "100",
      distributedTotalAtomic: "100",
    },
  });
});
