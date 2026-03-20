import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";
import type { ProjectSettlementStatus } from "@prisma/client";

import { handleProjectSettlementBridgePost } from "@/lib/projectSettlementBridgeApi";
import { handleProjectSettlementDistributionResultPost } from "@/lib/projectSettlementDistributionResultApi";
import { handleProjectSettlementDistributionsPut } from "@/lib/projectSettlementDistributionsApi";

const OWNER_ADDRESS = "0x1111111111111111111111111111111111111111";
const PROJECT_ID = 1n;
const TX_HASH =
  "0x1111111111111111111111111111111111111111111111111111111111111111";

type EntryStatus = "DRAFT" | "QUEUED" | "SENT" | "FAILED" | "CANCELLED";
type ExecutionResult = "SUCCESS" | "FAILED" | "PARTIAL_SUCCESS";

type TestDistributionEntry = {
  id: string;
  projectId: bigint;
  recipientAddressChecksum: string;
  amountAtomic: bigint;
  memo: string | null;
  token: "JPYC" | "USDC";
  status: EntryStatus;
  txHash: string | null;
  sentAt: Date | null;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
};

type TestDistributionExecution = {
  id: string;
  projectId: bigint;
  initiatedByWallet: string;
  startedAt: Date;
  result: ExecutionResult;
  finishedAt: Date | null;
};

type TestDistributionExecutionItem = {
  id: string;
  executionId: string;
  distributionEntryId: string;
  status: "SENT" | "FAILED";
  txHash: string | null;
  errorReason: string | null;
  createdAt: Date;
};

type TestBridgeStep = {
  id: string;
  sourceChain: "POLYGON" | "ETHEREUM";
  destinationChain: "AVALANCHE";
  token: "JPYC" | "USDC";
  status: "COMPLETED";
  bridgedAmountAtomic: bigint;
  txHash: string | null;
  completedAt: Date;
  memo: string | null;
  recordedByWallet: string;
  updatedAt: Date;
};

type FlowState = {
  now: Date;
  project: {
    id: bigint;
    ownerAddress: string;
    currency: "JPYC" | "USDC";
    bridgedAt: Date | null;
    goalAchievedAt: Date | null;
  };
  nextEntryId: number;
  nextExecutionId: number;
  nextExecutionItemId: number;
  bridgeStep: TestBridgeStep | null;
  distributionEntries: TestDistributionEntry[];
  distributionRuns: Array<{
    projectId: bigint;
    mode: string;
    currency: string;
    planJson: unknown;
  }>;
  distributionExecutions: TestDistributionExecution[];
  distributionExecutionItems: TestDistributionExecutionItem[];
};

function createBridgeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://127.0.0.1/api/projects/1/settlement/bridge", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
  });
}

function createDistributionsRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://127.0.0.1/api/projects/1/settlement/distributions", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
  });
}

