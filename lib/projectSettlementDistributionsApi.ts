import type { DistributionEntryStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  lowerOrNull,
  toAddressOrNull,
  toBigIntOrThrow,
  toNonEmptyString,
} from "@/lib/api/guards";
import { requireOwnerSession } from "@/lib/ownerAuthSession";
import { prisma } from "@/lib/prisma";
import {
  assertDistributionWithinBridged,
  ensureProjectSettlement,
  recomputeProjectSettlement,
  toAtomicDecimalOrNull,
} from "@/lib/projectSettlement";
import { isPrismaUnavailableError, withPrismaRetry } from "@/lib/prismaRetry";

type Params = { projectId: string };
type SettlementDistributionsDb = Pick<typeof prisma, "project" | "projectSettlement" | "$transaction">;

type DistributionInput = {
  id?: unknown;
  recipientAddress?: unknown;
  amountAtomic?: unknown;
  memo?: unknown;
  token?: unknown;
  orderIndex?: unknown;
};

type Body = {
  address?: unknown;
  entries?: unknown;
};

type EditableDistributionEntry = {
  id: string;
  status: DistributionEntryStatus;
  recipientAddressChecksum: string;
  amountAtomic: { toString(): string };
  memo: string | null;
  token: "JPYC" | "USDC";
  orderIndex: number;
};

function toToken(v: unknown): "JPYC" | "USDC" | null {
  return v === "JPYC" || v === "USDC" ? v : null;
}

function toOrderIndex(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  const n = Math.trunc(v);
  return n >= 0 ? n : 0;
}

