// app/api/public/creator/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCreatorProfileByUsername } from "@/lib/creatorProfile";
import { resolvePublicCreatorProjectData } from "@/lib/publicCreatorProjects";
import {
  serializeCreatorPublicDto,
  type CreatorLatestProjectSummary,
  type CreatorProjectIdsByCurrency,
  type CreatorPublicDto,
} from "@/lib/serializers/creator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

type PublicOk = {
  ok: true;
  creator: CreatorPublicDto;
  projectId: string | null;
  projectIdsByCurrency: CreatorProjectIdsByCurrency;
  latestProjectSummary: CreatorLatestProjectSummary | null;
  summary: unknown | null; // /api/projects/[id]/summary の応答をそのまま返す
  summariesByCurrency: {
    JPYC: unknown | null;
    USDC: unknown | null;
  };
};

type PublicErr = { ok: false; error: string; detail?: string };

export async function GET(
  req: NextRequest
): Promise<NextResponse<PublicOk | PublicErr>> {
  const { searchParams } = new URL(req.url);
  const usernameRaw = searchParams.get("username");

  if (!isNonEmptyString(usernameRaw)) {
    return NextResponse.json(
      { ok: false, error: "USERNAME_REQUIRED" },
      { status: 400 }
    );
  }

  const username = usernameRaw.trim();

  try {
    const creatorResult = await getCreatorProfileByUsername(username);
    if (!creatorResult) {
      return NextResponse.json(
        { ok: false, error: "CREATOR_NOT_FOUND" },
        { status: 404 }
      );
    }

    const { creator, profile } = creatorResult;

    const projectData = await resolvePublicCreatorProjectData({
      creatorProfileId: BigInt(profile.id),
      activeProjectIdJpyc: profile.activeProjectIdJpyc ?? null,
      activeProjectIdUsdc: profile.activeProjectIdUsdc ?? null,
    });
    const creatorDto = serializeCreatorPublicDto({
      creator,
      projectId: projectData.projectId,
      projectIdsByCurrency: projectData.projectIdsByCurrency,
      latestProjectSummary: projectData.latestProjectSummary,
    });

    return NextResponse.json({
      ok: true,
      creator: creatorDto,
      projectId: creatorDto.projectId,
      projectIdsByCurrency: creatorDto.projectIdsByCurrency,
      latestProjectSummary: creatorDto.latestProjectSummary,
      summary: projectData.activeSummary,
      summariesByCurrency: projectData.summariesByCurrency,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: "PUBLIC_CREATOR_FETCH_FAILED",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