function createDistributionResultRequest(body: Record<string, unknown>): NextRequest {
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

function atomic(value: bigint | number | string): { toString(): string } {
  const asString = typeof value === "bigint" ? value.toString() : String(value);
  return {
    toString() {
      return asString;
    },
  };
}

function sumAtomic(entries: TestDistributionEntry[], statuses?: EntryStatus[]): bigint {
  return entries
    .filter((entry) => !statuses || statuses.includes(entry.status))
    .reduce((total, entry) => total + entry.amountAtomic, 0n);
}

function recomputeSettlementFromState(state: FlowState) {
  const bridgedTotalAtomic = state.bridgeStep?.bridgedAmountAtomic ?? 0n;
  const distributedTotalAtomic = sumAtomic(state.distributionEntries, ["SENT"]);
  const allSettled =
    state.distributionEntries.length > 0 &&
    state.distributionEntries.every((entry) => entry.status === "SENT");
  const status: ProjectSettlementStatus = allSettled
    ? "DISTRIBUTED"
    : "READY_FOR_DISTRIBUTION";

  return {
    id: "settlement-1",
    projectId: state.project.id,
    status,
    bridgedTotalAtomic: atomic(bridgedTotalAtomic),
    distributedTotalAtomic: atomic(distributedTotalAtomic),
    readyAt:
      status === "READY_FOR_DISTRIBUTION" ? state.now : new Date("2026-03-20T10:05:00.000Z"),
    distributedAt: status === "DISTRIBUTED" ? state.now : null,
    createdAt: new Date("2026-03-20T09:30:00.000Z"),
    updatedAt: state.now,
  };
}

function createSettlementTestState(): FlowState {
  return {
    now: new Date("2026-03-20T10:00:00.000Z"),
    project: {
      id: PROJECT_ID,
      ownerAddress: OWNER_ADDRESS,
      currency: "JPYC",
      bridgedAt: null,
      goalAchievedAt: new Date("2026-03-20T09:00:00.000Z"),
    },
    nextEntryId: 1,
    nextExecutionId: 1,
    nextExecutionItemId: 1,
    bridgeStep: null,
    distributionEntries: [],
    distributionRuns: [],
    distributionExecutions: [],
    distributionExecutionItems: [],
  };
}

function createSettlementTestDb(state: FlowState) {
  return {
    project: {
      findUnique: async () => ({
        id: state.project.id,
        ownerAddress: state.project.ownerAddress,
        currency: state.project.currency,
        bridgedAt: state.project.bridgedAt,
        goal: {
          achievedAt: state.project.goalAchievedAt,
        },
      }),
    },
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) =>
      fn({
        projectBridgeStep: {
          upsert: async (args: {
            create: {
              sourceChain: "POLYGON" | "ETHEREUM";
              destinationChain: "AVALANCHE";
              token: "JPYC" | "USDC";
              bridgedAmountAtomic: { toString(): string };
              txHash: string | null;
              completedAt: Date;
              memo: string | null;
              recordedByWallet: string;
            };
            update: {
              sourceChain?: never;
              destinationChain?: never;
              token?: never;
              bridgedAmountAtomic: { toString(): string };
              txHash: string | null;
              completedAt: Date;
              memo: string | null;
              recordedByWallet: string;
              updatedAt: Date;
            };
          }) => {
            const data = state.bridgeStep ? args.update : args.create;
            const bridgedAmountAtomic = BigInt(data.bridgedAmountAtomic.toString());
            const bridgeStep: TestBridgeStep = {
              id: state.bridgeStep?.id ?? "bridge-step-1",
              sourceChain: state.bridgeStep?.sourceChain ?? args.create.sourceChain,
              destinationChain:
                state.bridgeStep?.destinationChain ?? args.create.destinationChain,
              token: state.bridgeStep?.token ?? args.create.token,
              status: "COMPLETED",
              bridgedAmountAtomic,
              txHash: data.txHash,
              completedAt: data.completedAt,
              memo: data.memo,
              recordedByWallet: data.recordedByWallet,
              updatedAt: "updatedAt" in data ? data.updatedAt : state.now,
            };
            state.bridgeStep = bridgeStep;
            state.project.bridgedAt = bridgeStep.completedAt;
            return {
              ...bridgeStep,
              bridgedAmountAtomic: atomic(bridgeStep.bridgedAmountAtomic),
            };
          },
        },
        distributionEntry: {
          findMany: async (args?: {
            where?: { status?: { not?: EntryStatus } };
            orderBy?: Array<{ orderIndex?: "asc"; createdAt?: "asc" }> | unknown;
          }) => {
            let rows = [...state.distributionEntries];
            if (args?.where?.status?.not) {
              rows = rows.filter((entry) => entry.status !== args.where?.status?.not);
            }
            if (args?.orderBy) {
              rows.sort((left, right) => {
                if (left.orderIndex !== right.orderIndex) {
                  return left.orderIndex - right.orderIndex;
                }
                return left.createdAt.getTime() - right.createdAt.getTime();
              });
            }
            return rows.map((entry) => ({
              ...entry,
              amountAtomic: atomic(entry.amountAtomic),
            }));
          },
          findFirst: async (args: { where: { id: string; projectId: bigint } }) => {
            const match = state.distributionEntries.find(
              (entry) =>
                entry.id === args.where.id && entry.projectId === args.where.projectId
            );
            return match ? { id: match.id } : null;
          },
          updateMany: async (args: {
            where: { id: string; projectId: bigint; status: { not: "SENT" } };
            data: {
              recipientAddressChecksum: string;
              amountAtomic: { toString(): string };
              memo: string | null;
              token: "JPYC" | "USDC";
              status: EntryStatus;
              orderIndex: number;
              updatedAt: Date;
            };
          }) => {
            const target = state.distributionEntries.find(
              (entry) =>
                entry.id === args.where.id &&
                entry.projectId === args.where.projectId &&
                entry.status !== args.where.status.not
            );
            if (!target) return { count: 0 };
            target.recipientAddressChecksum = args.data.recipientAddressChecksum;
            target.amountAtomic = BigInt(args.data.amountAtomic.toString());
            target.memo = args.data.memo;
            target.token = args.data.token;
            target.status = args.data.status;
            target.orderIndex = args.data.orderIndex;
            target.updatedAt = args.data.updatedAt;
            return { count: 1 };
          },
          create: async (args: {
            data: {
              projectId: bigint;
              recipientAddressChecksum: string;
              amountAtomic: { toString(): string };
              memo: string | null;
              token: "JPYC" | "USDC";
              status: EntryStatus;
              orderIndex: number;
            };
          }) => {
            const entry: TestDistributionEntry = {
              id: `entry-${state.nextEntryId++}`,
              projectId: args.data.projectId,
              recipientAddressChecksum: args.data.recipientAddressChecksum,
              amountAtomic: BigInt(args.data.amountAtomic.toString()),
              memo: args.data.memo,
              token: args.data.token,
              status: args.data.status,
              txHash: null,
              sentAt: null,
              orderIndex: args.data.orderIndex,
              createdAt: state.now,
              updatedAt: state.now,
            };
            state.distributionEntries.push(entry);
            return { id: entry.id };
          },
          update: async (args: {
            where: { id: string };
            data: {
              recipientAddressChecksum?: string;
              amountAtomic?: { toString(): string };
              memo?: string | null;
              token?: "JPYC" | "USDC";
              status?: EntryStatus;
              orderIndex?: number;
              txHash?: string | null;
              sentAt?: Date | null;
              updatedAt?: Date;
            };
          }) => {
            const target = state.distributionEntries.find(
              (entry) => entry.id === args.where.id
            );
            if (!target) throw new Error("ENTRY_NOT_FOUND");
            if (typeof args.data.recipientAddressChecksum === "string") {
              target.recipientAddressChecksum = args.data.recipientAddressChecksum;
            }
            if (args.data.amountAtomic) {
              target.amountAtomic = BigInt(args.data.amountAtomic.toString());
            }
            if ("memo" in args.data) {
              target.memo = args.data.memo ?? null;
            }
            if (args.data.token) {
              target.token = args.data.token;
            }
            if (typeof args.data.status === "string") {
              target.status = args.data.status;
            }
            if (typeof args.data.orderIndex === "number") {
              target.orderIndex = args.data.orderIndex;
            }
            if ("txHash" in args.data) {
              target.txHash = args.data.txHash ?? null;
            }
            if ("sentAt" in args.data) {
              target.sentAt = args.data.sentAt ?? null;
            }
            if (args.data.updatedAt) {
              target.updatedAt = args.data.updatedAt;
            }
            return { id: target.id };
          },
          deleteMany: async (args: {
            where: { id: { in: string[] }; projectId: bigint; status: { not: "SENT" } };
          }) => {
            const before = state.distributionEntries.length;
            state.distributionEntries = state.distributionEntries.filter(
              (entry) =>
                !(
                  args.where.id.in.includes(entry.id) &&
                  entry.projectId === args.where.projectId &&
                  entry.status !== args.where.status.not
                )
            );
            return { count: before - state.distributionEntries.length };
          },
        },
        distributionRun: {
          create: async (args: {
            data: {
              projectId: bigint;
              mode: string;
              currency: string;
              planJson: unknown;
            };
          }) => {
            state.distributionRuns.push({
              projectId: args.data.projectId,
              mode: args.data.mode,
              currency: args.data.currency,
              planJson: args.data.planJson,
            });
            return { id: `run-${state.distributionRuns.length}` };
          },
        },
        distributionExecution: {
          findFirst: async (args: { where: { id: string; projectId: bigint } }) => {
            const execution = state.distributionExecutions.find(
              (row) =>
                row.id === args.where.id && row.projectId === args.where.projectId
            );
            return execution ? { id: execution.id } : null;
          },
          create: async (args: {
            data: {
              projectId: bigint;
              initiatedByWallet: string;
              startedAt: Date;
              result: ExecutionResult;
            };
            select: { id: true };
          }) => {
            const execution: TestDistributionExecution = {
              id: `exec-${state.nextExecutionId++}`,
              projectId: args.data.projectId,
              initiatedByWallet: args.data.initiatedByWallet,
              startedAt: args.data.startedAt,
              result: args.data.result,
              finishedAt: null,
            };
            state.distributionExecutions.push(execution);
            return { id: execution.id };
          },
          update: async (args: {
            where: { id: string };
            data: {
              result: ExecutionResult;
              finishedAt: Date | null;
            };
          }) => {
            const execution = state.distributionExecutions.find(
              (row) => row.id === args.where.id
            );
            if (!execution) throw new Error("EXECUTION_NOT_FOUND");
            execution.result = args.data.result;
            execution.finishedAt = args.data.finishedAt;
            return { id: execution.id };
          },
        },
        distributionExecutionItem: {
          findFirst: async (args: {
            where: {
              executionId?: string;
              distributionEntryId?: string;
              status?: "SENT" | "FAILED";
              txHash?: string | null;
              errorReason?: string | null;
              execution?: { projectId: bigint; initiatedByWallet: string };
            };
            orderBy?: { createdAt: "desc" };
            select?: { executionId?: true; id?: true };
          }) => {
            const match = state.distributionExecutionItems.find((item) => {
              if (
                args.where.executionId &&
                item.executionId !== args.where.executionId
              ) {
                return false;
              }
              if (
                args.where.distributionEntryId &&
                item.distributionEntryId !== args.where.distributionEntryId
              ) {
                return false;
              }
              if (args.where.status && item.status !== args.where.status) return false;
              if ("txHash" in args.where && item.txHash !== args.where.txHash) {
                return false;
              }
              if (
                "errorReason" in args.where &&
                item.errorReason !== args.where.errorReason
              ) {
                return false;
              }
              if (args.where.execution) {
                const execution = state.distributionExecutions.find(
                  (row) => row.id === item.executionId
                );
                if (!execution) return false;
                return (
                  execution.projectId === args.where.execution.projectId &&
                  execution.initiatedByWallet ===
                    args.where.execution.initiatedByWallet
                );
              }
              return true;
            });
            if (!match) return null;
            return {
              executionId: match.executionId,
              id: match.id,
            };
          },
          update: async (args: {
            where: { id: string };
            data: {
              status: "SENT" | "FAILED";
              txHash: string | null;
              errorReason: string | null;
            };
          }) => {
            const item = state.distributionExecutionItems.find(
              (row) => row.id === args.where.id
            );
            if (!item) throw new Error("EXECUTION_ITEM_NOT_FOUND");
            item.status = args.data.status;
            item.txHash = args.data.txHash;
            item.errorReason = args.data.errorReason;
            return { id: item.id };
          },
          create: async (args: {
            data: {
              executionId: string;
              distributionEntryId: string;
              status: "SENT" | "FAILED";
              txHash: string | null;
              errorReason: string | null;
            };
          }) => {
            const item: TestDistributionExecutionItem = {
              id: `exec-item-${state.nextExecutionItemId++}`,
              executionId: args.data.executionId,
              distributionEntryId: args.data.distributionEntryId,
              status: args.data.status,
              txHash: args.data.txHash,
              errorReason: args.data.errorReason,
              createdAt: state.now,
            };
            state.distributionExecutionItems.push(item);
            return { id: item.id };
          },
        },
      }),
  };
}

