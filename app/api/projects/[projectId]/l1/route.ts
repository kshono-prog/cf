// app/api/projects/[projectId]/l1/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { Project } from "@prisma/client";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

// ===== runtime guards =====
function toBigIntOrThrow(v: string): bigint {
  try {
    return BigInt(v);
  } catch {
    throw new Error("PROJECT_ID_INVALID");
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toOptionalNullOrString(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (typeof v === "string") return v;
  return undefined;
}

function toOptionalNullOrNumber(v: unknown): number | null | undefined {
  if (v === null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return undefined;
}

function normalizeAddressOrThrow(
  v: string | null,
  code: string
): string | null {
  if (v === null) return null;
  const s = v.trim();
  if (s === "") return null;
  if (!/^0x[0-9a-fA-F]{40}$/.test(s)) throw new Error(code);
  return s.toLowerCase();
}

function normalizeBytes32OrThrow(
  v: string | null,
  code: string
): string | null {
  if (v === null) return null;
  const s = v.trim();
  if (s === "") return null;
  if (!/^0x[0-9a-fA-F]{64}$/.test(s)) throw new Error(code);
  return s.toLowerCase();
}

function normalizeChainIdOrThrow(
  v: number | null,
  code: string
): number | null {
  if (v === null) return null;
  const n = Math.trunc(v);
  if (!Number.isFinite(n) || n < 0) throw new Error(code);
  return n;
}

function serializeProjectL1(project: Project) {
  return {
    id: project.id.toString(),
    title: project.title,
    status: project.status,

    // existing L1 fields
    eventFundingChainId: project.eventFundingChainId ?? null,
    eventFundingSourceAddress: project.eventFundingSourceAddress ?? null,
    eventVaultAddress: project.eventVaultAddress ?? null,
    liquidityChainId: project.liquidityChainId ?? null,
    liquidityRecipientAddress: project.liquidityRecipientAddress ?? null,

    // new fields (future Route A)
    eventBlockchainId: project.eventBlockchainId ?? null,
    liquidityBlockchainId: project.liquidityBlockchainId ?? null,
    teleporterMessenger: project.teleporterMessenger ?? null,
    icttTokenAddress: project.icttTokenAddress ?? null,
    icttTokenHome: project.icttTokenHome ?? null,
    icttTokenRemote: project.icttTokenRemote ?? null,

    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

type PatchBody = {
  // existing fields
  eventFundingChainId?: number | null;
  eventFundingSourceAddress?: string | null;
  eventVaultAddress?: string | null;
  liquidityChainId?: number | null;
  liquidityRecipientAddress?: string | null;

  // new fields
  eventBlockchainId?: string | null;
  liquidityBlockchainId?: string | null;
  teleporterMessenger?: string | null;
  icttTokenAddress?: string | null;
  icttTokenHome?: string | null;
  icttTokenRemote?: string | null;
};

type ParsePatchOk = { ok: true; body: PatchBody };
type ParsePatchNg = { ok: false; error: string };
type ParsePatch = ParsePatchOk | ParsePatchNg;

function ng(error: string): ParsePatchNg {
  return { ok: false, error };
}

function parsePatchBody(raw: unknown): ParsePatch {
  if (!isRecord(raw)) return ng("INVALID_JSON");

  const allowedKeys = new Set([
    "eventFundingChainId",
    "eventFundingSourceAddress",
    "eventVaultAddress",
    "liquidityChainId",
    "liquidityRecipientAddress",
    "eventBlockchainId",
    "liquidityBlockchainId",
    "teleporterMessenger",
    "icttTokenAddress",
    "icttTokenHome",
    "icttTokenRemote",
  ]);

  for (const k of Object.keys(raw)) {
    if (!allowedKeys.has(k)) return ng("UNKNOWN_FIELD");
  }

  const body: PatchBody = {};

  if ("eventFundingChainId" in raw) {
    const v = toOptionalNullOrNumber(raw.eventFundingChainId);
    if (typeof v === "undefined") return ng("EVENT_FUNDING_CHAIN_ID_INVALID");
    body.eventFundingChainId = v;
  }

  if ("liquidityChainId" in raw) {
    const v = toOptionalNullOrNumber(raw.liquidityChainId);
    if (typeof v === "undefined") return ng("LIQUIDITY_CHAIN_ID_INVALID");
    body.liquidityChainId = v;
  }

  if ("eventFundingSourceAddress" in raw) {
    const v = toOptionalNullOrString(raw.eventFundingSourceAddress);
    if (typeof v === "undefined")
      return ng("EVENT_FUNDING_SOURCE_ADDRESS_INVALID");
    body.eventFundingSourceAddress = v;
  }

  if ("eventVaultAddress" in raw) {
    const v = toOptionalNullOrString(raw.eventVaultAddress);
    if (typeof v === "undefined") return ng("EVENT_VAULT_ADDRESS_INVALID");
    body.eventVaultAddress = v;
  }

  if ("liquidityRecipientAddress" in raw) {
    const v = toOptionalNullOrString(raw.liquidityRecipientAddress);
    if (typeof v === "undefined")
      return ng("LIQUIDITY_RECIPIENT_ADDRESS_INVALID");
    body.liquidityRecipientAddress = v;
  }

  if ("eventBlockchainId" in raw) {
    const v = toOptionalNullOrString(raw.eventBlockchainId);
    if (typeof v === "undefined") return ng("EVENT_BLOCKCHAIN_ID_INVALID");
    body.eventBlockchainId = v;
  }

  if ("liquidityBlockchainId" in raw) {
    const v = toOptionalNullOrString(raw.liquidityBlockchainId);
    if (typeof v === "undefined") return ng("LIQUIDITY_BLOCKCHAIN_ID_INVALID");
    body.liquidityBlockchainId = v;
  }

  if ("teleporterMessenger" in raw) {
    const v = toOptionalNullOrString(raw.teleporterMessenger);
    if (typeof v === "undefined") return ng("TELEPORTER_MESSENGER_INVALID");
    body.teleporterMessenger = v;
  }

  if ("icttTokenAddress" in raw) {
    const v = toOptionalNullOrString(raw.icttTokenAddress);
    if (typeof v === "undefined") return ng("ICTT_TOKEN_ADDRESS_INVALID");
    body.icttTokenAddress = v;
  }

  if ("icttTokenHome" in raw) {
    const v = toOptionalNullOrString(raw.icttTokenHome);
    if (typeof v === "undefined") return ng("ICTT_TOKEN_HOME_INVALID");
    body.icttTokenHome = v;
  }

  if ("icttTokenRemote" in raw) {
    const v = toOptionalNullOrString(raw.icttTokenRemote);
    if (typeof v === "undefined") return ng("ICTT_TOKEN_REMOTE_INVALID");
    body.icttTokenRemote = v;
  }

  return { ok: true, body };
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { projectId: projectIdStr } = await ctx.params;
    const projectId = toBigIntOrThrow(projectIdStr);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { ok: false, error: "PROJECT_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      project: serializeProjectL1(project),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") {
      return NextResponse.json(
        { ok: false, error: "PROJECT_ID_INVALID" },
        { status: 400 }
      );
    }
    console.error("PROJECT_L1_GET_FAILED", e);
    return NextResponse.json(
      { ok: false, error: "PROJECT_L1_GET_FAILED" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { projectId: projectIdStr } = await ctx.params;
    const projectId = toBigIntOrThrow(projectIdStr);

    const raw = (await req.json().catch(() => null)) as unknown;
    const parsed = parsePatchBody(raw);

    if (!parsed.ok) {
      return NextResponse.json(
        { ok: false, error: parsed.error },
        { status: 400 }
      );
    }

    const body = parsed.body;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { ok: false, error: "PROJECT_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Prisma update input (safe)
    const data: Prisma.ProjectUpdateInput = {};
    const now = new Date();
    data.updatedAt = now;

    // ---- existing L1 fields ----
    if ("eventFundingChainId" in body) {
      const v = normalizeChainIdOrThrow(
        body.eventFundingChainId ?? null,
        "EVENT_FUNDING_CHAIN_ID_INVALID"
      );
      data.eventFundingChainId = v;
    }

    if ("liquidityChainId" in body) {
      const v = normalizeChainIdOrThrow(
        body.liquidityChainId ?? null,
        "LIQUIDITY_CHAIN_ID_INVALID"
      );
      data.liquidityChainId = v;
    }

    if ("eventFundingSourceAddress" in body) {
      data.eventFundingSourceAddress = normalizeAddressOrThrow(
        body.eventFundingSourceAddress ?? null,
        "EVENT_FUNDING_SOURCE_ADDRESS_INVALID"
      );
    }

    if ("eventVaultAddress" in body) {
      data.eventVaultAddress = normalizeAddressOrThrow(
        body.eventVaultAddress ?? null,
        "EVENT_VAULT_ADDRESS_INVALID"
      );
    }

    if ("liquidityRecipientAddress" in body) {
      data.liquidityRecipientAddress = normalizeAddressOrThrow(
        body.liquidityRecipientAddress ?? null,
        "LIQUIDITY_RECIPIENT_ADDRESS_INVALID"
      );
    }

    // ---- new fields ----
    if ("eventBlockchainId" in body) {
      data.eventBlockchainId = normalizeBytes32OrThrow(
        body.eventBlockchainId ?? null,
        "EVENT_BLOCKCHAIN_ID_INVALID"
      );
    }

    if ("liquidityBlockchainId" in body) {
      data.liquidityBlockchainId = normalizeBytes32OrThrow(
        body.liquidityBlockchainId ?? null,
        "LIQUIDITY_BLOCKCHAIN_ID_INVALID"
      );
    }

    if ("teleporterMessenger" in body) {
      data.teleporterMessenger = normalizeAddressOrThrow(
        body.teleporterMessenger ?? null,
        "TELEPORTER_MESSENGER_INVALID"
      );
    }

    if ("icttTokenAddress" in body) {
      data.icttTokenAddress = normalizeAddressOrThrow(
        body.icttTokenAddress ?? null,
        "ICTT_TOKEN_ADDRESS_INVALID"
      );
    }

    if ("icttTokenHome" in body) {
      data.icttTokenHome = normalizeAddressOrThrow(
        body.icttTokenHome ?? null,
        "ICTT_TOKEN_HOME_INVALID"
      );
    }

    if ("icttTokenRemote" in body) {
      data.icttTokenRemote = normalizeAddressOrThrow(
        body.icttTokenRemote ?? null,
        "ICTT_TOKEN_REMOTE_INVALID"
      );
    }

    // ---- cross-field sanity check (soft) ----
    const nextSource =
      typeof data.eventFundingSourceAddress === "string"
        ? data.eventFundingSourceAddress
        : project.eventFundingSourceAddress;

    const nextVault =
      typeof data.eventVaultAddress === "string"
        ? data.eventVaultAddress
        : project.eventVaultAddress;

    if (typeof nextVault === "string" && nextSource == null) {
      return NextResponse.json(
        { ok: false, error: "VAULT_REQUIRES_SOURCE" },
        { status: 400 }
      );
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data,
    });

    return NextResponse.json({
      ok: true,
      project: serializeProjectL1(updated),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);

    if (msg === "PROJECT_ID_INVALID") {
      return NextResponse.json(
        { ok: false, error: "PROJECT_ID_INVALID" },
        { status: 400 }
      );
    }

    const badReqErrors = new Set([
      "EVENT_FUNDING_CHAIN_ID_INVALID",
      "LIQUIDITY_CHAIN_ID_INVALID",
      "EVENT_FUNDING_SOURCE_ADDRESS_INVALID",
      "EVENT_VAULT_ADDRESS_INVALID",
      "LIQUIDITY_RECIPIENT_ADDRESS_INVALID",
      "EVENT_BLOCKCHAIN_ID_INVALID",
      "LIQUIDITY_BLOCKCHAIN_ID_INVALID",
      "TELEPORTER_MESSENGER_INVALID",
      "ICTT_TOKEN_ADDRESS_INVALID",
      "ICTT_TOKEN_HOME_INVALID",
      "ICTT_TOKEN_REMOTE_INVALID",
    ]);

    if (badReqErrors.has(msg)) {
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }

    console.error("PROJECT_L1_PATCH_FAILED", e);
    return NextResponse.json(
      { ok: false, error: "PROJECT_L1_PATCH_FAILED" },
      { status: 500 }
    );
  }
}
