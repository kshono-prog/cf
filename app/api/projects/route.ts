// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type PurposeMode = "OPTIONAL" | "REQUIRED" | "NONE";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asNonEmptyString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

function asNullableString(v: unknown): string | null {
  if (v === null) return null;
  return asNonEmptyString(v) ?? null;
}

function normalizeAddress(input: string): string {
  return input.trim().toLowerCase();
}

function isHexAddressLower(addr: string): boolean {
  return /^0x[a-f0-9]{40}$/.test(addr);
}

function parseOwnerAddressOrNull(body: Record<string, unknown>): string | null {
  const raw =
    asNonEmptyString(body.ownerAddress) ?? asNonEmptyString(body.address);
  if (!raw) return null;

  const normalized = normalizeAddress(raw);
  if (!isHexAddressLower(normalized)) return null;

  return normalized;
}

function asPurposeMode(v: unknown): PurposeMode | null {
  if (v === "OPTIONAL" || v === "REQUIRED" || v === "NONE") return v;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const bodyUnknown: unknown = await req.json().catch(() => null);
    if (!isRecord(bodyUnknown)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const title = asNonEmptyString(bodyUnknown.title);
    const description = asNullableString(bodyUnknown.description);
    const purposeMode: PurposeMode =
      asPurposeMode(bodyUnknown.purposeMode) ?? "OPTIONAL";

    if (!title) {
      return NextResponse.json(
        { ok: false, error: "TITLE_REQUIRED" },
        { status: 400 }
      );
    }

    const ownerAddress = parseOwnerAddressOrNull(bodyUnknown);
    if (!ownerAddress) {
      return NextResponse.json(
        { ok: false, error: "OWNER_ADDRESS_REQUIRED_OR_INVALID" },
        { status: 400 }
      );
    }

    const creator = await prisma.creatorProfile.findUnique({
      where: { walletAddress: ownerAddress },
      select: { id: true, activeProjectId: true },
    });

    if (!creator) {
      return NextResponse.json(
        { ok: false, error: "CREATOR_NOT_FOUND" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          title,
          description,
          purposeMode, // string運用でもOK
          ownerAddress,
          status: "DRAFT",
          creatorProfileId: creator.id,
        },
        select: {
          id: true,
          title: true,
          description: true,
          purposeMode: true,
          status: true,
          ownerAddress: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await tx.creatorProfile.update({
        where: { id: creator.id },
        data: { activeProjectId: project.id },
        select: { id: true },
      });

      return project;
    });

    return NextResponse.json(
      {
        ok: true,
        activeProjectId: result.id.toString(),
        project: {
          id: result.id.toString(),
          title: result.title,
          description: result.description ?? null,
          purposeMode: result.purposeMode,
          status: result.status,
          ownerAddress: result.ownerAddress ?? null,
          createdAt: result.createdAt.toISOString(),
          updatedAt: result.updatedAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (e: unknown) {
    console.error("PROJECTS_POST_ERROR", e);
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "PROJECTS_POST_ERROR", detail },
      { status: 500 }
    );
  }
}
