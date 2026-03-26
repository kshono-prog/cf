import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import { toBigIntOrThrow, toNonEmptyString } from "@/lib/api/guards";
import {
  toManagerNoteType,
  toNoteVisibility,
} from "@/lib/managerDesk/contracts";
import { getManagerDeskNotesSurface } from "@/lib/managerDesk/readModel";
import { requireOwnerSessionFromSearchParams } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toLimit(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const truncated = Math.trunc(numeric);
  if (truncated < 1) return 1;
  if (truncated > 200) return 200;
  return truncated;
}

function toFlag(value: string | null): boolean {
  return value === "1" || value === "true";
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const ownerSession = await requireOwnerSessionFromSearchParams(
      req,
      searchParams
    );
    if (!ownerSession.ok) return ownerSession.response;

    const creatorProfileIdRaw = searchParams.get("creatorProfileId");
    const creatorProfileId =
      creatorProfileIdRaw == null
        ? null
        : toBigIntOrThrow(creatorProfileIdRaw, "CREATOR_PROFILE_ID_INVALID");

    const noteTypeRaw = searchParams.get("noteType");
    const noteType = noteTypeRaw == null ? null : toManagerNoteType(noteTypeRaw);
    if (noteTypeRaw !== null && noteType === null) {
      return errJson("NOTE_TYPE_INVALID", 400);
    }

    const visibilityRaw = searchParams.get("visibility");
    const visibility =
      visibilityRaw == null ? null : toNoteVisibility(visibilityRaw);
    if (visibilityRaw !== null && visibility === null) {
      return errJson("VISIBILITY_INVALID", 400);
    }

    const notes = await getManagerDeskNotesSurface({
      managerWalletAddress: ownerSession.address,
      creatorProfileId,
      noteType,
      visibility,
      followUpOnly: toFlag(searchParams.get("followUpOnly")),
      q: toNonEmptyString(searchParams.get("q")),
      limit: toLimit(searchParams.get("limit"), 100),
    });

    return okJson(notes);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "CREATOR_PROFILE_ID_INVALID") {
      return errJson("CREATOR_PROFILE_ID_INVALID", 400);
    }
    console.error("MANAGER_DESK_NOTES_GET_FAILED", error);
    return errJson("MANAGER_DESK_NOTES_GET_FAILED", 500);
  }
}