async function allowOwnerSession() {
  return {
    ok: true as const,
    address: OWNER_ADDRESS,
  };
}

test("settlement route helpers progress from bridge to draft save to distribution result", async () => {
  const state = createSettlementTestState();
  const db = createSettlementTestDb(state);
  const deps = {
    db: db as never,
    now: () => state.now,
    requireOwnerSession: allowOwnerSession,
    withPrismaRetry: async <T>(fn: () => Promise<T>) => fn(),
    ensureProjectSettlement: (async () => undefined) as never,
    assertDistributionWithinBridged: (async () => {
      const bridgedTotal = state.bridgeStep?.bridgedAmountAtomic ?? 0n;
      const plannedTotal = sumAtomic(
        state.distributionEntries.filter((entry) => entry.status !== "CANCELLED")
      );
      if (plannedTotal > bridgedTotal) {
        throw new Error("DISTRIBUTION_SUM_EXCEEDS_BRIDGED_AMOUNT");
      }
      return {
        bridged: atomic(bridgedTotal),
        planned: atomic(plannedTotal),
      };
    }) as never,
    recomputeProjectSettlement: (async () =>
      recomputeSettlementFromState(state)) as never,
  };

  state.now = new Date("2026-03-20T10:00:00.000Z");
  const bridgeResponse = await handleProjectSettlementBridgePost(
    createBridgeRequest({
      address: OWNER_ADDRESS,
      sourceChain: "POLYGON",
      token: "JPYC",
      bridgedAmountAtomic: "100",
      txHash: TX_HASH,
      memo: "bridge memo",
    }),
    { params: Promise.resolve({ projectId: "1" }) },
    deps
  );

  assert.equal(bridgeResponse.status, 200);
  assert.deepEqual(await bridgeResponse.json(), {
    ok: true,
    bridgeStep: {
      id: "bridge-step-1",
      sourceChain: "POLYGON",
      destinationChain: "AVALANCHE",
      token: "JPYC",
      status: "COMPLETED",
      bridgedAmountAtomic: "100",
      txHash: TX_HASH,
      completedAt: "2026-03-20T10:00:00.000Z",
      memo: "bridge memo",
    },
    settlement: {
      status: "READY_FOR_DISTRIBUTION",
      bridgedTotalAtomic: "100",
      distributedTotalAtomic: "0",
    },
  });

  state.now = new Date("2026-03-20T10:05:00.000Z");
  const distributionsResponse = await handleProjectSettlementDistributionsPut(
    createDistributionsRequest({
      address: OWNER_ADDRESS,
      entries: [
        {
          recipientAddress: OWNER_ADDRESS,
          amountAtomic: "100",
          memo: "first payout",
          token: "JPYC",
          orderIndex: 0,
        },
      ],
    }),
    { params: Promise.resolve({ projectId: "1" }) },
    deps
  );

  assert.equal(distributionsResponse.status, 200);
  const distributionsJson = (await distributionsResponse.json()) as {
    ok: true;
    distributionEntries: Array<{ id: string; status: string; amountAtomic: string }>;
    settlement: {
      status: string;
      bridgedTotalAtomic: string;
      distributedTotalAtomic: string;
    };
  };
  assert.equal(distributionsJson.ok, true);
  assert.equal(distributionsJson.distributionEntries.length, 1);
  assert.deepEqual(distributionsJson.settlement, {
    status: "READY_FOR_DISTRIBUTION",
    bridgedTotalAtomic: "100",
    distributedTotalAtomic: "0",
  });

  const [entry] = distributionsJson.distributionEntries;

  state.now = new Date("2026-03-20T10:10:00.000Z");
  const distributionResultResponse =
    await handleProjectSettlementDistributionResultPost(
      createDistributionResultRequest({
        address: OWNER_ADDRESS,
        entryId: entry.id,
        status: "SENT",
        txHash: TX_HASH,
      }),
      { params: Promise.resolve({ projectId: "1" }) },
      deps
    );

  assert.equal(distributionResultResponse.status, 200);
  assert.deepEqual(await distributionResultResponse.json(), {
    ok: true,
    executionId: "exec-1",
    entryId: entry.id,
    status: "SENT",
    txHash: TX_HASH,
    settlement: {
      status: "DISTRIBUTED",
      bridgedTotalAtomic: "100",
      distributedTotalAtomic: "100",
    },
  });

  assert.equal(state.project.bridgedAt?.toISOString(), "2026-03-20T10:00:00.000Z");
  assert.equal(state.distributionEntries.length, 1);
  assert.equal(state.distributionEntries[0]?.status, "SENT");
  assert.equal(state.distributionEntries[0]?.txHash, TX_HASH);
  assert.equal(state.distributionExecutions.length, 1);
  assert.equal(state.distributionExecutionItems.length, 1);
  assert.equal(state.distributionRuns.length, 1);
});