function toId(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

function parseEntry(v: unknown): {
  id: string | null;
  recipientAddressChecksum: string;
  amountAtomic: NonNullable<ReturnType<typeof toAtomicDecimalOrNull>>;
  memo: string | null;
  token: "JPYC" | "USDC";
  orderIndex: number;
} | null {
  if (!isRecord(v)) return null;

  const recipient = toAddressOrNull((v as DistributionInput).recipientAddress);
  if (!recipient) return null;

  const amountAtomic = toAtomicDecimalOrNull((v as DistributionInput).amountAtomic);
  if (!amountAtomic) return null;

  const token = toToken((v as DistributionInput).token);
  if (!token) return null;

  return {
    id: toId((v as DistributionInput).id),
    recipientAddressChecksum: recipient,
    amountAtomic,
    memo: toNonEmptyString((v as DistributionInput).memo),
    token,
    orderIndex: toOrderIndex((v as DistributionInput).orderIndex),
  };
}

function buildDraftEntrySignature(entry: {
  recipientAddressChecksum: string;
  amountAtomic: { toString(): string };
  memo: string | null;
  token: "JPYC" | "USDC";
  orderIndex: number;
}): string {
  return [
    entry.recipientAddressChecksum,
    entry.amountAtomic.toString(),
    entry.memo ?? "",
    entry.token,
    String(entry.orderIndex),
  ].join("|");
}

function removeReusableEntryId(
  signatureMap: Map<string, string[]>,
  entryById: Map<string, EditableDistributionEntry>,
  entryId: string
) {
  const entry = entryById.get(entryId);
  if (!entry) return;
  const signature = buildDraftEntrySignature(entry);
  const ids = signatureMap.get(signature);
  if (!ids) return;
  const nextIds = ids.filter((id) => id !== entryId);
  if (nextIds.length === 0) {
    signatureMap.delete(signature);
    return;
  }
  signatureMap.set(signature, nextIds);
}

export type SettlementDistributionsRouteDeps = {
  db?: SettlementDistributionsDb;
  requireOwnerSession?: typeof requireOwnerSession;
  withPrismaRetry?: typeof withPrismaRetry;
  isPrismaUnavailableError?: typeof isPrismaUnavailableError;
  ensureProjectSettlement?: (
    tx: Parameters<typeof ensureProjectSettlement>[0],
    projectId: bigint
  ) => Promise<unknown>;
  assertDistributionWithinBridged?: (
    tx: Parameters<typeof assertDistributionWithinBridged>[0],
    projectId: bigint
  ) => Promise<unknown>;
  recomputeProjectSettlement?: typeof recomputeProjectSettlement;
  now?: () => Date;
};

export async function handleProjectSettlementDistributionsPut(
  req: NextRequest,
  ctx: { params: Promise<Params> },
  deps: SettlementDistributionsRouteDeps = {}
): Promise<NextResponse> {
  try {
    const db = deps.db ?? prisma;
    const runWithRetry = deps.withPrismaRetry ?? withPrismaRetry;
    const requireOwnerSessionFn =
      deps.requireOwnerSession ?? requireOwnerSession;
    const ensureProjectSettlementFn =
      deps.ensureProjectSettlement ?? ensureProjectSettlement;
    const assertDistributionWithinBridgedFn =
      deps.assertDistributionWithinBridged ?? assertDistributionWithinBridged;
    const recomputeProjectSettlementFn =
      deps.recomputeProjectSettlement ?? recomputeProjectSettlement;

    const { projectId: projectIdStr } = await ctx.params;
    const projectId = toBigIntOrThrow(projectIdStr, "PROJECT_ID_INVALID");

    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const wallet = toAddressOrNull((raw as Body).address);
    if (!wallet) return errJson("ADDRESS_REQUIRED", 400);
    const ownerSession = await requireOwnerSessionFn(req, wallet);
    if (!ownerSession.ok) return ownerSession.response;

    const entriesRaw = (raw as Body).entries;
    if (!Array.isArray(entriesRaw)) return errJson("ENTRIES_REQUIRED", 400);

    const parsedEntries = entriesRaw.map(parseEntry);
    if (parsedEntries.some((entry) => !entry)) return errJson("ENTRIES_INVALID", 400);
    const entries = parsedEntries.filter(
      (entry): entry is NonNullable<typeof entry> => !!entry
    );

    const project = await runWithRetry(() =>
      db.project.findUnique({
        where: { id: projectId },
        select: { id: true, ownerAddress: true, currency: true },
      })
    );

    if (!project) return errJson("PROJECT_NOT_FOUND", 404);

    const owner = lowerOrNull(project.ownerAddress);
    if (!owner || owner !== wallet.toLowerCase()) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
    }

    const existingSettlement = await runWithRetry(() =>
      db.projectSettlement.findUnique({
        where: { projectId },
        select: { status: true },
      })
    );

    if (existingSettlement?.status === "DISTRIBUTED") {
      return errJson("SETTLEMENT_ALREADY_DISTRIBUTED", 409);
    }

    const projectToken = toToken(project.currency);
    if (!projectToken) return errJson("PROJECT_CURRENCY_INVALID", 400);

    const now = deps.now?.() ?? new Date();

    const result = await runWithRetry(() =>
      db.$transaction(async (tx) => {
        const existing = await tx.distributionEntry.findMany({
          where: { projectId },
          select: {
            id: true,
            status: true,
            recipientAddressChecksum: true,
            amountAtomic: true,
            memo: true,
            token: true,
            orderIndex: true,
          },
        });

        const immutableSentIds = new Set(
          existing.filter((entry) => entry.status === "SENT").map((entry) => entry.id)
        );

        for (const row of entries) {
          if (row.id && immutableSentIds.has(row.id)) {
            throw new Error("SENT_ENTRY_IMMUTABLE");
          }
        }

        const editableEntries = existing.filter((entry) => entry.status !== "SENT");
        const editableEntryById = new Map<string, EditableDistributionEntry>(
          editableEntries.map((entry) => [entry.id, entry as EditableDistributionEntry])
        );
        const reusableIdsBySignature = new Map<string, string[]>();

        for (const entry of editableEntries) {
          const signature = buildDraftEntrySignature(entry);
          const ids = reusableIdsBySignature.get(signature) ?? [];
          ids.push(entry.id);
          reusableIdsBySignature.set(signature, ids);
        }

        const keepIds = new Set<string>();

        for (const row of entries) {
          if (row.id) {
            const updated = await tx.distributionEntry.updateMany({
              where: { id: row.id, projectId, status: { not: "SENT" } },
              data: {
                recipientAddressChecksum: row.recipientAddressChecksum,
                amountAtomic: row.amountAtomic,
                memo: row.memo,
                token: row.token,
                status: "DRAFT",
                orderIndex: row.orderIndex,
                updatedAt: now,
              },
            });

            if (updated.count === 0) {
              const created = await tx.distributionEntry.create({
                data: {
                  projectId,
                  recipientAddressChecksum: row.recipientAddressChecksum,
                  amountAtomic: row.amountAtomic,
                  memo: row.memo,
                  token: row.token,
                  status: "DRAFT",
                  orderIndex: row.orderIndex,
                },
                select: { id: true },
              });
              keepIds.add(created.id);
            } else {
              keepIds.add(row.id);
              removeReusableEntryId(reusableIdsBySignature, editableEntryById, row.id);
            }
            continue;
          }

          const signature = buildDraftEntrySignature(row);
          const reusableIds = reusableIdsBySignature.get(signature) ?? [];
          const reusableId = reusableIds.shift() ?? null;

          if (reusableIds.length === 0) {
            reusableIdsBySignature.delete(signature);
          } else {
            reusableIdsBySignature.set(signature, reusableIds);
          }

          if (reusableId) {
            await tx.distributionEntry.update({
              where: { id: reusableId },
              data: {
                recipientAddressChecksum: row.recipientAddressChecksum,
                amountAtomic: row.amountAtomic,
                memo: row.memo,
                token: row.token,
                status: "DRAFT",
                orderIndex: row.orderIndex,
                updatedAt: now,
              },
            });
            keepIds.add(reusableId);
            continue;
          }

          const created = await tx.distributionEntry.create({
            data: {
              projectId,
              recipientAddressChecksum: row.recipientAddressChecksum,
              amountAtomic: row.amountAtomic,
              memo: row.memo,
              token: row.token,
              status: "DRAFT",
              orderIndex: row.orderIndex,
            },
            select: { id: true },
          });
          keepIds.add(created.id);
        }

        const deletable = existing
          .filter((entry) => entry.status !== "SENT")
          .filter((entry) => !keepIds.has(entry.id))
          .map((entry) => entry.id);

        if (deletable.length > 0) {
          await tx.distributionEntry.deleteMany({
            where: { id: { in: deletable }, projectId, status: { not: "SENT" } },
          });
        }

        await ensureProjectSettlementFn(tx, projectId);
        await assertDistributionWithinBridgedFn(tx, projectId);
        const settlement = await recomputeProjectSettlementFn(tx, projectId);

        const rows = await tx.distributionEntry.findMany({
          where: { projectId },
          orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
        });

        await tx.distributionRun.create({
          data: {
            projectId,
            mode: "PLAN_ONLY",
            chainId: 0,
            currency: projectToken,
            planJson: {
              version: 1,
              source: "settlement_distribution_entries",
              updatedAt: now.toISOString(),
              rows: rows.map((entry) => ({
                id: entry.id,
                recipientAddress: entry.recipientAddressChecksum,
                amountAtomic: entry.amountAtomic.toString(),
                memo: entry.memo,
                token: entry.token,
                status: entry.status,
                orderIndex: entry.orderIndex,
              })),
            } as never,
            txHashes: [] as never,
            dryRun: true,
            note: "settlement draft saved",
          },
        });

        return { settlement, rows };
      })
    );

    return okJson({
      distributionEntries: result.rows.map((entry) => ({
        id: entry.id,
        recipientAddressChecksum: entry.recipientAddressChecksum,
        amountAtomic: entry.amountAtomic.toString(),
        memo: entry.memo,
        token: entry.token,
        status: entry.status,
        txHash: entry.txHash,
        sentAt: entry.sentAt?.toISOString() ?? null,
        orderIndex: entry.orderIndex,
      })),
      settlement: {
        status: result.settlement.status,
        bridgedTotalAtomic: result.settlement.bridgedTotalAtomic.toString(),
        distributedTotalAtomic: result.settlement.distributedTotalAtomic.toString(),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    if (msg === "PROJECT_CURRENCY_INVALID") {
      return errJson("PROJECT_CURRENCY_INVALID", 400);
    }
    if (msg === "SENT_ENTRY_IMMUTABLE") return errJson("SENT_ENTRY_IMMUTABLE", 409);
    if (msg === "DISTRIBUTION_SUM_EXCEEDS_BRIDGED_AMOUNT") {
      return errJson("DISTRIBUTION_SUM_EXCEEDS_BRIDGED_AMOUNT", 409);
    }
    if ((deps.isPrismaUnavailableError ?? isPrismaUnavailableError)(e)) {
      return errJson("DB_UNAVAILABLE", 503);
    }
    console.error("PROJECT_SETTLEMENT_DISTRIBUTIONS_PUT_FAILED", e);
    return errJson("PROJECT_SETTLEMENT_DISTRIBUTIONS_PUT_FAILED", 500);
  }
}
