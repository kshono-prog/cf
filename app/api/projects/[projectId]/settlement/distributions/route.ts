import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  lowerOrNull,
  toAddressOrNull,
  toBigIntOrThrow,
  toNonEmptyString,
} from "@/lib/api/guards";
import {
  assertDistributionWithinBridged,
  ensureProjectSettlement,
  recomputeProjectSettlement,
  toAtomicDecimalOrNull,
} from "@/lib/projectSettlement";
import { requireOwnerSession } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

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

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { projectId: projectIdStr } = await ctx.params;
    const projectId = toBigIntOrThrow(projectIdStr, "PROJECT_ID_INVALID");

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        ownerAddress: true,
        distributionEntries: {
          orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!project) return errJson("PROJECT_NOT_FOUND", 404);

    if (!project.ownerAddress) return errJson("FORBIDDEN_NOT_OWNER", 403);

    const ownerSession = await requireOwnerSession(req, project.ownerAddress);
    if (!ownerSession.ok) return ownerSession.response;

    return okJson({
      projectId: project.id.toString(),
      distributionEntries: project.distributionEntries.map((e) => ({
        id: e.id,
        recipientAddressChecksum: e.recipientAddressChecksum,
        amountAtomic: e.amountAtomic.toString(),
        memo: e.memo,
        token: e.token,
        status: e.status,
        txHash: e.txHash,
        sentAt: e.sentAt?.toISOString() ?? null,
        orderIndex: e.orderIndex,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    console.error("PROJECT_SETTLEMENT_DISTRIBUTIONS_GET_FAILED", e);
    return errJson("PROJECT_SETTLEMENT_DISTRIBUTIONS_GET_FAILED", 500);
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { projectId: projectIdStr } = await ctx.params;
    const projectId = toBigIntOrThrow(projectIdStr, "PROJECT_ID_INVALID");

    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const wallet = toAddressOrNull((raw as Body).address);
    if (!wallet) return errJson("ADDRESS_REQUIRED", 400);
    const ownerSession = await requireOwnerSession(req, wallet);
    if (!ownerSession.ok) return ownerSession.response;

    const entriesRaw = (raw as Body).entries;
    if (!Array.isArray(entriesRaw)) return errJson("ENTRIES_REQUIRED", 400);

    const parsedEntries = entriesRaw.map(parseEntry);
    if (parsedEntries.some((e) => !e)) return errJson("ENTRIES_INVALID", 400);

    const entries = parsedEntries.filter((e): e is NonNullable<typeof e> => !!e);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerAddress: true },
    });

    if (!project) return errJson("PROJECT_NOT_FOUND", 404);

    const owner = lowerOrNull(project.ownerAddress);
    if (!owner || owner !== wallet.toLowerCase()) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.distributionEntry.findMany({
        where: { projectId },
        select: { id: true, status: true },
      });

      const immutableSentIds = new Set(
        existing.filter((e) => e.status === "SENT").map((e) => e.id)
      );

      for (const row of entries) {
        if (row.id && immutableSentIds.has(row.id)) {
          throw new Error("SENT_ENTRY_IMMUTABLE");
        }
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
          }
        } else {
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
      }

      const deletable = existing
        .filter((e) => e.status !== "SENT")
        .filter((e) => !keepIds.has(e.id))
        .map((e) => e.id);

      if (deletable.length > 0) {
        await tx.distributionEntry.deleteMany({
          where: { id: { in: deletable }, projectId, status: { not: "SENT" } },
        });
      }

      await ensureProjectSettlement(tx, projectId);
      await assertDistributionWithinBridged(tx, projectId);
      const settlement = await recomputeProjectSettlement(tx, projectId);

      const rows = await tx.distributionEntry.findMany({
        where: { projectId },
        orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      });

      return { settlement, rows };
    });

    return okJson({
      distributionEntries: result.rows.map((e) => ({
        id: e.id,
        recipientAddressChecksum: e.recipientAddressChecksum,
        amountAtomic: e.amountAtomic.toString(),
        memo: e.memo,
        token: e.token,
        status: e.status,
        txHash: e.txHash,
        sentAt: e.sentAt?.toISOString() ?? null,
        orderIndex: e.orderIndex,
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
    if (msg === "SENT_ENTRY_IMMUTABLE") return errJson("SENT_ENTRY_IMMUTABLE", 409);
    if (msg === "DISTRIBUTION_SUM_EXCEEDS_BRIDGED_AMOUNT") {
      return errJson("DISTRIBUTION_SUM_EXCEEDS_BRIDGED_AMOUNT", 409);
    }
    console.error("PROJECT_SETTLEMENT_DISTRIBUTIONS_PUT_FAILED", e);
    return errJson("PROJECT_SETTLEMENT_DISTRIBUTIONS_PUT_FAILED", 500);
  }
}
