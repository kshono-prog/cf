import assert from "node:assert/strict";
import test from "node:test";

import { Prisma } from "@prisma/client";

import { recomputeProjectSettlement } from "@/lib/projectSettlement";

type FakeSettlementStatus =
  | "NOT_READY"
  | "BRIDGING"
  | "READY_FOR_DISTRIBUTION"
  | "DISTRIBUTED";

type FakeEntryStatus = "DRAFT" | "QUEUED" | "SENT" | "FAILED" | "CANCELLED";

type FakeStep = {
  sourceChain: "POLYGON" | "ETHEREUM";
  token: "JPYC" | "USDC";
};

type FakeState = {
  projectCurrency: "JPYC" | "USDC";
  achievedAt: Date | null;
  steps: FakeStep[];
  entries: Array<{ status: FakeEntryStatus }>;
  bridgedAtomic: Prisma.Decimal;
  sentAtomic: Prisma.Decimal;
  updatedProjectStatus: string | null;
};

function decimal(value: string | number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function createSettlementTx(state: FakeState) {
  return {
    projectSettlement: {
      upsert: async () => ({
        id: "settlement-1",
        projectId: 1n,
        status: "NOT_READY" as FakeSettlementStatus,
        bridgedTotalAtomic: decimal(0),
        distributedTotalAtomic: decimal(0),
        readyAt: null,
        distributedAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      }),
      update: async ({
        data,
      }: {
        data: {
          status: FakeSettlementStatus;
          bridgedTotalAtomic: Prisma.Decimal;
          distributedTotalAtomic: Prisma.Decimal;
          readyAt: Date | null;
          distributedAt: Date | null;
          updatedAt: Date;
        };
      }) => ({
        id: "settlement-1",
        projectId: 1n,
        status: data.status,
        bridgedTotalAtomic: data.bridgedTotalAtomic,
        distributedTotalAtomic: data.distributedTotalAtomic,
        readyAt: data.readyAt,
        distributedAt: data.distributedAt,
        createdAt: NOW,
        updatedAt: data.updatedAt,
      }),
    },
    project: {
      findUnique: async () => ({
        currency: state.projectCurrency,
      }),
      update: async ({
        data,
      }: {
        data: {
          status: string;
          updatedAt: Date;
        };
      }) => {
        state.updatedProjectStatus = data.status;
        return {
          id: 1n,
          status: data.status,
        };
      },
    },
    goal: {
      findUnique: async () =>
        state.achievedAt ? { achievedAt: state.achievedAt } : null,
    },
    projectBridgeStep: {
      aggregate: async () => ({
        _sum: {
          bridgedAmountAtomic: state.bridgedAtomic,
        },
      }),
      findMany: async () => state.steps,
    },
    distributionEntry: {
      aggregate: async ({
        where,
      }: {
        where: { status?: FakeEntryStatus | { not: "CANCELLED" } };
      }) => {
        const statuses =
          where.status && typeof where.status === "object" && "not" in where.status
            ? state.entries.filter((entry) => entry.status !== "CANCELLED")
            : state.entries.filter((entry) => entry.status === "SENT");

        const sum = statuses.reduce(
          (total, entry) =>
            entry.status === "SENT" ? total.plus(state.sentAtomic) : total,
          decimal(0)
        );

        return {
          _sum: {
            amountAtomic: sum,
          },
        };
      },
      findMany: async () => state.entries,
    },
  };
}

const NOW = new Date("2026-03-20T00:00:00.000Z");

test("recomputeProjectSettlement stays NOT_READY before the goal is achieved", async () => {
  const state: FakeState = {
    projectCurrency: "JPYC",
    achievedAt: null,
    steps: [
      { sourceChain: "POLYGON", token: "JPYC" },
      { sourceChain: "ETHEREUM", token: "JPYC" },
    ],
    entries: [],
    bridgedAtomic: decimal("100"),
    sentAtomic: decimal("0"),
    updatedProjectStatus: null,
  };

  const settlement = await recomputeProjectSettlement(
    createSettlementTx(state) as never,
    1n
  );

  assert.equal(settlement.status, "NOT_READY");
  assert.equal(settlement.bridgedTotalAtomic.toString(), "100");
  assert.equal(settlement.distributedTotalAtomic.toString(), "0");
  assert.equal(state.updatedProjectStatus, null);
});

test("recomputeProjectSettlement stays BRIDGING until required bridges complete", async () => {
  const state: FakeState = {
    projectCurrency: "JPYC",
    achievedAt: NOW,
    steps: [{ sourceChain: "POLYGON", token: "JPYC" }],
    entries: [],
    bridgedAtomic: decimal("50"),
    sentAtomic: decimal("0"),
    updatedProjectStatus: null,
  };

  const settlement = await recomputeProjectSettlement(
    createSettlementTx(state) as never,
    1n
  );

  assert.equal(settlement.status, "BRIDGING");
  assert.equal(state.updatedProjectStatus, null);
});

test("recomputeProjectSettlement becomes READY_FOR_DISTRIBUTION after the required bridges", async () => {
  const state: FakeState = {
    projectCurrency: "JPYC",
    achievedAt: NOW,
    steps: [
      { sourceChain: "POLYGON", token: "JPYC" },
      { sourceChain: "ETHEREUM", token: "JPYC" },
    ],
    entries: [{ status: "DRAFT" }],
    bridgedAtomic: decimal("150"),
    sentAtomic: decimal("0"),
    updatedProjectStatus: null,
  };

  const settlement = await recomputeProjectSettlement(
    createSettlementTx(state) as never,
    1n
  );

  assert.equal(settlement.status, "READY_FOR_DISTRIBUTION");
  assert.equal(state.updatedProjectStatus, null);
});

test("recomputeProjectSettlement marks USDC projects distributed after the USDC bridge and all sent rows", async () => {
  const state: FakeState = {
    projectCurrency: "USDC",
    achievedAt: NOW,
    steps: [{ sourceChain: "POLYGON", token: "USDC" }],
    entries: [{ status: "SENT" }, { status: "SENT" }],
    bridgedAtomic: decimal("200"),
    sentAtomic: decimal("75"),
    updatedProjectStatus: null,
  };

  const settlement = await recomputeProjectSettlement(
    createSettlementTx(state) as never,
    1n
  );

  assert.equal(settlement.status, "DISTRIBUTED");
  assert.equal(state.updatedProjectStatus, "DISTRIBUTED");
});
