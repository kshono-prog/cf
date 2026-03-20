// app/api/projects/route.ts
import { NextRequest } from "next/server";
import {
  isRecord,
  toNonEmptyString,
} from "@/lib/api/guards";
import { errJson, okJson } from "@/lib/api/responses";
import { parseOwnerAddressFromBody } from "@/lib/ownerAuthAddress";
import { prisma } from "@/lib/prisma";
import { buildCreatorProjectActivationFields } from "@/lib/creatorProjectActivation";
import { requireOwnerSession } from "@/lib/ownerAuthSession";

export const runtime = "nodejs";

type PurposeMode = "OPTIONAL" | "REQUIRED" | "NONE";
type Currency = "JPYC" | "USDC";

function asNullableString(v: unknown): string | null {
  if (v === null) return null;
  return toNonEmptyString(v) ?? null;
}

function asPurposeMode(v: unknown): PurposeMode | null {
  if (v === "OPTIONAL" || v === "REQUIRED" || v === "NONE") return v;
  return null;
}

function asCurrency(v: unknown): Currency | null {
  if (v === "JPYC" || v === "USDC") return v;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const bodyUnknown: unknown = await req.json().catch(() => null);
    if (!isRecord(bodyUnknown)) {
      return errJson("INVALID_JSON", 400);
    }

    const title = toNonEmptyString(bodyUnknown.title);
    const description = asNullableString(bodyUnknown.description);
    const purposeMode: PurposeMode =
      asPurposeMode(bodyUnknown.purposeMode) ?? "OPTIONAL";
    const currency: Currency = asCurrency(bodyUnknown.currency) ?? "JPYC";

    if (!title) {
      return errJson("TITLE_REQUIRED", 400);
    }

    const ownerAddress = parseOwnerAddressFromBody(bodyUnknown, [
      "ownerAddress",
      "address",
    ]);
    if (!ownerAddress) {
      return errJson("OWNER_ADDRESS_REQUIRED_OR_INVALID", 400);
    }
    const ownerSession = await requireOwnerSession(req, ownerAddress);
    if (!ownerSession.ok) return ownerSession.response;

    const creator = await prisma.creatorProfile.findUnique({
      where: { walletAddress: ownerAddress },
      select: { id: true },
    });

    if (!creator) {
      return errJson("CREATOR_NOT_FOUND", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          title,
          description,
          purposeMode, // string運用でもOK
          currency,
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
          currency: true,
          ownerAddress: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await tx.creatorProfile.update({
        where: { id: creator.id },
        data: buildCreatorProjectActivationFields({
          projectId: project.id,
          currency,
        }),
        select: { id: true },
      });

      return project;
    });

    return okJson({
      projectId: result.id.toString(),
      project: {
        id: result.id.toString(),
        title: result.title,
        description: result.description ?? null,
        purposeMode: result.purposeMode,
        status: result.status,
        currency: result.currency,
        ownerAddress: result.ownerAddress ?? null,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      },
    });
  } catch (e: unknown) {
    console.error("PROJECTS_POST_ERROR", e);
    const detail = e instanceof Error ? e.message : String(e);
    return errJson("PROJECTS_POST_ERROR", 500, detail);
  }
}
