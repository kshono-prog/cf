import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { handleProjectSettlementDistributionsPut } from "@/lib/projectSettlementDistributionsApi";

const OWNER_ADDRESS = "0x1111111111111111111111111111111111111111";

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://127.0.0.1/api/projects/1/settlement/distributions", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
  });
}

test("handleProjectSettlementDistributionsPut returns 503 when the database is temporarily unavailable", async () => {
  const response = await handleProjectSettlementDistributionsPut(
    createRequest({
      address: OWNER_ADDRESS,
      entries: [],
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

test("handleProjectSettlementDistributionsPut returns the saved draft rows and settlement snapshot", async () => {
  const now = new Date("2026-03-20T10:00:00.000Z");

  const response = await handleProjectSettlementDistributionsPut(
    createRequest({
      address: OWNER_ADDRESS,
      entries: [
        {
          id: "entry-1",
          recipientAddress: OWNER_ADDRESS,
          amountAtomic: "100",
          memo: "updated memo",
          token: "JPYC",
          orderIndex: 0,
        },
      ],
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
            currency: "JPYC",
          }),
        },
        $transaction: async <T>(fn: (tx: unknown) => Promise<T>) =>
          fn({
            distributionEntry: {
              findMany: async (args: { orderBy?: unknown }) =>
                args.orderBy
                  ? [
                      {
                        id: "entry-1",
                        recipientAddressChecksum: OWNER_ADDRESS,
                        amountAtomic: { toString: () => "100" },
                        memo: "updated memo",
                        token: "JPYC",
                        status: "DRAFT",
                        txHash: null,
                        sentAt: null,
                        orderIndex: 0,
                      },
                    ]
                  : [
                      {
                        id: "entry-1",
                        status: "DRAFT",
                        recipientAddressChecksum: OWNER_ADDRESS,
                        amountAtomic: { toString: () => "100" },
                        memo: "old memo",
                        token: "JPYC",
                        orderIndex: 0,
                      },
                    ],
              updateMany: async () => ({ count: 1 }),
              create: async () => ({ id: "created-entry" }),
              update: async () => ({ id: "entry-1" }),
              deleteMany: async () => ({ count: 0 }),
            },
            distributionRun: {
              create: async () => ({ id: "run-1" }),
            },
          }),
      } as never,
      ensureProjectSettlement: async () => ({}) as never,
      assertDistributionWithinBridged: async () =>
        ({
          bridged: { toString: () => "100" },
          planned: { toString: () => "100" },
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
    distributionEntries: [
      {
        id: "entry-1",
        recipientAddressChecksum: OWNER_ADDRESS,
        amountAtomic: "100",
        memo: "updated memo",
        token: "JPYC",
        status: "DRAFT",
        txHash: null,
        sentAt: null,
        orderIndex: 0,
      },
    ],
    settlement: {
      status: "READY_FOR_DISTRIBUTION",
      bridgedTotalAtomic: "100",
      distributedTotalAtomic: "0",
    },
  });
});
