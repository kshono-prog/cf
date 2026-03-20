import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { handleProjectSettlementBridgePost } from "@/lib/projectSettlementBridgeApi";

const OWNER_ADDRESS = "0x1111111111111111111111111111111111111111";

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://127.0.0.1/api/projects/1/settlement/bridge", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
  });
}

test("postProjectSettlementBridge returns 503 when the database is temporarily unavailable", async () => {
  const response = await handleProjectSettlementBridgePost(
    createRequest({
      address: OWNER_ADDRESS,
      sourceChain: "POLYGON",
      token: "JPYC",
      bridgedAmountAtomic: "100",
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

test("postProjectSettlementBridge returns the saved bridge step and settlement snapshot", async () => {
  const now = new Date("2026-03-20T09:00:00.000Z");

  const response = await handleProjectSettlementBridgePost(
    createRequest({
      address: OWNER_ADDRESS,
      sourceChain: "POLYGON",
      token: "JPYC",
      bridgedAmountAtomic: "100",
      txHash:
        "0x1111111111111111111111111111111111111111111111111111111111111111",
      memo: "bridge memo",
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
            goal: {
              achievedAt: new Date("2026-03-20T08:00:00.000Z"),
            },
          }),
        },
        $transaction: async <T>(fn: (tx: unknown) => Promise<T>) =>
          fn({
            projectBridgeStep: {
              upsert: async () => ({
                id: "bridge-step-1",
                sourceChain: "POLYGON",
                destinationChain: "AVALANCHE",
                token: "JPYC",
                status: "COMPLETED",
                bridgedAmountAtomic: {
                  toString: () => "100",
                },
                txHash:
                  "0x1111111111111111111111111111111111111111111111111111111111111111",
                completedAt: now,
                memo: "bridge memo",
              }),
            },
          }),
      } as never,
      ensureProjectSettlement: async () => undefined,
      assertDistributionWithinBridged: async () => ({
        bridged: { toString: () => "100" },
        planned: { toString: () => "0" },
      }) as never,
      recomputeProjectSettlement: async () =>
        ({
          status: "READY_FOR_DISTRIBUTION",
          bridgedTotalAtomic: { toString: () => "100" },
          distributedTotalAtomic: { toString: () => "0" },
        }) as never,
    }
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    bridgeStep: {
      id: "bridge-step-1",
      sourceChain: "POLYGON",
      destinationChain: "AVALANCHE",
      token: "JPYC",
      status: "COMPLETED",
      bridgedAmountAtomic: "100",
      txHash:
        "0x1111111111111111111111111111111111111111111111111111111111111111",
      completedAt: "2026-03-20T09:00:00.000Z",
      memo: "bridge memo",
    },
    settlement: {
      status: "READY_FOR_DISTRIBUTION",
      bridgedTotalAtomic: "100",
      distributedTotalAtomic: "0",
    },
  });
});
